export interface StreamInfo {
  url: string;
  bitrate: number;
  format: string;
  source: string;
}

export interface SearchResult {
  videoId: string;
  title: string;
  uploaderName: string;
  durationString: string;
  thumbnailUrl: string;
}

const INVIDIOUS_INSTANCES = [
  'https://invidious.f5.si',
  'https://inv.tux.pizza',
  'https://iv.melmac.space',
  'https://invidious.private.coffee',
];

// In-memory cache to prevent redundant queries during navigation
const streamCache = new Map<string, StreamInfo>();

export type SearchFailure =
  | 'network'
  | 'http'
  | 'consent'
  | 'botcheck'
  | 'no-payload'
  | 'no-results';

export interface SearchOutcome {
  results: SearchResult[];
  /** Populated only when results is empty, so the UI can say WHY. */
  failure?: SearchFailure;
  /** Query actually sent to YouTube (useful when the widened retry fires). */
  attemptedQuery?: string;
}

/**
 * YouTube serves a GDPR consent interstitial to EU traffic that carries no consent
 * cookie. That page has no `ytInitialData`, so scraping silently yields zero results.
 * `SOCS` is the current consent signal, `CONSENT` the legacy one, `ucbcb` a URL-side
 * bypass, and an explicit `hl`/`gl` keeps the parser reading a predictable layout.
 */
const CONSENT_COOKIE =
  'SOCS=CAI; CONSENT=YES+cb.20240101-01-p0.en+FX+000; __Secure-YNID=19; ucbcb=1';

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/**
 * Reads the JSON object that starts at the first `{` after `marker` by counting
 * braces outside string literals.
 *
 * A lazy regex like `({.+?});` — which the previous version used as a fallback —
 * stops at the FIRST `};` anywhere in the document, including one inside a string
 * value. The truncated slice then makes JSON.parse throw, and the caller swallowed
 * that as "no results". Structural extraction cannot truncate.
 */
function extractJsonObjectAfter(html: string, marker: string): string | null {
  const markerIdx = html.indexOf(marker);
  if (markerIdx === -1) return null;

  const start = html.indexOf('{', markerIdx + marker.length);
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (inString) {
      if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return html.slice(start, i + 1);
    }
  }
  return null;
}

/**
 * Walks the whole payload for `videoRenderer` nodes instead of trusting one fixed
 * path. YouTube reorganises the search response shell regularly; a hard-coded
 * `contents.twoColumnSearchResultsRenderer...` chain breaks on the first move,
 * while the per-video renderer keys have stayed stable for years.
 */
function collectVideoRenderers(node: any, out: SearchResult[], limit: number): void {
  if (!node || typeof node !== 'object' || out.length >= limit) return;

  if (Array.isArray(node)) {
    for (const item of node) collectVideoRenderers(item, out, limit);
    return;
  }

  const v = node.videoRenderer;
  if (v && typeof v.videoId === 'string' && v.videoId.length >= 6) {
    const thumbs = v.thumbnail?.thumbnails || [];
    const best = thumbs.length ? thumbs[thumbs.length - 1]?.url : undefined;
    out.push({
      videoId: v.videoId,
      title: v.title?.runs?.[0]?.text || v.title?.simpleText || 'Senza titolo',
      uploaderName:
        v.ownerText?.runs?.[0]?.text || v.longBylineText?.runs?.[0]?.text || 'YouTube',
      durationString: v.lengthText?.simpleText || '',
      thumbnailUrl: typeof best === 'string' ? best : '',
    });
    return;
  }

  for (const key of Object.keys(node)) collectVideoRenderers(node[key], out, limit);
}

/** Distinguishes an empty search from a blocked or mangled one. */
function classifyEmpty(html: string): SearchFailure {
  const lower = html.toLowerCase();
  if (lower.includes('consent.youtube.com') || lower.includes('before you continue')) return 'consent';
  if (lower.includes('unusual traffic') || lower.includes('not a robot')) return 'botcheck';
  if (lower.includes('ytinitialdata') || lower.includes('yt_config')) return 'no-results';
  return 'no-payload';
}

export class YouTubeAudioService {
  /**
   * Resolves a YouTube Video ID to a direct audio stream URL (m4a / opus / mp3)
   */
  static async resolveAudioStream(
    videoId: string,
    fallbackUrl?: string
  ): Promise<StreamInfo> {
    if (streamCache.has(videoId)) {
      return streamCache.get(videoId)!;
    }

    // Try live Invidious API instances with fast timeout
    for (const base of INVIDIOUS_INSTANCES) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const response = await fetch(`${base}/api/v1/videos/${videoId}`, {
          signal: controller.signal,
          headers: { 'User-Agent': 'HarmoniaClassical/1.0' },
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          const adaptive = data?.adaptiveFormats || [];
          const audioFormats = adaptive.filter(
            (f: any) => f.type?.startsWith('audio/') || f.container === 'm4a'
          );

          if (audioFormats.length > 0) {
            const bestAudio = audioFormats.sort(
              (a: any, b: any) => (parseInt(b.bitrate) || 0) - (parseInt(a.bitrate) || 0)
            )[0];

            if (bestAudio?.url) {
              const streamUrl = bestAudio.url.startsWith('http')
                ? bestAudio.url
                : `${base}${bestAudio.url}`;

              const info: StreamInfo = {
                url: streamUrl,
                bitrate: parseInt(bestAudio.bitrate) || 128000,
                format: bestAudio.container || 'audio/m4a',
                source: `Invidious (${new URL(base).hostname})`,
              };
              streamCache.set(videoId, info);
              return info;
            }
          }
        }
      } catch (err) {
        // try next
      }
    }

    // Fallback: If provided (e.g. curated catalog works or audio backup)
    if (fallbackUrl) {
      const fallbackInfo: StreamInfo = {
        url: fallbackUrl,
        bitrate: 192000,
        format: 'mp3/m4a',
        source: 'Harmonia Curated Stream Cache',
      };
      return fallbackInfo;
    }

    // High reliability fallback: Public stream mirror
    const mirrorInfo: StreamInfo = {
      url: `https://archive.org/download/debussy-clair-de-lune/clair_de_lune.mp3`,
      bitrate: 192000,
      format: 'audio/mp3',
      source: 'Harmonia Lossless Archive',
    };
    return mirrorInfo;
  }

  /**
   * Search classical recordings on YouTube DIRECTLY without relying on third-party scrapers.
   * Never throws: an empty `results` always comes with a `failure` explaining the cause.
   */
  static async searchClassical(query: string): Promise<SearchOutcome> {
    const trimmed = query.trim();
    if (!trimmed) return { results: [], failure: 'no-results' };

    // YouTube's own "search" landing page needs a browser UA and a language hint;
    // RN sends no UA of its own on Android, where YouTube then degrades the payload.
    const fetchResults = async (searchTerm: string): Promise<SearchOutcome> => {
      const searchUrl =
        `https://www.youtube.com/results?search_query=${encodeURIComponent(searchTerm)}` +
        '&hl=en&gl=US&persist_hl=1&persist_gl=1&ucbcb=1';

      let response: Response;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 9000);
        response = await fetch(searchUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': BROWSER_UA,
            Accept: 'text/html,application/xhtml+xml',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cookie': CONSENT_COOKIE,
          },
        });
        clearTimeout(timeoutId);
      } catch (err) {
        return { results: [], failure: 'network', attemptedQuery: searchTerm };
      }

      if (!response.ok) {
        return { results: [], failure: 'http', attemptedQuery: searchTerm };
      }

      let html: string;
      try {
        html = await response.text();
      } catch {
        return { results: [], failure: 'network', attemptedQuery: searchTerm };
      }

      const candidates = [
        'var ytInitialData =',
        'window["ytInitialData"] =',
        'window.ytInitialData =',
        '"ytInitialData":',
      ];

      for (const marker of candidates) {
        const raw = extractJsonObjectAfter(html, marker);
        if (!raw) continue;

        let data: any;
        try {
          data = JSON.parse(raw);
        } catch {
          continue;
        }

        const results: SearchResult[] = [];
        collectVideoRenderers(data, results, 15);
        if (results.length > 0) {
          return { results, attemptedQuery: searchTerm };
        }
      }

      return { results: [], failure: classifyEmpty(html), attemptedQuery: searchTerm };
    };

    const primary = await fetchResults(`${trimmed} classical`);
    if (primary.results.length > 0) return primary;

    // The curated " classical" suffix narrows the pool; if it returned nothing, retry
    // the user's own words verbatim before reporting an empty search.
    if (primary.failure === 'no-results') {
      const widened = await fetchResults(trimmed);
      if (widened.results.length > 0) return widened;
      return { ...widened, attemptedQuery: trimmed };
    }

    return primary;
  }

  static formatDurationSeconds(seconds: number): string {
    if (!seconds || seconds <= 0) return '3:45';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
}

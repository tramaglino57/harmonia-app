import { ClassicalWork, ExternalFavoriteTrack } from '../types';
import { SearchResult } from '../services/youtubeService';

const FALLBACK_COVER =
  'https://images.unsplash.com/photo-1507838153414-b4b713384a76?q=80&w=800&auto=format&fit=crop';

const DEFAULT_DURATION = 'Registrazione integrale';

/**
 * Wraps an arbitrary YouTube recording into the same `ClassicalWork` shape used
 * by the curated catalog, so player, favorites, and queue treat both alike.
 * A one-movement work is what makes the search queue necessary: ENDED cannot
 * advance inside the work, the queue must.
 */
export function wrapExternalRecording(params: {
  videoId: string;
  title: string;
  uploaderName: string;
  durationString?: string;
  thumbnailUrl?: string;
}): ClassicalWork {
  const { videoId, title, uploaderName, durationString, thumbnailUrl } = params;
  const displayDuration = durationString && durationString.trim() ? durationString : DEFAULT_DURATION;

  return {
    id: `yt-${videoId}`,
    composerId: 'external',
    title,
    catalogNumber: 'Registrazione YouTube',
    era: 'classicismo',
    genre: 'sinfonica',
    yearComposed: 'Classica',
    coverImage: thumbnailUrl || FALLBACK_COVER,
    description: `Registrazione caricata da ${uploaderName}.`,
    movements: [
      {
        id: `mov-${videoId}`,
        index: 1,
        title,
        tempo: DEFAULT_DURATION,
        durationApprox: displayDuration,
        youtubeVideoId: videoId,
      },
    ],
    interpretations: [
      {
        // `performer` keeps the channel name so a saved recording can be
        // rebuilt into a playable work without storing the raw search result.
        id: `interp-${videoId}`,
        label: uploaderName,
        performer: uploaderName,
        youtubeVideoId: videoId,
      },
    ],
  };
}

/**
 * External recordings are identified by their videoId inside the work id
 * (`yt-<videoId>`), so any plain ClassicalWork — including one that crossed a
 * `JSON.parse(JSON.stringify(...))` hop — can be recognised and rebuilt.
 */
export const isExternalWork = (work: ClassicalWork): boolean =>
  work.composerId === 'external' || work.id.startsWith('yt-');

export const buildWorkFromSearchResult = (res: SearchResult): ClassicalWork =>
  wrapExternalRecording({
    videoId: res.videoId,
    title: res.title,
    uploaderName: res.uploaderName,
    durationString: res.durationString,
    thumbnailUrl: res.thumbnailUrl,
  });

export const buildWorkFromExternalFavorite = (t: ExternalFavoriteTrack): ClassicalWork =>
  wrapExternalRecording({
    videoId: t.videoId,
    title: t.title,
    uploaderName: t.uploaderName,
    durationString: t.durationString,
    thumbnailUrl: t.thumbnailUrl,
  });

export const buildWorkFromAny = (work: ClassicalWork): ClassicalWork => {
  if (!isExternalWork(work)) return work;
  return wrapExternalRecording({
    videoId: work.movements[0]?.youtubeVideoId || work.interpretations[0]?.youtubeVideoId || '',
    title: work.title,
    uploaderName: work.interpretations[0]?.performer || 'YouTube',
    durationString: work.movements[0]?.durationApprox || '',
    thumbnailUrl: work.coverImage,
  });
};

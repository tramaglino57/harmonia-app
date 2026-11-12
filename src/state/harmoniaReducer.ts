import {
  ClassicalWork,
  ExternalFavoriteTrack,
  PlayerCurrentTrack,
  QueueEntry,
  SearchHistoryItem,
} from '../types';

/** Max terms kept in the "Le Tue Ricerche" section. */
export const MAX_HISTORY_ITEMS = 12;

export interface PlayerState {
  currentTrack: PlayerCurrentTrack | null;
  queue: { entries: QueueEntry[]; index: number } | null;
  isPlaying: boolean;
  isBuffering: boolean;
  positionMillis: number;
  durationMillis: number;
  sleepTimerMinutes: number | null;
}

export interface LibraryState {
  favorites: string[];
  externalFavorites: ExternalFavoriteTrack[];
  history: SearchHistoryItem[];
}

export type HarmoniaState = PlayerState & LibraryState;

export type HarmoniaAction =
  | {
      type: 'PLAY_TRACK';
      work: ClassicalWork;
      movementIndex?: number;
      interpretationId?: string;
      queue?: { entries: QueueEntry[]; index: number } | null;
    }
  | { type: 'PLAY_QUEUE'; entries: QueueEntry[]; startIndex?: number }
  | { type: 'ENDED' }
  | { type: 'NEXT_MOVEMENT' }
  | { type: 'PREVIOUS_MOVEMENT' }
  | { type: 'SET_PLAYING'; playing: boolean }
  | { type: 'TOGGLE_PLAY_PAUSE' }
  | { type: 'SEEK'; millis: number }
  | { type: 'SKIP_FORWARD'; seconds?: number }
  | { type: 'SKIP_BACKWARD'; seconds?: number }
  | { type: 'PROGRESS'; positionSec: number; durationSec?: number }
  | { type: 'SET_SLEEP_TIMER'; minutes: number | null }
  | { type: 'TICK_SLEEP_TIMER' }
  | { type: 'SET_BUFFERING'; buffering: boolean }
  | { type: 'TOGGLE_FAVORITE'; work: ClassicalWork }
  | { type: 'REMOVE_FAVORITE'; workId: string }
  | { type: 'RECORD_SEARCH'; term: string }
  | { type: 'CLEAR_HISTORY' }
  | { type: 'HYDRATE'; library: Partial<LibraryState> };

export const initialPlayerState: PlayerState = {
  currentTrack: null,
  queue: null,
  isPlaying: false,
  isBuffering: false,
  positionMillis: 0,
  durationMillis: 0,
  sleepTimerMinutes: null,
};

export const initialLibraryState: LibraryState = {
  favorites: [],
  externalFavorites: [],
  history: [],
};

export const initialState: HarmoniaState = { ...initialPlayerState, ...initialLibraryState };

/**
 * Movement/interpretation pair resolved exactly like the player expects:
 * movements may carry their own recording, otherwise the interpretation's
 * full recording is used.
 */
function resolveTarget(
  work: ClassicalWork,
  movementIndex = 0,
  interpretationId?: string
): { movement: PlayerCurrentTrack['movement']; interpretation: PlayerCurrentTrack['interpretation'] } | null {
  const movement = work.movements[movementIndex] || work.movements[0];
  const interpretation =
    (interpretationId ? work.interpretations.find((i) => i.id === interpretationId) : null) ||
    work.interpretations[0];
  if (!movement || !interpretation) return null;
  return { movement, interpretation };
}

/** The YouTube id that would actually be loaded for a target. */
export function videoIdFor(
  work: ClassicalWork,
  movementIndex: number,
  interpretationId?: string
): string {
  const target = resolveTarget(work, movementIndex, interpretationId);
  if (!target) return '';
  return target.movement.youtubeVideoId || target.interpretation.youtubeVideoId || '';
}

const trackFrom = (work: ClassicalWork, movementIndex: number, interpretationId?: string) => {
  const target = resolveTarget(work, movementIndex, interpretationId);
  if (!target) return null;
  return { work, movement: target.movement, interpretation: target.interpretation };
};

function startTrack(
  state: HarmoniaState,
  work: ClassicalWork,
  movementIndex: number,
  interpretationId?: string,
  queue: HarmoniaState['queue'] = null
): HarmoniaState {
  const track = trackFrom(work, movementIndex, interpretationId);
  if (!track) return state;
  return {
    ...state,
    currentTrack: track,
    queue,
    positionMillis: 0,
    isBuffering: false,
    isPlaying: true,
  };
}

/**
 * Advance one step when the player reports ENDED.
 *
 * Movement order wins INSIDE a work, but only when the next movement maps to a
 * different recording. All catalog works store a single full recording in
 * `interpretations`, so every "movement" shares one videoId: blindly advancing
 * would hand the embed library an unchanged id (it skips the reload) and the
 * app would sit with isPlaying=true over silent video. When that happens the
 * recording really is over, so fall through to the queue and finally stop.
 */
function advance(state: HarmoniaState): HarmoniaState {
  const track = state.currentTrack;
  if (!track) return { ...state, isPlaying: false };

  const currentIndex = track.work.movements.findIndex((m) => m.id === track.movement.id);
  const nextIndex = currentIndex + 1;
  const hasNextMovement = currentIndex >= 0 && nextIndex < track.work.movements.length;

  if (hasNextMovement) {
    const nextVideoId = videoIdFor(track.work, nextIndex, track.interpretation.id);
    const currentVideoId =
      track.movement.youtubeVideoId || track.interpretation.youtubeVideoId || '';
    if (nextVideoId && nextVideoId !== currentVideoId) {
      return startTrack(state, track.work, nextIndex, track.interpretation.id, state.queue);
    }
  }

  if (!state.queue) return { ...state, isPlaying: false };
  const { entries, index } = state.queue;
  if (index >= entries.length - 1) return { ...state, isPlaying: false };
  const nextIndexInQueue = index + 1;
  const entry = entries[nextIndexInQueue];
  return startTrack(state, entry.work, entry.movementIndex, entry.interpretationId, {
    entries,
    index: nextIndexInQueue,
  });
}

function externalFromWork(work: ClassicalWork): ExternalFavoriteTrack {
  const movement = work.movements[0];
  const interpretation = work.interpretations[0];
  return {
    id: work.id,
    videoId: movement?.youtubeVideoId || interpretation?.youtubeVideoId || '',
    title: work.title,
    // Search results store the channel name in `performer`, so a saved
    // recording can be rebuilt into a playable work later on.
    uploaderName: interpretation?.performer || 'YouTube',
    durationString: movement?.durationApprox || '',
    thumbnailUrl: work.coverImage,
    savedAt: Date.now(),
  };
}

export const isExternalWork = (work: ClassicalWork): boolean =>
  work.composerId === 'external' || work.id.startsWith('yt-');

/**
 * Pure reducer: every playback and library rule lives here so it can be
 * exercised in Node without React, a renderer, or a device.
 */
export function reducer(state: HarmoniaState, action: HarmoniaAction): HarmoniaState {
  switch (action.type) {
    case 'PLAY_TRACK':
      return startTrack(
        state,
        action.work,
        action.movementIndex ?? 0,
        action.interpretationId,
        action.queue ?? null
      );

    case 'PLAY_QUEUE': {
      if (action.entries.length === 0) return state;
      const safeIndex = Math.min(Math.max(action.startIndex ?? 0, 0), action.entries.length - 1);
      const entry = action.entries[safeIndex];
      return startTrack(state, entry.work, entry.movementIndex, entry.interpretationId, {
        entries: action.entries,
        index: safeIndex,
      });
    }

    case 'ENDED':
    case 'NEXT_MOVEMENT':
      return advance(state);

    case 'PREVIOUS_MOVEMENT': {
      const track = state.currentTrack;
      if (!track) return state;
      const currentIndex = track.work.movements.findIndex((m) => m.id === track.movement.id);
      if (currentIndex > 0) {
        return startTrack(state, track.work, currentIndex - 1, track.interpretation.id, state.queue);
      }
      return { ...state, positionMillis: 0 };
    }

    case 'SET_PLAYING':
      return { ...state, isPlaying: action.playing };

    case 'TOGGLE_PLAY_PAUSE':
      return { ...state, isPlaying: !state.isPlaying };

    case 'SEEK':
      return { ...state, positionMillis: action.millis };

    case 'SKIP_FORWARD': {
      const secs = action.seconds ?? 15;
      const next = Math.min(
        state.positionMillis + secs * 1000,
        state.durationMillis || state.positionMillis + secs * 1000
      );
      return { ...state, positionMillis: next };
    }

    case 'SKIP_BACKWARD': {
      const secs = action.seconds ?? 15;
      return { ...state, positionMillis: Math.max(state.positionMillis - secs * 1000, 0) };
    }

    case 'PROGRESS': {
      const positionMillis =
        typeof action.positionSec === 'number' && !isNaN(action.positionSec)
          ? Math.floor(action.positionSec * 1000)
          : state.positionMillis;
      const durationMillis =
        typeof action.durationSec === 'number' && !isNaN(action.durationSec) && action.durationSec > 0
          ? Math.floor(action.durationSec * 1000)
          : state.durationMillis;
      return { ...state, positionMillis, durationMillis };
    }

    case 'SET_SLEEP_TIMER':
      return { ...state, sleepTimerMinutes: action.minutes };

    case 'TICK_SLEEP_TIMER': {
      if (state.sleepTimerMinutes === null || state.sleepTimerMinutes <= 0) return state;
      if (state.sleepTimerMinutes <= 1) {
        return { ...state, sleepTimerMinutes: null, isPlaying: false };
      }
      return { ...state, sleepTimerMinutes: state.sleepTimerMinutes - 1 };
    }

    case 'SET_BUFFERING':
      return { ...state, isBuffering: action.buffering };

    case 'TOGGLE_FAVORITE': {
      if (isExternalWork(action.work)) {
        const exists = state.externalFavorites.some((t) => t.id === action.work.id);
        return {
          ...state,
          externalFavorites: exists
            ? state.externalFavorites.filter((t) => t.id !== action.work.id)
            : [externalFromWork(action.work), ...state.externalFavorites],
        };
      }
      const id = action.work.id;
      return {
        ...state,
        favorites: state.favorites.includes(id)
          ? state.favorites.filter((f) => f !== id)
          : [...state.favorites, id],
      };
    }

    case 'REMOVE_FAVORITE':
      return {
        ...state,
        favorites: state.favorites.filter((f) => f !== action.workId),
        externalFavorites: state.externalFavorites.filter((t) => t.id !== action.workId),
      };

    case 'RECORD_SEARCH': {
      const clean = action.term.trim();
      if (!clean) return state;
      const rest = state.history.filter((h) => h.term.toLowerCase() !== clean.toLowerCase());
      return {
        ...state,
        history: [{ term: clean, at: Date.now() }, ...rest].slice(0, MAX_HISTORY_ITEMS),
      };
    }

    case 'CLEAR_HISTORY':
      return { ...state, history: [] };

    case 'HYDRATE':
      // Library fields ONLY: the async storage read can resolve after the user
      // already started a track, and wiping the player there would cut audio.
      return {
        ...state,
        favorites: Array.isArray(action.library.favorites) ? action.library.favorites : state.favorites,
        externalFavorites: Array.isArray(action.library.externalFavorites)
          ? action.library.externalFavorites
          : state.externalFavorites,
        history: Array.isArray(action.library.history) ? action.library.history : state.history,
      };

    default:
      return state;
  }
}

/** Serialization used by the context when it writes the library to storage. */
export function selectLibrary(state: HarmoniaState): LibraryState {
  const { favorites, externalFavorites, history } = state;
  return { favorites, externalFavorites, history };
}

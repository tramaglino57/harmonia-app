import React, { createContext, useContext, useEffect, useReducer, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ClassicalWork, PlayerCurrentTrack, QueueEntry, ExternalFavoriteTrack, SearchHistoryItem } from '../types';
import {
  reducer,
  initialState,
  HarmoniaState,
  selectLibrary,
  MAX_HISTORY_ITEMS,
} from '../state/harmoniaReducer';

export const LIBRARY_STORAGE_KEY = '@harmonia/library/v1';

interface AudioContextType {
  currentTrack: PlayerCurrentTrack | null;
  isPlaying: boolean;
  isBuffering: boolean;
  positionMillis: number;
  durationMillis: number;
  sleepTimerMinutes: number | null;
  favorites: string[];
  externalFavorites: ExternalFavoriteTrack[];
  history: SearchHistoryItem[];
  libraryLoaded: boolean;
  playTrack: (work: ClassicalWork, movementIndex?: number, interpretationId?: string) => void;
  playQueue: (entries: QueueEntry[], startIndex?: number) => void;
  advanceOnEnded: () => void;
  togglePlayPause: () => void;
  setIsPlaying: (playing: boolean) => void;
  seekTo: (millis: number) => void;
  skipForward: (seconds?: number) => void;
  skipBackward: (seconds?: number) => void;
  nextMovement: () => void;
  previousMovement: () => void;
  setSleepTimer: (minutes: number | null) => void;
  toggleFavorite: (work: ClassicalWork) => void;
  isFavorite: (workId: string) => boolean;
  removeFavorite: (workId: string) => void;
  clearHistory: () => void;
  recordSearch: (term: string) => void;
  updateProgress: (currentTimeSec: number, durationSec?: number) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [libraryLoaded, setLibraryLoaded] = React.useState(false);

  // ---------------------------------------------------------------- persistence
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(LIBRARY_STORAGE_KEY);
        if (cancelled) return;
        if (raw) {
          dispatch({ type: 'HYDRATE', library: JSON.parse(raw) });
        }
      } catch (e) {
        // Corrupt or unreadable store: start from an empty library instead of
        // crashing the app on launch.
        console.warn('Armonia: libreria locale non caricata', e);
      } finally {
        if (!cancelled) setLibraryLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hydratedOnce = useRef(false);
  const library = selectLibrary(state);
  const libraryJson = JSON.stringify(library);
  useEffect(() => {
    if (!libraryLoaded) return;
    if (!hydratedOnce.current) {
      hydratedOnce.current = true;
      return; // state still equals what was just read; nothing to write back
    }
    AsyncStorage.setItem(LIBRARY_STORAGE_KEY, libraryJson).catch((e) =>
      console.warn('Armonia: salvataggio libreria fallito', e)
    );
  }, [libraryLoaded, libraryJson]);

  // ---------------------------------------------------------------- sleep timer
  useEffect(() => {
    if (state.sleepTimerMinutes === null || state.sleepTimerMinutes <= 0) return;
    const timer = setInterval(() => dispatch({ type: 'TICK_SLEEP_TIMER' }), 60000);
    return () => clearInterval(timer);
  }, [state.sleepTimerMinutes]);

  const value: AudioContextType = {
    currentTrack: state.currentTrack,
    isPlaying: state.isPlaying,
    isBuffering: state.isBuffering,
    positionMillis: state.positionMillis,
    durationMillis: state.durationMillis,
    sleepTimerMinutes: state.sleepTimerMinutes,
    favorites: state.favorites,
    externalFavorites: state.externalFavorites,
    history: state.history,
    libraryLoaded,
    playTrack: (work, movementIndex = 0, interpretationId) =>
      dispatch({ type: 'PLAY_TRACK', work, movementIndex, interpretationId }),
    playQueue: (entries, startIndex = 0) => dispatch({ type: 'PLAY_QUEUE', entries, startIndex }),
    advanceOnEnded: () => dispatch({ type: 'ENDED' }),
    togglePlayPause: () => dispatch({ type: 'TOGGLE_PLAY_PAUSE' }),
    setIsPlaying: (playing) => dispatch({ type: 'SET_PLAYING', playing }),
    seekTo: (millis) => dispatch({ type: 'SEEK', millis }),
    skipForward: (seconds) => dispatch({ type: 'SKIP_FORWARD', seconds }),
    skipBackward: (seconds) => dispatch({ type: 'SKIP_BACKWARD', seconds }),
    nextMovement: () => dispatch({ type: 'NEXT_MOVEMENT' }),
    previousMovement: () => dispatch({ type: 'PREVIOUS_MOVEMENT' }),
    setSleepTimer: (minutes) => dispatch({ type: 'SET_SLEEP_TIMER', minutes }),
    toggleFavorite: (work) => dispatch({ type: 'TOGGLE_FAVORITE', work }),
    isFavorite: (workId) =>
      state.favorites.includes(workId) || state.externalFavorites.some((t) => t.id === workId),
    removeFavorite: (workId) => dispatch({ type: 'REMOVE_FAVORITE', workId }),
    clearHistory: () => dispatch({ type: 'CLEAR_HISTORY' }),
    recordSearch: (term) => dispatch({ type: 'RECORD_SEARCH', term }),
    updateProgress: (positionSec, durationSec) =>
      dispatch({ type: 'PROGRESS', positionSec, durationSec }),
  };

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio deve essere utilizzato all\'interno di AudioProvider');
  }
  return context;
};

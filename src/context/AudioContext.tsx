import React, { createContext, useContext, useState, useEffect } from 'react';
import { ClassicalWork, Movement, Interpretation, PlayerCurrentTrack } from '../types';

interface AudioContextType {
  currentTrack: PlayerCurrentTrack | null;
  isPlaying: boolean;
  isBuffering: boolean;
  positionMillis: number;
  durationMillis: number;
  sleepTimerMinutes: number | null;
  favorites: string[];
  playTrack: (work: ClassicalWork, movementIndex?: number, interpretationId?: string) => Promise<void>;
  togglePlayPause: () => void;
  setIsPlaying: (playing: boolean) => void;
  seekTo: (millis: number) => void;
  skipForward: (seconds?: number) => void;
  skipBackward: (seconds?: number) => void;
  nextMovement: () => void;
  previousMovement: () => void;
  switchInterpretation: (interpretationId: string) => void;
  setSleepTimer: (minutes: number | null) => void;
  toggleFavorite: (workId: string) => void;
  isFavorite: (workId: string) => boolean;
  updateProgress: (currentTimeSec: number, durationSec?: number) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<PlayerCurrentTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [positionMillis, setPositionMillis] = useState<number>(0);
  const [durationMillis, setDurationMillis] = useState<number>(0);
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<string[]>(['vivaldi-primavera', 'verdi-traviata', 'debussy-suite-bergamasque']);

  // Sleep Timer countdown
  useEffect(() => {
    if (sleepTimerMinutes === null || sleepTimerMinutes <= 0) return;

    const timer = setInterval(() => {
      setSleepTimerMinutes((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          setIsPlaying(false);
          return null;
        }
        return prev - 1;
      });
    }, 60000);

    return () => clearInterval(timer);
  }, [sleepTimerMinutes]);

  const updateProgress = (currentTimeSec: number, durationSec?: number) => {
    if (typeof currentTimeSec === 'number' && !isNaN(currentTimeSec)) {
      setPositionMillis(Math.floor(currentTimeSec * 1000));
    }
    if (typeof durationSec === 'number' && !isNaN(durationSec) && durationSec > 0) {
      setDurationMillis(Math.floor(durationSec * 1000));
    }
  };

  const playTrack = async (
    work: ClassicalWork,
    movementIndex = 0,
    interpretationId?: string
  ) => {
    const targetMovement = work.movements[movementIndex] || work.movements[0];
    const targetInterpretation =
      (interpretationId
        ? work.interpretations.find((i) => i.id === interpretationId)
        : null) || work.interpretations[0];

    setCurrentTrack({
      work,
      movement: targetMovement,
      interpretation: targetInterpretation,
    });
    setPositionMillis(0);
    setIsBuffering(false);
    setIsPlaying(true);
  };

  const togglePlayPause = () => {
    setIsPlaying((prev) => !prev);
  };

  const seekTo = (millis: number) => {
    setPositionMillis(millis);
  };

  const skipForward = (seconds = 15) => {
    setPositionMillis((prev) => Math.min(prev + seconds * 1000, durationMillis || prev + seconds * 1000));
  };

  const skipBackward = (seconds = 15) => {
    setPositionMillis((prev) => Math.max(prev - seconds * 1000, 0));
  };

  const nextMovement = () => {
    if (!currentTrack) return;
    const currentIndex = currentTrack.work.movements.findIndex(
      (m) => m.id === currentTrack.movement.id
    );
    if (currentIndex < currentTrack.work.movements.length - 1) {
      playTrack(
        currentTrack.work,
        currentIndex + 1,
        currentTrack.interpretation.id
      );
    }
  };

  const previousMovement = () => {
    if (!currentTrack) return;
    const currentIndex = currentTrack.work.movements.findIndex(
      (m) => m.id === currentTrack.movement.id
    );
    if (currentIndex > 0) {
      playTrack(
        currentTrack.work,
        currentIndex - 1,
        currentTrack.interpretation.id
      );
    } else {
      seekTo(0);
    }
  };

  const switchInterpretation = (interpretationId: string) => {
    if (!currentTrack) return;
    const currentIndex = currentTrack.work.movements.findIndex(
      (m) => m.id === currentTrack.movement.id
    );
    playTrack(currentTrack.work, currentIndex, interpretationId);
  };

  const setSleepTimer = (minutes: number | null) => {
    setSleepTimerMinutes(minutes);
  };

  const toggleFavorite = (workId: string) => {
    setFavorites((prev) =>
      prev.includes(workId) ? prev.filter((id) => id !== workId) : [...prev, workId]
    );
  };

  const isFavorite = (workId: string) => favorites.includes(workId);

  return (
    <AudioContext.Provider
      value={{
        currentTrack,
        isPlaying,
        isBuffering,
        positionMillis,
        durationMillis,
        sleepTimerMinutes,
        favorites,
        playTrack,
        togglePlayPause,
        setIsPlaying,
        seekTo,
        skipForward,
        skipBackward,
        nextMovement,
        previousMovement,
        switchInterpretation,
        setSleepTimer,
        toggleFavorite,
        isFavorite,
        updateProgress,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio deve essere utilizzato all\'interno di AudioProvider');
  }
  return context;
};

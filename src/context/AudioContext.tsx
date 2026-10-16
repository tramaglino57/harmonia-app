import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { ClassicalWork, Movement, Interpretation, PlayerCurrentTrack } from '../types';
import { YouTubeAudioService, StreamInfo } from '../services/youtubeService';

interface AudioContextType {
  currentTrack: PlayerCurrentTrack | null;
  isPlaying: boolean;
  isBuffering: boolean;
  positionMillis: number;
  durationMillis: number;
  streamInfo: StreamInfo | null;
  sleepTimerMinutes: number | null;
  favorites: string[];
  playTrack: (work: ClassicalWork, movementIndex?: number, interpretationId?: string) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  seekTo: (millis: number) => Promise<void>;
  skipForward: (seconds?: number) => Promise<void>;
  skipBackward: (seconds?: number) => Promise<void>;
  nextMovement: () => Promise<void>;
  previousMovement: () => Promise<void>;
  switchInterpretation: (interpretationId: string) => Promise<void>;
  setSleepTimer: (minutes: number | null) => void;
  toggleFavorite: (workId: string) => void;
  isFavorite: (workId: string) => boolean;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [currentTrack, setCurrentTrack] = useState<PlayerCurrentTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [positionMillis, setPositionMillis] = useState<number>(0);
  const [durationMillis, setDurationMillis] = useState<number>(0);
  const [streamInfo, setStreamInfo] = useState<StreamInfo | null>(null);
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<string[]>(['vivaldi-primavera', 'verdi-traviata']);

  const soundRef = useRef<Audio.Sound | null>(null);
  const currentTrackRef = useRef<PlayerCurrentTrack | null>(null);
  currentTrackRef.current = currentTrack;

  // Configure Audio Mode for background playback on Android & iOS
  useEffect(() => {
    async function setupAudio() {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (err) {
        console.warn('Errore configurazione AudioMode:', err);
      }
    }
    setupAudio();

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  // Sleep Timer countdown
  useEffect(() => {
    if (sleepTimerMinutes === null || sleepTimerMinutes <= 0) return;

    const timer = setInterval(() => {
      setSleepTimerMinutes((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          if (soundRef.current) {
            soundRef.current.pauseAsync();
          }
          setIsPlaying(false);
          return null;
        }
        return prev - 1;
      });
    }, 60000);

    return () => clearInterval(timer);
  }, [sleepTimerMinutes]);

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        console.warn('Errore riproduzione:', status.error);
        setIsBuffering(false);
      }
      return;
    }

    setIsPlaying(status.isPlaying);
    setIsBuffering(status.isBuffering);
    setPositionMillis(status.positionMillis);
    setDurationMillis(status.durationMillis || 0);

    // Auto-advance to next movement
    if (status.didJustFinish && !status.isLooping) {
      handleAutoAdvance();
    }
  };

  const handleAutoAdvance = () => {
    const cur = currentTrackRef.current;
    if (!cur) return;

    const nextIndex = cur.movement.index; // index is 1-based, so next movement in array is index
    if (nextIndex < cur.work.movements.length) {
      const nextMov = cur.work.movements[nextIndex];
      playTrack(cur.work, nextIndex, cur.interpretation.id);
    }
  };

  const playTrack = async (
    work: ClassicalWork,
    movementIndex = 0,
    interpretationId?: string
  ) => {
    try {
      setIsBuffering(true);

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

      // 1. Unload existing sound
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
        setSound(null);
      }

      // 2. Resolve YouTube Audio Stream or fallback
      const videoId =
        targetMovement.youtubeVideoId || targetInterpretation.youtubeVideoId;
      const fallback =
        targetMovement.fallbackAudioUrl || targetInterpretation.fallbackAudioUrl;

      const resolved = await YouTubeAudioService.resolveAudioStream(videoId, fallback);
      setStreamInfo(resolved);

      // 3. Create and play new audio stream
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: resolved.url },
        {
          shouldPlay: true,
          progressUpdateIntervalMillis: 500,
        },
        onPlaybackStatusUpdate
      );

      soundRef.current = newSound;
      setSound(newSound);
      setIsPlaying(true);
      setIsBuffering(false);
    } catch (err: any) {
      console.warn('Errore avvio traccia audio:', err);
      setIsBuffering(false);
    }
  };

  const togglePlayPause = async () => {
    if (!soundRef.current) return;
    try {
      if (isPlaying) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        await soundRef.current.playAsync();
        setIsPlaying(true);
      }
    } catch (e) {
      console.warn('Errore toggle play/pause:', e);
    }
  };

  const seekTo = async (millis: number) => {
    if (!soundRef.current) return;
    try {
      await soundRef.current.setPositionAsync(millis);
      setPositionMillis(millis);
    } catch (e) {
      console.warn('Errore seek:', e);
    }
  };

  const skipForward = async (seconds = 15) => {
    if (!soundRef.current) return;
    const newPos = Math.min(positionMillis + seconds * 1000, durationMillis);
    await seekTo(newPos);
  };

  const skipBackward = async (seconds = 15) => {
    if (!soundRef.current) return;
    const newPos = Math.max(positionMillis - seconds * 1000, 0);
    await seekTo(newPos);
  };

  const nextMovement = async () => {
    if (!currentTrack) return;
    const currentIndex = currentTrack.work.movements.findIndex(
      (m) => m.id === currentTrack.movement.id
    );
    if (currentIndex < currentTrack.work.movements.length - 1) {
      await playTrack(
        currentTrack.work,
        currentIndex + 1,
        currentTrack.interpretation.id
      );
    }
  };

  const previousMovement = async () => {
    if (!currentTrack) return;
    const currentIndex = currentTrack.work.movements.findIndex(
      (m) => m.id === currentTrack.movement.id
    );
    if (currentIndex > 0) {
      await playTrack(
        currentTrack.work,
        currentIndex - 1,
        currentTrack.interpretation.id
      );
    } else {
      await seekTo(0);
    }
  };

  const switchInterpretation = async (interpretationId: string) => {
    if (!currentTrack) return;
    const currentIndex = currentTrack.work.movements.findIndex(
      (m) => m.id === currentTrack.movement.id
    );
    await playTrack(currentTrack.work, currentIndex, interpretationId);
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
        streamInfo,
        sleepTimerMinutes,
        favorites,
        playTrack,
        togglePlayPause,
        seekTo,
        skipForward,
        skipBackward,
        nextMovement,
        previousMovement,
        switchInterpretation,
        setSleepTimer,
        toggleFavorite,
        isFavorite,
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

export type ClassicalEra = 'antica' | 'barocco' | 'classicismo' | 'romanticismo' | 'novecento';

export type ClassicalGenre = 'cameristica' | 'lirica' | 'sinfonica' | 'sacra' | 'strumentale' | 'antica';

export interface Composer {
  id: string;
  name: string;
  fullName: string;
  years: string;
  era: ClassicalEra;
  country: string;
  portrait: string;
  bio: string;
}

export interface Movement {
  id: string;
  index: number;
  title: string;
  tempo: string;
  durationApprox: string;
  description?: string;
  youtubeVideoId?: string; // Optional movement-specific video ID
  fallbackAudioUrl?: string;
}

export interface Interpretation {
  id: string;
  label: string;
  performer: string;
  conductor?: string;
  orchestraOrEnsemble?: string;
  year?: string;
  youtubeVideoId: string;
  fallbackAudioUrl?: string; // Direct audio fallback for instant high-reliability playback
}

export interface OperaVerse {
  character: string;
  verse: string;
  context?: string;
}

export interface ClassicalWork {
  id: string;
  composerId: string;
  title: string;
  subtitle?: string;
  catalogNumber: string; // e.g. "BWV 1048", "Op. 125", "K. 626"
  key?: string; // e.g. "Sol maggiore", "Re minore"
  era: ClassicalEra;
  genre: ClassicalGenre;
  yearComposed: string;
  coverImage: string;
  description: string;
  movements: Movement[];
  interpretations: Interpretation[];
  libretto?: OperaVerse[];
}

export interface PlayerCurrentTrack {
  work: ClassicalWork;
  movement: Movement;
  interpretation: Interpretation;
}

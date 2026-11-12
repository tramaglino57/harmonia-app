import {
  reducer,
  initialState,
  HarmoniaState,
  videoIdFor,
  isExternalWork,
  MAX_HISTORY_ITEMS,
} from '../src/state/harmoniaReducer';
import { ClassicalWork } from '../src/types';

function makeWork(id: string, videoId: string, movementCount: number, perMovementIds = false): ClassicalWork {
  return {
    id,
    composerId: 'external',
    title: `Brano ${id}`,
    catalogNumber: 'L. 1',
    era: 'barocco',
    genre: 'sinfonica',
    yearComposed: '1700',
    coverImage: `https://img/${id}.jpg`,
    description: '',
    movements: Array.from({ length: movementCount }, (_, i) => ({
      id: `${id}-mov-${i}`,
      index: i + 1,
      title: `Movimento ${i + 1}`,
      tempo: 'Allegro',
      durationApprox: '5:00',
      youtubeVideoId: perMovementIds ? `${videoId}-mov${i}` : undefined,
    })),
    interpretations: [
      {
        id: `${id}-i1`,
        label: 'Canale Test',
        performer: 'Canale Test',
        youtubeVideoId: videoId,
      },
    ],
  };
}

const entry = (work: ClassicalWork, movementIndex = 0) => ({ work, movementIndex });

describe('punto 10: la playlist continua da sola', () => {
  it('ENDED scorre le registrazioni in coda e si ferma alla fine', () => {
    const a = makeWork('a', 'vid-a', 1);
    const b = makeWork('b', 'vid-b', 1);
    const c = makeWork('c', 'vid-c', 1);

    let s = reducer(initialState, { type: 'PLAY_QUEUE', entries: [entry(a), entry(b), entry(c)], startIndex: 0 });
    expect(s.currentTrack!.work.id).toBe('a');

    s = reducer(s, { type: 'ENDED' });
    expect(s.currentTrack!.work.id).toBe('b');
    expect(s.isPlaying).toBe(true);
    expect(s.queue!.index).toBe(1);

    s = reducer(s, { type: 'ENDED' });
    expect(s.currentTrack!.work.id).toBe('c');

    s = reducer(s, { type: 'ENDED' });
    expect(s.currentTrack!.work.id).toBe('c');
    expect(s.isPlaying).toBe(false);
  });

  it('partire da una posizione della lista funziona (tocco il 3° risultato)', () => {
    const a = makeWork('a', 'vid-a', 1);
    const b = makeWork('b', 'vid-b', 1);
    const c = makeWork('c', 'vid-c', 1);
    const s = reducer(initialState, {
      type: 'PLAY_QUEUE',
      entries: [entry(a), entry(b), entry(c)],
      startIndex: 2,
    });
    expect(s.currentTrack!.work.id).toBe('c');
    const after = reducer(s, { type: 'ENDED' });
    expect(after.isPlaying).toBe(false); // ultimo: niente oltre
  });

  it('startIndex fuori range non esplode', () => {
    const a = makeWork('a', 'vid-a', 1);
    const s = reducer(initialState, { type: 'PLAY_QUEUE', entries: [entry(a)], startIndex: 9 });
    expect(s.currentTrack!.work.id).toBe('a');
    const empty = reducer(initialState, { type: 'PLAY_QUEUE', entries: [] });
    expect(empty.currentTrack).toBeNull();
  });

  it('un capolavoro con UNA sola registrazione per tutti i movimenti non si blocca su isPlaying', () => {
    // rispecchia il catalogo reale: movements senza youtubeVideoId proprio
    const bergamasque = makeWork('suite-bergamasque', 'vid-full', 4);
    let s = reducer(initialState, { type: 'PLAY_QUEUE', entries: [entry(bergamasque)] });
    expect(s.currentTrack!.movement.id).toBe('suite-bergamasque-mov-0');

    s = reducer(s, { type: 'ENDED' });
    // NON deve "avanzare" al mov-1 che ha lo stesso videoId: il brano è finito
    expect(s.currentTrack!.movement.id).toBe('suite-bergamasque-mov-0');
    expect(s.isPlaying).toBe(false);
  });

  it('un lavoro con video per movimento prosegue movimento per movimento', () => {
    const multi = makeWork('requiem', 'vid-req', 3, true);
    let s = reducer(initialState, { type: 'PLAY_QUEUE', entries: [entry(multi)] });
    s = reducer(s, { type: 'ENDED' });
    expect(s.currentTrack!.movement.id).toBe('requiem-mov-1');
    expect(s.isPlaying).toBe(true);
    s = reducer(s, { type: 'ENDED' });
    expect(s.currentTrack!.movement.id).toBe('requiem-mov-2');
    s = reducer(s, { type: 'ENDED' });
    expect(s.isPlaying).toBe(false);
  });

  it('playTrack semplice pulisce la coda precedente (niente fantasmi)', () => {
    let s = reducer(initialState, {
      type: 'PLAY_QUEUE',
      entries: [entry(makeWork('a', 'vid-a', 1)), entry(makeWork('b', 'vid-b', 1))],
    });
    s = reducer(s, { type: 'PLAY_TRACK', work: makeWork('solo', 'vid-solo', 1) });
    expect(s.queue).toBeNull();
    s = reducer(s, { type: 'ENDED' });
    expect(s.currentTrack!.work.id).toBe('solo');
    expect(s.isPlaying).toBe(false);
  });

  it('NEXT_MOVEMENT usa la stessa logica, quindi il pulsante skip non impalla', () => {
    let s = reducer(initialState, {
      type: 'PLAY_QUEUE',
      entries: [entry(makeWork('a', 'vid-a', 1)), entry(makeWork('b', 'vid-b', 1))],
    });
    s = reducer(s, { type: 'NEXT_MOVEMENT' });
    expect(s.currentTrack!.work.id).toBe('b');
  });
});

describe('punto 8: preferiti dal cuore', () => {
  it('brano di catalogo in favorites, registrazione YouTube in externalFavorites', () => {
    const cat = makeWork('vivaldi-primavera', 'TsKBLYmwo5U', 3);
    const ext = makeWork('yt-Zp1s2d3f4g5h', 'Zp1s2d3f4g5h', 1);
    expect(isExternalWork(cat)).toBe(true); // composerId 'external' nel helper di test
    let s = reducer(initialState, { type: 'TOGGLE_FAVORITE', work: { ...cat, composerId: 'vivaldi' } });
    expect(s.favorites).toEqual(['vivaldi-primavera']);
    expect(s.externalFavorites).toEqual([]);

    s = reducer(s, { type: 'TOGGLE_FAVORITE', work: ext });
    expect(s.externalFavorites.length).toBe(1);
    expect(s.externalFavorites[0].videoId).toBe('Zp1s2d3f4g5h');
    expect(s.externalFavorites[0].id).toBe('yt-Zp1s2d3f4g5h');
    expect(s.externalFavorites[0].thumbnailUrl).toBe('https://img/yt-Zp1s2d3f4g5h.jpg');
    expect(s.externalFavorites[0].uploaderName).toBe('Canale Test');

    // secondo tocco toglie, e le due liste restano indipendenti
    s = reducer(s, { type: 'TOGGLE_FAVORITE', work: ext });
    expect(s.externalFavorites).toEqual([]);
    expect(s.favorites).toEqual(['vivaldi-primavera']);
  });

  it('removeFavorite copre entrambe le liste', () => {
    const ext = makeWork('yt-AAAAAAAAAAA', 'AAAAAAAAAAA', 1);
    let s = reducer(initialState, { type: 'TOGGLE_FAVORITE', work: ext });
    s = reducer(s, { type: 'TOGGLE_FAVORITE', work: { ...ext, id: 'mozart-requiem', composerId: 'mozart' } });
    s = reducer(s, { type: 'REMOVE_FAVORITE', workId: 'yt-AAAAAAAAAAA' });
    expect(s.externalFavorites).toEqual([]);
    expect(s.favorites.length).toBe(1);
  });

  it('la registrazione preferita è ancora riproducibile (videoId recuperato)', () => {
    const ext = makeWork('yt-BBBBBBBBBBB', 'BBBBBBBBBBB', 1);
    const s = reducer(initialState, { type: 'TOGGLE_FAVORITE', work: ext });
    const saved = s.externalFavorites[0];
    expect(videoIdFor(ext, 0)).toBe('BBBBBBBBBBB');
    expect(saved.videoId).toBe(videoIdFor(ext, 0));
  });
});

describe('punto 2: cronologia delle ricerche reali', () => {
  it('più recente in testa, dedup case-insensitive, cap 12', () => {
    let s = initialState;
    for (const t of ['Debussy', 'bach', 'debussy', 'Vivaldi']) {
      s = reducer(s, { type: 'RECORD_SEARCH', term: t });
    }
    expect(s.history.map((h) => h.term)).toEqual(['Vivaldi', 'debussy', 'bach']);

    s = initialState;
    for (let i = 0; i < 30; i++) s = reducer(s, { type: 'RECORD_SEARCH', term: `t${i}` });
    expect(s.history.length).toBe(MAX_HISTORY_ITEMS);
    expect(s.history[0].term).toBe('t29');
    expect(s.history[11].term).toBe('t18');
  });

  it('spazi vuoti ignorati e clearHistory azzera', () => {
    let s = reducer(initialState, { type: 'RECORD_SEARCH', term: '   ' });
    expect(s.history).toEqual([]);
    s = reducer(s, { type: 'RECORD_SEARCH', term: 'Chopin' });
    s = reducer(s, { type: 'CLEAR_HISTORY' });
    expect(s.history).toEqual([]);
  });

  it('HYDRATE carica la libreria senza spegnere un brano in corso', () => {
    let s = reducer(initialState, { type: 'PLAY_QUEUE', entries: [entry(makeWork('a', 'vid-a', 1))] });
    expect(s.isPlaying).toBe(true);
    s = reducer(s, {
      type: 'HYDRATE',
      library: {
        favorites: ['bach-brandeburghese-3'],
        externalFavorites: [
          {
            id: 'yt-CCCCCCCCCCC',
            videoId: 'CCCCCCCCCCC',
            title: 'Clair de lune',
            uploaderName: 'Channel',
            durationString: '5:12',
            thumbnailUrl: 'u',
            savedAt: 1,
          },
        ],
        history: [{ term: 'debussy', at: 1 }],
      },
    });
    expect(s.favorites).toEqual(['bach-brandeburghese-3']);
    expect(s.externalFavorites[0].videoId).toBe('CCCCCCCCCCC');
    expect(s.history[0].term).toBe('debussy');
    // il giocatore non è stato toccato
    expect(s.isPlaying).toBe(true);
    expect(s.currentTrack!.work.id).toBe('a');
  });

  it('HYDRATE con dati sporchi o partiali non buttare fuori niente', () => {
    const s = reducer(initialState, { type: 'HYDRATE', library: { favorites: 'non-una-lista' as any } });
    expect(s.favorites).toEqual([]);
    const s2 = reducer(initialState, { type: 'HYDRATE', library: {} });
    expect(s2.externalFavorites).toEqual([]);
  });
});

describe('sleep timer e progresso', () => {
  it('il timer scorre e allo scadere ferma la riproduzione', () => {
    let s: HarmoniaState = reducer({ ...initialState, isPlaying: true }, { type: 'SET_SLEEP_TIMER', minutes: 2 });
    s = reducer(s, { type: 'TICK_SLEEP_TIMER' });
    expect(s.sleepTimerMinutes).toBe(1);
    expect(s.isPlaying).toBe(true);
    s = reducer(s, { type: 'TICK_SLEEP_TIMER' });
    expect(s.sleepTimerMinutes).toBeNull();
    expect(s.isPlaying).toBe(false);
  });

  it('PROGRESS non azzera la durata quando YouTube non la conosce', () => {
    let s = reducer(initialState, { type: 'PROGRESS', positionSec: 10, durationSec: 300 });
    expect(s.durationMillis).toBe(300000);
    s = reducer(s, { type: 'PROGRESS', positionSec: 20 });
    expect(s.positionMillis).toBe(20000);
    expect(s.durationMillis).toBe(300000);
    s = reducer(s, { type: 'PROGRESS', positionSec: NaN, durationSec: 0 });
    expect(s.positionMillis).toBe(20000);
  });

  it('SKIP non supera la durata nota', () => {
    let s = reducer({ ...initialState, positionMillis: 290000, durationMillis: 300000 }, { type: 'SKIP_FORWARD' });
    expect(s.positionMillis).toBe(300000);
    s = reducer(s, { type: 'SKIP_BACKWARD', seconds: 400 });
    expect(s.positionMillis).toBe(0);
  });
});

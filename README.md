# Harmonia

App mobile (Expo / React Native) dedicata alla musica classica: catalogo curato di
grandi compositori e opere, ricerca di registrazioni su YouTube e player audio/video
integrato.

## Stack

- Expo SDK 58 (`expo@~58.0.22`), React Native 0.88.1, React 19.3.0
- TypeScript (strict)
- Player: `react-native-youtube-iframe` su `react-native-webview`
- Persistenza libreria: `@react-native-async-storage/async-storage`
- Audio/background: `expo-audio`, asset: `expo-asset`, `@expo/vector-icons`
- Pacchetti: `npm` (lockfile `package-lock.json`)

## Avvio in sviluppo

```bash
npm install
npm start          # expo start
npm run android    # oppure: npm run ios
```

Su dispositivo fisico o emulatore si usa **Expo Go**. Attenzione: in questa modalità l'app
esiste solo come bundle servito dal PC. Se il server Metro è spento, o il telefono non
attraversa la stessa rete, l'app non si apre. Collegamento manuale:
`exp://<IP-del-PC>:8081`.

Per una versione autonoma, installabile e utilizzabile anche fuori da casa, c'è la
build EAS (`eas.json`, profilo `preview` → APK firmata e distribuita nel cloud):

```bash
eas build --platform android --profile preview
```

## Struttura

```
App.tsx                          shell, tab bar, modali
src/components/                  Header, MiniPlayer, FullPlayerModal, Work/ComposerDetailModal
src/screens/                     HomeScreen, SearchScreen, FavoritesScreen
src/services/youtubeService.ts   ricerca YouTube (lettura della pagina results)
src/state/harmoniaReducer.ts     playlist e libreria come reducer puro
src/context/AudioContext.tsx     wrapper React del reducer + persistenza AsyncStorage
src/utils/externalWork.ts        costruzione di un work catalogabile da un risultato YouTube
src/data/classicalCatalog.ts     catalogo curato: compositori, opere, videoId
src/theme/colors.ts              palette
__tests__/queue.test.ts          test del reducer (Node, senza dispositivo)
```

## Come funziona la ricerca

`YouTubeAudioService.searchClassical()` scarica la pagina HTML
`https://www.youtube.com/results?search_query=...` e ne legge la variabile globale
`ytInitialData`, estraendo titolo, canale, durata e miniatura (max 15 risultati).

Il parser non usa un percorso JSON fisso: percorre l'intero payload alla ricerca di nodi
`videoRenderer`, quindi regge le riorganizzazioni della risposta di YouTube. L'estrazione
del JSON è a conta di parentesi (una regex pigra come `({.+?});` si fermava al primo `};`
incontrato anche dentro una stringa di testo e spezzava il payload).

La richiesta porta i cookie `SOCS`/`CONSENT` e i parametri `hl=en&gl=US&ucbcb=1` per non
finire sulla schermata di consenso GDPR, che da IP italiano arrivava senza `ytInitialData`
e produceva una ricerca silenziosamente vuota.

Il metodo ritorna `SearchOutcome { results, failure?, attemptedQuery }` e non lancia mai
eccezioni: quando non trova nulla dice perché (`network`, `http`, `consent`, `botcheck`,
`no-payload`, `no-results`). Se il suffisso `classical` aggiunto alla query azzera i
risultati, riprova con le parole esatte dell'utente.

Limite strutturale che resta: **da browser non può funzionare**. Una build web
(react-native-web) sottopone lo stesso `fetch` alla same-origin policy e YouTube non
invia header `Access-Control-Allow-Origin`: servirebbe un backend proxy. Su Android/iOS
il `fetch` nativo non è soggetto a CORS.

## Schermata di ricerca: cosa c'è adesso con la barra vuota

Le etichette fisse "Ricerche Consigliate" non esistono più. Al loro posto:

- **Le Tue Ricerche** - i termini veramente cercati (max 12, il più recente in testa,
  deduplicati in modo case-insensitive), toccabili per rieseguire la ricerca; voce "Svuota".
- **Preferiti** - le opere del catalogo e le registrazioni YouTube salvate col cuore.
  Le registrazioni esterne sono salvate per intero (videoId, titolo, canale, durata,
  miniatura), perché non fanno parte del catalogo e non sarebbero ricostruibili.

Tutto su AsyncStorage (chiave `@harmonia/library/v1`): sopravvive alla chiusura
dell'app e al riavvio del telefono.

Dopo "Cerca su YouTube" la tastiera viene chiusa e la ScrollView scorre in fondo: i
risultati sono renderizzati in coda alla pagina, quindi uno scroll "in alto" non li
avrebbe mai mostrati.

## Riproduzione, coda, playlist

`src/state/harmoniaReducer.ts` concentra le regole del player in una funzione pura,
verificata con jest senza bisogno di un telefono:

- `PLAY_QUEUE` stabilisce cosa succede dopo un brano; `ENDED` prima prova il movimento
  successivo **solo se cambia il videoId**, poi passa all'elemento dopo della coda, poi
  si ferma. I lavori del catalogo sono un solo video per l'intera opera: "movimento
  successivo" con lo stesso videoId vorrebbe dire ricaricare un video appena finito,
  lasciando `isPlaying` vero sopra una tela muta. Da qui il confronto sugli ID.
- `TOGGLE_FAVORITE` distingue `favorites: string[]` (catalogo) da
  `externalFavorites: ExternalFavoriteTrack[]` (YouTube).
- `HYDRATE` tocca solo i campi della libreria: una lettura da storage lenta non deve
  spegnere un brano in corso.

### Play/pause che non rispondeva

`play` dell'iframe ora è pilotato da `playRequested`, che resta `false` finché non è
scattato `onReady`. La libreria scarta in silenzio i comandi inviati prima del ready
(`sendPostMessage` esce subito se `!playerReady`): per questo, alla prima riproduzione,
sembrava funzionasse solo un tocco dentro la cornice YouTube.

### Frasi rimosse su richiesta

Sottotitolo "Musica Classica, Antica & Lirica" sotto il logo e "Harmonia YouTube Engine
· Audio & Video HD Integrato" nel player sono stati tolti, insieme al box "Esecuzione
Attiva / Confronta": sostituiti da una riga con interprete e anno. La scelta
dell'esecuzione resta disponibile nella scheda dell'opera (tab Esecuzioni).

## Pubblicità preroll di YouTube: cosa si può dire onestamente

Se il caricatore del video è monetizzato, il player embed porta spezzoni pubblicitari:
non esiste un'opzione ufficiale per rimuoverli, e le scorciatoie che le scavalcano violano i
termini di servizio. In `src/components/FullPlayerModal.tsx` c'è la costante
`EMBED_BASE_URL_OVERRIDE` (default `undefined`): puntandola a
`https://music.youtube.com/embed` si usa l'endpoint embed di YouTube Music, che in pratica
spesso non interrompe con pubblicità. Non è un'API ufficiale, può smettere di funzionare
da un giorno all'altro e non copre tutti i video: è lasciata spenta perché non ho uno
schermo su cui verificarla.

## Verifica

```bash
npm run typecheck   # tsc strict (comprende anche i test)
npm test            # jest sul reducer: coda, preferiti, cronologia, sleep timer
npx expo export --platform android
```

I risultati YouTube vengono riprodotti con lo stesso player del catalogo, quindi le
regole di `ENDED` si applicano a entrambi i casi.

## Nota sulla firma

Il keystore Android è generato e custodito da EAS dentro l'account Expo `robo57`, package
`com.harmonia.classical`. Per aggiornare l'app installata sul telefono occorre rifare la
build **con lo stesso account**: una firma diversa costringe a disinstallare.

## Licenza

Vedi `LICENSE`.

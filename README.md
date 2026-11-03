# Harmonia

App mobile (Expo / React Native) dedicata alla musica classica: catalogo curato di
grandi compositori e opere, ricerca di registrazioni su YouTube e player audio/video
integrato.

## Stack

- Expo SDK 58 (`expo@~58.0.22`), React Native 0.88.1, React 19.3.0
- TypeScript (strict)
- Player: `react-native-youtube-iframe` su `react-native-webview`
- Audio/background: `expo-audio`, asset: `expo-asset`, `@expo/vector-icons`
- Pacchetti: `npm` (lockfile `package-lock.json`)

## Avvio in sviluppo

```bash
npm install
npm start          # expo start
npm run android    # oppure: npm run ios
```

Su dispositivo fisico o emulatore si usa **Expo Go**. Attenzione: in questa modalità l'app
esiste solo come bundle servito dal PC. Se il server Metro è spento, o il telefono non è
sulla stessa rete, l'app non si apre. Collegamento manuale: `exp://<IP-del-PC>:8081`.

## Struttura

```
App.tsx                      shell, tab bar,/modali
src/components/              Header, MiniPlayer, FullPlayerModal, Work/ComposerDetailModal
src/screens/                 HomeScreen, SearchScreen, FavoritesScreen
src/services/youtubeService.ts   ricerca YouTube (scrape della pagina results)
src/data/classicalCatalog.ts     catalogo curato: compositori, opere, videoId
src/context/AudioContext.tsx     stato globale del player
src/theme/colors.ts              palette
```

## Come funziona la ricerca

`YouTubeAudioService.searchClassical()` scarica la pagina HTML
`https://www.youtube.com/results?search_query=...` e ne legge la variabile globale
`ytInitialData`, estraendo titolo, canale, durata e miniatura (max 15 risultati).

Il parser non usa un percorso JSON fisso: percorre l'intero payload alla ricerca di nodi
`videoRenderer`, quindi regge le riorganizzazioni della risposta di YouTube. L'estrazione
del JSON è a conta di parentesi (non una regex pigra, che si fermava al primo `};`
incontrato anche dentro una stringa di testo). La richiesta porta i cookie `SOCS`/`CONSENT`
e i parametri `hl=en&gl=US&ucbcb=1` per evitare il reindirizzamento alla schermata di
consenso GDPR, che da IP italiano arrivava una pagina priva di `ytInitialData`.

ritorna `SearchOutcome { results, failure?, attemptedQuery }` e **non lancia mai eccezioni**:
quando non trova nulla dice perché (`network`, `http`, `consent`, `botcheck`, `no-payload`,
`no-results`), e l'interfaccia lo mostra con un messaggio e un pulsante "Riprova". Se il
suffisso `classical` aggiunto alla query azzera i risultati, riprova con le parole esatte
dell'utente.

Limite strutturale che resta: **da browser non può funzionare**. La build web (react-native-web)
sottopone lo stesso `fetch` alla same-origin policy e YouTube non invia header
`Access-Control-Allow-Origin`: una versione web ospitata della ricerca richiede un backend
proxy, non un sito statico. Su Android/iOS il `fetch` nativo non è soggetto a CORS.


## Percorsi per "usarla ovunque"

| Modalità | Serve il PC acceso? | Note |
|---|---|---|
| Expo Go su LAN (attuale) | Sì | Solo nella rete di casa |
| APK nativo via EAS Build | No | Richiede account Expo; il player YouTube funziona offline-from-server |
| Web app ospitata | No | Richiede `react-native-web` + `react-dom` (non installati) e un proxy per la ricerca |
| Expo Snack | No | Limiti su librerie native e dimensioni |

## Licenza

Vedi `LICENSE`.

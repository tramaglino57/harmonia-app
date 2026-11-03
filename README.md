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
`https://www.youtube.com/results?search_query=...` e legge la variabile globale
`ytInitialData`, estraendo titolo, canale, durata e miniatura (max 15 risultati).

Due limiti noti e strutturali, non bug di distrazione:

1. **Dipende dall'HTML di YouTube.** Se YouTube cambia la variabile, o serve una pagina
   di consenso GDPR/cookie (tipico da IP Unione Europea), il parser non trova
   `ytInitialData` e la funzione **ritorna array vuoto in silenzio**: l'interfaccia mostra
   "nessun risultato" invece di un errore. È la causa più probabile di una ricerca "Debussy"
   senza esiti.
2. **Non funziona da browser.** Da una build web (react-native-web) lo stesso `fetch` viene
   bloccato dalla same-origin policy: YouTube non invia header `Access-Control-Allow-Origin`.
   Una versione web ospitata della ricerca richiede un piccolo backend proxy, non un sito statico.

## Percorsi per "usarla ovunque"

| Modalità | Serve il PC acceso? | Note |
|---|---|---|
| Expo Go su LAN (attuale) | Sì | Solo nella rete di casa |
| APK nativo via EAS Build | No | Richiede account Expo; il player YouTube funziona offline-from-server |
| Web app ospitata | No | Richiede `react-native-web` + `react-dom` (non installati) e un proxy per la ricerca |
| Expo Snack | No | Limiti su librerie native e dimensioni |

## Licenza

Vedi `LICENSE`.

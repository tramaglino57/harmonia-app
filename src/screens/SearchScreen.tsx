import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { WORKS, COMPOSERS } from '../data/classicalCatalog';
import { ClassicalWork, Composer } from '../types';
import { YouTubeAudioService, SearchResult, SearchFailure } from '../services/youtubeService';
import { useAudio } from '../context/AudioContext';

interface SearchScreenProps {
  onSelectWork: (work: ClassicalWork) => void;
  onOpenPlayer: () => void;
}

const POPULAR_TAGS = [
  'Verdi Traviata',
  'Puccini Tosca',
  'Bach Brandeburghesi',
  'Vivaldi Primavera',
  'Mozart Requiem',
  'Chopin Notturni',
  'Monteverdi Orfeo',
  'Canto Gregoriano',
];

const YT_FAILURE_TEXT: Record<SearchFailure, string> = {
  network: 'YouTube non ha risposto (rete lenta o connessione interrotta). Riprova.',
  http: 'YouTube ha rifiutato la richiesta con un errore del server. Riprova fra qualche secondo.',
  consent:
    'YouTube ha intercettato la ricerca con la finestra di consenso sui cookie, che non contiene risultati. Se accade sempre, vanno aggiornati i cookie del servizio di ricerca.',
  botcheck:
    'YouTube chiede una verifica "non sono un robot" e la app non può superarla. Aspetta qualche minuto e riprova.',
  'no-payload':
    'YouTube ha restituito una pagina senza dati di ricerca: ha probabilmente cambiato formato e il parser è obsoleto.',
  'no-results': 'Nessuna registrazione trovata per questa ricerca.',
};

export const SearchScreen: React.FC<SearchScreenProps> = ({
  onSelectWork,
  onOpenPlayer,
}) => {
  const { playTrack } = useAudio();
  const [query, setQuery] = useState('');
  const [isSearchingYouTube, setIsSearchingYouTube] = useState(false);
  const [ytResults, setYtResults] = useState<SearchResult[]>([]);
  const [ytFailure, setYtFailure] = useState<SearchFailure | null>(null);
  const [ytSearched, setYtSearched] = useState(false);

  // Filter local catalog
  const filteredWorks = query.trim()
    ? WORKS.filter((w) => {
        const comp = COMPOSERS.find((c) => c.id === w.composerId);
        const q = query.toLowerCase();
        return (
          w.title.toLowerCase().includes(q) ||
          w.catalogNumber.toLowerCase().includes(q) ||
          w.era.toLowerCase().includes(q) ||
          w.genre.toLowerCase().includes(q) ||
          comp?.name.toLowerCase().includes(q) ||
          comp?.fullName.toLowerCase().includes(q)
        );
      })
    : [];

  const handleSearchYouTube = async () => {
    if (!query.trim()) return;
    setIsSearchingYouTube(true);
    setYtResults([]);
    setYtFailure(null);
    try {
      const outcome = await YouTubeAudioService.searchClassical(query);
      setYtResults(outcome.results);
      setYtFailure(outcome.results.length === 0 ? outcome.failure || 'no-results' : null);
    } catch (e) {
      console.warn('Errore ricerca YouTube:', e);
      setYtFailure('network');
    } finally {
      setYtSearched(true);
      setIsSearchingYouTube(false);
    }
  };

  const handlePlayYouTubeResult = (res: SearchResult) => {
    // Wrap youtube result into an impromptu ClassicalWork structure
    const customWork: ClassicalWork = {
      id: `yt-${res.videoId}`,
      composerId: 'external',
      title: res.title,
      catalogNumber: 'Registrazione YouTube',
      era: 'classicismo',
      genre: 'sinfonica',
      yearComposed: 'Classica',
      coverImage:
        res.thumbnailUrl ||
        'https://images.unsplash.com/photo-1507838153414-b4b713384a76?q=80&w=800&auto=format&fit=crop',
      description: `Registrazione caricata da ${res.uploaderName}.`,
      movements: [
        {
          id: `mov-${res.videoId}`,
          index: 1,
          title: res.title,
          tempo: 'Registrazione integrale',
          durationApprox: res.durationString,
          youtubeVideoId: res.videoId,
        },
      ],
      interpretations: [
        {
          id: `interp-${res.videoId}`,
          label: res.uploaderName,
          performer: res.uploaderName,
          youtubeVideoId: res.videoId,
        },
      ],
    };

    playTrack(customWork, 0);
    onOpenPlayer();
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {/* Search Input Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color={Colors.gold} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cerca opera, compositore, opus..."
          placeholderTextColor={Colors.textMuted}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          onSubmitEditing={handleSearchYouTube}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); setYtResults([]); }}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Suggested Classical Tags */}
      {!query && (
        <View style={styles.tagsSection}>
          <Text style={styles.sectionTitle}>Ricerche Consigliate</Text>
          <View style={styles.tagsGrid}>
            {POPULAR_TAGS.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={styles.tag}
                onPress={() => {
                  setQuery(tag);
                }}
              >
                <Ionicons name="musical-notes-outline" size={12} color={Colors.gold} />
                <Text style={styles.tagText}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Catalog Results */}
      {query.length > 0 && (
        <View style={styles.resultsSection}>
          <Text style={styles.sectionTitle}>
            Nel Catalogo Curato ({filteredWorks.length})
          </Text>

          {filteredWorks.map((work) => {
            const comp = COMPOSERS.find((c) => c.id === work.composerId);
            return (
              <TouchableOpacity
                key={work.id}
                style={styles.resultCard}
                onPress={() => onSelectWork(work)}
              >
                <Image source={{ uri: work.coverImage }} style={styles.resultImage} />
                <View style={styles.resultContent}>
                  <Text style={styles.resultCatalog}>{work.catalogNumber}</Text>
                  <Text style={styles.resultTitle} numberOfLines={1}>
                    {work.title}
                  </Text>
                  <Text style={styles.resultComposer}>
                    {comp?.name} · {work.movements.length} movimenti
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            );
          })}

          {filteredWorks.length === 0 && (
            <Text style={styles.emptyText}>
              Nessuna opera nel catalogo interno con questo titolo. Prova con la ricerca globale su YouTube qui sotto!
            </Text>
          )}

          {/* YouTube Global Search Trigger */}
          <TouchableOpacity
            style={styles.ytSearchBtn}
            onPress={handleSearchYouTube}
            activeOpacity={0.8}
          >
            {isSearchingYouTube ? (
              <ActivityIndicator size="small" color="#0C0C12" />
            ) : (
              <>
                <Ionicons name="logo-youtube" size={18} color="#0C0C12" />
                <Text style={styles.ytSearchBtnText}>
                  Cerca "{query}" su YouTube (Solo Audio)
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* YouTube Live Stream Search Results */}
      {ytResults.length > 0 && (
        <View style={styles.ytResultsSection}>
          <Text style={styles.sectionTitle}>Registrazioni Trovate su YouTube</Text>
          <Text style={styles.sectionSubtitle}>
            Tocca per avviare lo streaming audio in background:
          </Text>

          {ytResults.map((item) => (
            <TouchableOpacity
              key={item.videoId}
              style={styles.ytCard}
              onPress={() => handlePlayYouTubeResult(item)}
            >
              <Image source={{ uri: item.thumbnailUrl }} style={styles.ytThumb} />
              <View style={styles.ytContent}>
                <Text style={styles.ytTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.ytUploader} numberOfLines={1}>
                  {item.uploaderName}
                </Text>
                <View style={styles.ytFooter}>
                  <Text style={styles.ytDuration}>{item.durationString || 'Live / n.d.'}</Text>
                  <View style={styles.audioBadge}>
                    <Text style={styles.audioBadgeText}>Flusso Audio</Text>
                  </View>
                </View>
              </View>
              <Ionicons name="play-circle" size={28} color={Colors.gold} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* YouTube search ran but produced nothing: say WHY instead of showing silence */}
      {ytSearched && !isSearchingYouTube && ytResults.length === 0 && (
        <View style={styles.ytEmptyBox}>
          <Ionicons name="alert-circle-outline" size={20} color={Colors.gold} />
          <Text style={styles.ytEmptyText}>
            {Platform.OS === 'web'
              ? 'La ricerca YouTube da browser è bloccata dalla same-origin policy: youtube.com non invia header CORS. Usa la app su Android/iOS, oppure aggiungi un backend proxy.'
              : ytFailure
                ? YT_FAILURE_TEXT[ytFailure]
                : 'La ricerca non ha prodotto risultati.'}
          </Text>
          <TouchableOpacity style={styles.ytRetryBtn} onPress={handleSearchYouTube}>
            <Ionicons name="refresh" size={15} color="#0C0C12" />
            <Text style={styles.ytRetryText}>Riprova</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 90,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  tagsSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: 'serif',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 12,
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  tagText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  resultsSection: {
    marginTop: 20,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  resultImage: {
    width: 48,
    height: 48,
    borderRadius: 6,
  },
  resultContent: {
    flex: 1,
    marginLeft: 12,
  },
  resultCatalog: {
    fontSize: 10,
    color: Colors.gold,
    fontWeight: '800',
  },
  resultTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  resultComposer: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  emptyText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginVertical: 10,
    lineHeight: 18,
  },
  ytSearchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.gold,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  ytSearchBtnText: {
    color: '#0C0C12',
    fontWeight: '800',
    fontSize: 13,
  },
  ytResultsSection: {
    marginTop: 24,
  },
  ytCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  ytThumb: {
    width: 60,
    height: 45,
    borderRadius: 6,
    backgroundColor: Colors.surfaceVariant,
  },
  ytContent: {
    flex: 1,
    marginHorizontal: 12,
  },
  ytTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  ytUploader: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  ytFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  ytDuration: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  audioBadge: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  audioBadgeText: {
    fontSize: 9,
    color: Colors.gold,
    fontWeight: '700',
  },
  ytEmptyBox: {
    marginTop: 16,
    padding: 16,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: 10,
  },
  ytEmptyText: {
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
  },
  ytRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: Colors.gold,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
  },
  ytRetryText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0C0C12',
  },
});

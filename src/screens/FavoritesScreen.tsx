import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { WORKS, COMPOSERS } from '../data/classicalCatalog';
import { ClassicalWork } from '../types';
import { useAudio } from '../context/AudioContext';

interface FavoritesScreenProps {
  onSelectWork: (work: ClassicalWork) => void;
  onOpenPlayer: () => void;
}

export const FavoritesScreen: React.FC<FavoritesScreenProps> = ({
  onSelectWork,
  onOpenPlayer,
}) => {
  const { favorites, playTrack } = useAudio();

  const favoriteWorks = WORKS.filter((w) => favorites.includes(w.id));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Le Tue Opere Preferite</Text>
        <Text style={styles.subtitle}>
          {favoriteWorks.length} composizioni salvate nella tua biblioteca
        </Text>
      </View>

      {favoriteWorks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-dislike-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Nessuna opera nei preferiti</Text>
          <Text style={styles.emptyDesc}>
            Tocca l'icona del cuore in qualsiasi brano o opera per averla sempre a portata di mano.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {favoriteWorks.map((work) => {
            const comp = COMPOSERS.find((c) => c.id === work.composerId);
            return (
              <TouchableOpacity
                key={work.id}
                style={styles.card}
                onPress={() => onSelectWork(work)}
                activeOpacity={0.8}
              >
                <Image source={{ uri: work.coverImage }} style={styles.cover} />
                <View style={styles.cardContent}>
                  <Text style={styles.catalog}>{work.catalogNumber}</Text>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {work.title}
                  </Text>
                  <Text style={styles.composer}>{comp?.name}</Text>
                  <Text style={styles.movementsCount}>
                    {work.movements.length} movimenti
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.playBtn}
                  onPress={() => {
                    playTrack(work, 0);
                    onOpenPlayer();
                  }}
                >
                  <Ionicons name="play" size={16} color="#0C0C12" />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Classical Quote Card */}
      <View style={styles.quoteCard}>
        <Ionicons name="chatbubble-ellipses-outline" size={20} color={Colors.gold} />
        <Text style={styles.quoteText}>
          «La musica è una rivelazione più profonda di ogni saggezza e filosofia.»
        </Text>
        <Text style={styles.quoteAuthor}>— Ludwig van Beethoven</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 90,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: 'serif',
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 12,
  },
  emptyDesc: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  list: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  cover: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  cardContent: {
    flex: 1,
    marginLeft: 14,
  },
  catalog: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.gold,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'serif',
    marginTop: 2,
  },
  composer: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  movementsCount: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quoteCard: {
    marginTop: 30,
    backgroundColor: Colors.surface,
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.gold,
    alignItems: 'center',
  },
  quoteText: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 8,
  },
  quoteAuthor: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.gold,
    marginTop: 8,
  },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { COMPOSERS, WORKS } from '../data/classicalCatalog';
import { ClassicalWork, Composer } from '../types';
import { useAudio } from '../context/AudioContext';

const { width } = Dimensions.get('window');

interface HomeScreenProps {
  onSelectWork: (work: ClassicalWork) => void;
  onSelectComposer: (composer: Composer) => void;
  onOpenPlayer: () => void;
}

const FILTER_PILLS = [
  { id: 'all', label: 'Tutte' },
  { id: 'lirica', label: 'Opera Lirica' },
  { id: 'cameristica', label: 'Musica da Camera' },
  { id: 'antica', label: 'Musica Antica' },
  { id: 'barocco', label: 'Barocco' },
  { id: 'classicismo', label: 'Classicismo' },
  { id: 'romanticismo', label: 'Romanticismo' },
];

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onSelectWork,
  onSelectComposer,
  onOpenPlayer,
}) => {
  const { playTrack, currentTrack } = useAudio();
  const [selectedFilter, setSelectedFilter] = useState('all');

  const featuredWork = WORKS[0]; // Vivaldi La Primavera or Verdi Traviata

  const filteredWorks = WORKS.filter((w) => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'lirica') return w.genre === 'lirica';
    if (selectedFilter === 'cameristica') return w.genre === 'cameristica';
    if (selectedFilter === 'antica') return w.era === 'antica' || w.genre === 'antica';
    if (selectedFilter === 'barocco') return w.era === 'barocco';
    if (selectedFilter === 'classicismo') return w.era === 'classicismo';
    if (selectedFilter === 'romanticismo') return w.era === 'romanticismo';
    return true;
  });

  const handlePlayFeatured = () => {
    playTrack(featuredWork, 0);
    onOpenPlayer();
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
      {/* Featured Hero Banner */}
      <View style={styles.featuredContainer}>
        <Image source={{ uri: featuredWork.coverImage }} style={styles.featuredImage} />
        <View style={styles.featuredOverlay} />
        <View style={styles.featuredBadge}>
          <Text style={styles.featuredBadgeText}>OPERA DEL GIORNO</Text>
        </View>

        <View style={styles.featuredContent}>
          <Text style={styles.featuredCatalog}>{featuredWork.catalogNumber}</Text>
          <Text style={styles.featuredTitle}>{featuredWork.title}</Text>
          <Text style={styles.featuredSub}>{featuredWork.subtitle}</Text>

          <View style={styles.featuredActions}>
            <TouchableOpacity
              style={styles.featuredPlayBtn}
              onPress={handlePlayFeatured}
              activeOpacity={0.8}
            >
              <Ionicons name="play" size={18} color="#0D0D12" />
              <Text style={styles.featuredPlayText}>Riproduci</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.featuredDetailsBtn}
              onPress={() => onSelectWork(featuredWork)}
            >
              <Text style={styles.featuredDetailsText}>Dettagli</Text>
              <Ionicons name="chevron-forward" size={14} color={Colors.gold} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Filter Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillsContainer}
      >
        {FILTER_PILLS.map((pill) => {
          const isSelected = selectedFilter === pill.id;
          return (
            <TouchableOpacity
              key={pill.id}
              style={[styles.pill, isSelected && styles.pillActive]}
              onPress={() => setSelectedFilter(pill.id)}
            >
              <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
                {pill.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Composers Carousel */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>I Grandi Maestri</Text>
          <Text style={styles.sectionSubtitle}>Compositori che hanno fatto la storia</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.composersScroll}
      >
        {COMPOSERS.map((composer) => (
          <TouchableOpacity
            key={composer.id}
            style={styles.composerCard}
            onPress={() => onSelectComposer(composer)}
            activeOpacity={0.7}
          >
            <View style={styles.composerAvatarContainer}>
              <Image source={{ uri: composer.portrait }} style={styles.composerAvatar} />
              <View style={styles.composerEraBadge}>
                <Text style={styles.composerEraText}>{composer.era.slice(0, 3).toUpperCase()}</Text>
              </View>
            </View>
            <Text style={styles.composerName} numberOfLines={1}>
              {composer.name}
            </Text>
            <Text style={styles.composerYears}>{composer.years.split('–')[0].trim()}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Works List */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Capolavori Curati</Text>
          <Text style={styles.sectionSubtitle}>
            {filteredWorks.length} composizioni con esecuzioni storiche
          </Text>
        </View>
      </View>

      <View style={styles.worksGrid}>
        {filteredWorks.map((work) => {
          const comp = COMPOSERS.find((c) => c.id === work.composerId);
          const isCurrent = currentTrack?.work.id === work.id;

          return (
            <TouchableOpacity
              key={work.id}
              style={[styles.workCard, isCurrent && styles.workCardPlaying]}
              onPress={() => onSelectWork(work)}
              activeOpacity={0.8}
            >
              <Image source={{ uri: work.coverImage }} style={styles.workCardImage} />

              <View style={styles.workCardContent}>
                <View style={styles.workCardBadgeRow}>
                  <Text style={styles.workCardCatalog}>{work.catalogNumber}</Text>
                  <Text style={styles.workCardEra}>{work.era.toUpperCase()}</Text>
                </View>

                <Text style={styles.workCardTitle} numberOfLines={2}>
                  {work.title}
                </Text>

                <Text style={styles.workCardComposer} numberOfLines={1}>
                  {comp?.name || 'Compositore'}
                </Text>

                <View style={styles.workCardFooter}>
                  <Text style={styles.workCardMovCount}>
                    {work.movements.length} movimenti · {work.interpretations.length} esecuzioni
                  </Text>
                  <TouchableOpacity
                    style={styles.quickPlayBtn}
                    onPress={() => {
                      playTrack(work, 0);
                      onOpenPlayer();
                    }}
                  >
                    <Ionicons
                      name={isCurrent ? 'volume-high' : 'play'}
                      size={14}
                      color="#0D0D12"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 90,
  },
  featuredContainer: {
    marginHorizontal: 20,
    marginTop: 8,
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: Colors.goldDark,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(12, 12, 18, 0.7)',
  },
  featuredBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: Colors.gold,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  featuredBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0D0D12',
    letterSpacing: 1,
  },
  featuredContent: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  featuredCatalog: {
    fontSize: 11,
    color: Colors.goldLight,
    fontWeight: '700',
  },
  featuredTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: 'serif',
    marginTop: 2,
  },
  featuredSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  featuredActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
  featuredPlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.gold,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
  },
  featuredPlayText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0D0D12',
  },
  featuredDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featuredDetailsText: {
    fontSize: 12,
    color: Colors.gold,
    fontWeight: '600',
  },
  pillsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  pill: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  pillActive: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  pillText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#0D0D12',
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: 'serif',
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  composersScroll: {
    paddingHorizontal: 20,
    gap: 16,
    paddingBottom: 8,
  },
  composerCard: {
    alignItems: 'center',
    width: 80,
  },
  composerAvatarContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1.5,
    borderColor: Colors.goldDark,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Colors.surface,
  },
  composerAvatar: {
    width: '100%',
    height: '100%',
  },
  composerEraBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(12, 12, 18, 0.85)',
    alignItems: 'center',
    paddingVertical: 1,
  },
  composerEraText: {
    fontSize: 8,
    fontWeight: '800',
    color: Colors.goldLight,
  },
  composerName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 6,
    textAlign: 'center',
  },
  composerYears: {
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  worksGrid: {
    paddingHorizontal: 20,
    gap: 12,
  },
  workCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  workCardPlaying: {
    borderColor: Colors.gold,
  },
  workCardImage: {
    width: 100,
    height: 100,
  },
  workCardContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  workCardBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  workCardCatalog: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.gold,
  },
  workCardEra: {
    fontSize: 9,
    color: Colors.textMuted,
  },
  workCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontFamily: 'serif',
    marginTop: 2,
  },
  workCardComposer: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  workCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  workCardMovCount: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  quickPlayBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

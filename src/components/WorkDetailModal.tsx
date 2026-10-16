import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { ClassicalWork, Movement } from '../types';
import { COMPOSERS } from '../data/classicalCatalog';
import { useAudio } from '../context/AudioContext';

const { width } = Dimensions.get('window');

interface WorkDetailModalProps {
  work: ClassicalWork | null;
  visible: boolean;
  onClose: () => void;
  onOpenPlayer: () => void;
}

export const WorkDetailModal: React.FC<WorkDetailModalProps> = ({
  work,
  visible,
  onClose,
  onOpenPlayer,
}) => {
  const { currentTrack, playTrack, isFavorite, toggleFavorite } = useAudio();
  const [selectedInterpId, setSelectedInterpId] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'movimenti' | 'esecuzioni' | 'libretto'>('movimenti');

  if (!work) return null;

  const composer = COMPOSERS.find((c) => c.id === work.composerId);
  const currentInterp =
    work.interpretations.find((i) => i.id === selectedInterpId) || work.interpretations[0];

  const handlePlayMovement = (movementIndex: number) => {
    playTrack(work, movementIndex, currentInterp.id);
    onOpenPlayer();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Top Header Buttons */}
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => toggleFavorite(work.id)}
              style={styles.iconBtn}
            >
              <Ionicons
                name={isFavorite(work.id) ? 'heart' : 'heart-outline'}
                size={22}
                color={isFavorite(work.id) ? Colors.gold : Colors.textPrimary}
              />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Hero Banner */}
          <View style={styles.heroContainer}>
            <Image source={{ uri: work.coverImage }} style={styles.heroImage} />
            <View style={styles.heroOverlay} />
            <View style={styles.heroContent}>
              <View style={styles.catalogBadge}>
                <Text style={styles.catalogBadgeText}>{work.catalogNumber}</Text>
              </View>
              <Text style={styles.title}>{work.title}</Text>
              {work.subtitle && <Text style={styles.subtitle}>{work.subtitle}</Text>}

              {composer && (
                <View style={styles.composerRow}>
                  <Image source={{ uri: composer.portrait }} style={styles.composerAvatar} />
                  <View>
                    <Text style={styles.composerName}>{composer.name}</Text>
                    <Text style={styles.eraYear}>
                      {work.era.toUpperCase()} · Composta nel {work.yearComposed}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Quick Play All Button */}
          <View style={styles.playBar}>
            <TouchableOpacity
              style={styles.playAllBtn}
              onPress={() => handlePlayMovement(0)}
              activeOpacity={0.8}
            >
              <Ionicons name="play" size={20} color="#0C0C12" />
              <Text style={styles.playAllBtnText}>Ascolta dal I Movimento</Text>
            </TouchableOpacity>

            <View style={styles.keyBadge}>
              <Text style={styles.keyText}>{work.key || 'Classica'}</Text>
            </View>
          </View>

          {/* Historical Description */}
          <View style={styles.descCard}>
            <Text style={styles.descTitle}>Guida all'Ascolto</Text>
            <Text style={styles.descText}>{work.description}</Text>
          </View>

          {/* Tabs: Movimenti vs Esecuzioni vs Libretto */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'movimenti' && styles.activeTabBtn]}
              onPress={() => setActiveTab('movimenti')}
            >
              <Text
                style={[styles.tabBtnText, activeTab === 'movimenti' && styles.activeTabText]}
              >
                Movimenti ({work.movements.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'esecuzioni' && styles.activeTabBtn]}
              onPress={() => setActiveTab('esecuzioni')}
            >
              <Text
                style={[styles.tabBtnText, activeTab === 'esecuzioni' && styles.activeTabText]}
              >
                Esecuzioni ({work.interpretations.length})
              </Text>
            </TouchableOpacity>

            {work.libretto && (
              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'libretto' && styles.activeTabBtn]}
                onPress={() => setActiveTab('libretto')}
              >
                <Text
                  style={[styles.tabBtnText, activeTab === 'libretto' && styles.activeTabText]}
                >
                  Libretto Lirico
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Tab 1: Movimenti */}
          {activeTab === 'movimenti' && (
            <View style={styles.movementsList}>
              {work.movements.map((mov, index) => {
                const isCurrent =
                  currentTrack?.work.id === work.id && currentTrack?.movement.id === mov.id;

                return (
                  <TouchableOpacity
                    key={mov.id}
                    style={[styles.movementItem, isCurrent && styles.movementItemActive]}
                    onPress={() => handlePlayMovement(index)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.movIndexBadge}>
                      <Text
                        style={[
                          styles.movIndexText,
                          isCurrent && { color: Colors.gold, fontWeight: '800' },
                        ]}
                      >
                        {mov.index}
                      </Text>
                    </View>

                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text
                        style={[
                          styles.movTitle,
                          isCurrent && { color: Colors.gold, fontWeight: '700' },
                        ]}
                      >
                        {mov.title}
                      </Text>
                      {mov.description && (
                        <Text style={styles.movDesc} numberOfLines={2}>
                          {mov.description}
                        </Text>
                      )}
                    </View>

                    <View style={styles.movRight}>
                      <Text style={styles.movDuration}>{mov.durationApprox}</Text>
                      <Ionicons
                        name={isCurrent ? 'volume-high' : 'play-circle-outline'}
                        size={22}
                        color={isCurrent ? Colors.gold : Colors.textSecondary}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Tab 2: Confronto Esecuzioni */}
          {activeTab === 'esecuzioni' && (
            <View style={styles.interpretationsList}>
              <Text style={styles.sectionSubtitle}>
                Seleziona la registrazione che preferisci per quest'opera:
              </Text>
              {work.interpretations.map((interp) => {
                const isSelected = interp.id === currentInterp.id;
                return (
                  <TouchableOpacity
                    key={interp.id}
                    style={[
                      styles.interpCard,
                      isSelected && styles.interpCardSelected,
                    ]}
                    onPress={() => setSelectedInterpId(interp.id)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.interpLabel,
                          isSelected && { color: Colors.gold },
                        ]}
                      >
                        {interp.label}
                      </Text>
                      <Text style={styles.interpPerformer}>
                        {interp.performer}
                      </Text>
                      {interp.conductor && (
                        <Text style={styles.interpDetails}>
                          Direzione d'orchestra: {interp.conductor}
                        </Text>
                      )}
                      {interp.year && (
                        <Text style={styles.interpYear}>Anno: {interp.year}</Text>
                      )}
                    </View>
                    <Ionicons
                      name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                      size={22}
                      color={isSelected ? Colors.gold : Colors.textMuted}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Tab 3: Libretto Lirico */}
          {activeTab === 'libretto' && work.libretto && (
            <View style={styles.librettoSection}>
              {work.libretto.map((v, i) => (
                <View key={i} style={styles.librettoCard}>
                  {v.context && <Text style={styles.librettoContext}>[{v.context}]</Text>}
                  <Text style={styles.librettoCharacter}>{v.character.toUpperCase()}</Text>
                  <Text style={styles.librettoVerse}>{v.verse}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerBar: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(12, 12, 18, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
  },
  scroll: {
    paddingBottom: 60,
  },
  heroContainer: {
    width: '100%',
    height: 340,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(12, 12, 18, 0.65)',
  },
  heroContent: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  catalogBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.gold,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 8,
  },
  catalogBadgeText: {
    color: '#0C0C12',
    fontSize: 11,
    fontWeight: '800',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: 'serif',
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 10,
  },
  composerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  composerName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.goldLight,
  },
  eraYear: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  playBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 18,
  },
  playAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.gold,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
  },
  playAllBtnText: {
    color: '#0C0C12',
    fontWeight: '700',
    fontSize: 14,
  },
  keyBadge: {
    backgroundColor: Colors.surface,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  keyText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  descCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    marginTop: 18,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.gold,
  },
  descTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.gold,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  descText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  tabsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  tabBtn: {
    paddingVertical: 10,
    marginRight: 20,
  },
  activeTabBtn: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.gold,
  },
  tabBtnText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  activeTabText: {
    color: Colors.gold,
    fontWeight: '700',
  },
  movementsList: {
    marginTop: 16,
    paddingHorizontal: 20,
  },
  movementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  movementItemActive: {
    borderColor: Colors.gold,
    backgroundColor: Colors.surfaceVariant,
  },
  movIndexBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  movIndexText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  movTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  movDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 3,
  },
  movRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  movDuration: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  interpretationsList: {
    marginTop: 16,
    paddingHorizontal: 20,
  },
  interpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  interpCardSelected: {
    borderColor: Colors.gold,
    backgroundColor: Colors.surfaceVariant,
  },
  interpLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  interpPerformer: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  interpDetails: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  interpYear: {
    fontSize: 11,
    color: Colors.goldDark,
    marginTop: 2,
  },
  librettoSection: {
    marginTop: 16,
    paddingHorizontal: 20,
  },
  librettoCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.gold,
  },
  librettoContext: {
    fontSize: 11,
    color: Colors.gold,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  librettoCharacter: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 1,
    marginBottom: 6,
  },
  librettoVerse: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
    fontFamily: 'serif',
  },
});

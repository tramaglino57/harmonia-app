import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Modal,
  BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import YoutubePlayer, { YoutubeIframeRef, PLAYER_STATES } from 'react-native-youtube-iframe';
import { Colors } from '../theme/colors';
import { useAudio } from '../context/AudioContext';

const { width } = Dimensions.get('window');

interface FullPlayerModalProps {
  visible: boolean;
  onClose: () => void;
}

export const FullPlayerModal: React.FC<FullPlayerModalProps> = ({ visible, onClose }) => {
  const {
    currentTrack,
    isPlaying,
    isBuffering,
    positionMillis,
    durationMillis,
    sleepTimerMinutes,
    togglePlayPause,
    setIsPlaying,
    seekTo,
    skipForward,
    skipBackward,
    nextMovement,
    previousMovement,
    switchInterpretation,
    setSleepTimer,
    toggleFavorite,
    isFavorite,
    updateProgress,
  } = useAudio();

  const ytRef = useRef<YoutubeIframeRef | null>(null);
  const [viewMode, setViewMode] = useState<'video' | 'cover'>('video');
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [showInterpretationModal, setShowInterpretationModal] = useState(false);
  const [showLibrettoModal, setShowLibrettoModal] = useState(false);
  const [showSleepTimerModal, setShowSleepTimerModal] = useState(false);

  // Handle hardware back press on Android to minimize player
  useEffect(() => {
    const onBackPress = () => {
      if (visible) {
        if (showInterpretationModal) {
          setShowInterpretationModal(false);
          return true;
        }
        if (showLibrettoModal) {
          setShowLibrettoModal(false);
          return true;
        }
        if (showSleepTimerModal) {
          setShowSleepTimerModal(false);
          return true;
        }
        onClose();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [visible, showInterpretationModal, showLibrettoModal, showSleepTimerModal, onClose]);

  // Periodic position poller when playing
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(async () => {
      try {
        if (ytRef.current) {
          const [time, dur] = await Promise.all([
            ytRef.current.getCurrentTime(),
            ytRef.current.getDuration(),
          ]);
          if (typeof time === 'number' && !isNaN(time)) {
            updateProgress(time, dur);
          }
        }
      } catch (e) {
        // Ignored
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, updateProgress]);

  if (!currentTrack) return null;

  const { work, movement, interpretation } = currentTrack;
  const videoId = movement.youtubeVideoId || interpretation.youtubeVideoId;
  const progress = durationMillis > 0 ? positionMillis / durationMillis : 0;

  const formatTime = (millis: number) => {
    if (!millis || millis < 0) return '0:00';
    const totalSecs = Math.floor(millis / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleStateChange = (state: string) => {
    if (state === PLAYER_STATES.ENDED) {
      nextMovement();
    } else if (state === PLAYER_STATES.PLAYING) {
      setIsPlaying(true);
      setPlayerError(null);
    } else if (state === PLAYER_STATES.PAUSED) {
      setIsPlaying(false);
    }
  };

  const handleProgressBarPress = (event: any) => {
    if (durationMillis <= 0) return;
    const { locationX } = event.nativeEvent;
    const barWidth = width - 48; // padding 24 each side
    const ratio = Math.max(0, Math.min(1, locationX / barWidth));
    const targetMillis = Math.floor(ratio * durationMillis);
    seekTo(targetMillis);
    ytRef.current?.seekTo(targetMillis / 1000, true);
  };

  const handleSkipForward = () => {
    const curSec = positionMillis / 1000;
    const maxSec = durationMillis > 0 ? durationMillis / 1000 : curSec + 15;
    const newSec = Math.min(curSec + 15, maxSec);
    seekTo(newSec * 1000);
    ytRef.current?.seekTo(newSec, true);
  };

  const handleSkipBackward = () => {
    const curSec = positionMillis / 1000;
    const newSec = Math.max(curSec - 15, 0);
    seekTo(newSec * 1000);
    ytRef.current?.seekTo(newSec, true);
  };

  const sleepOptions = [
    { label: 'Disattivato', value: null },
    { label: '15 minuti', value: 15 },
    { label: '30 minuti', value: 30 },
    { label: '45 minuti', value: 45 },
    { label: '60 minuti', value: 60 },
  ];

  return (
    <View
      style={[
        styles.container,
        !visible && styles.containerHidden,
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
          <Ionicons name="chevron-down" size={26} color={Colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.topTitleContainer}>
          <Text style={styles.headerLabel}>IN RIPRODUZIONE</Text>
          <Text style={styles.headerEra}>
            {work.era.toUpperCase()} · {work.genre.toUpperCase()}
          </Text>
        </View>

        <View style={styles.topRightBtns}>
          <TouchableOpacity
            onPress={() => setShowSleepTimerModal(true)}
            style={[
              styles.iconBtn,
              sleepTimerMinutes !== null && styles.activeTimerBtn,
            ]}
          >
            <Ionicons
              name="moon-outline"
              size={20}
              color={sleepTimerMinutes !== null ? Colors.gold : Colors.textSecondary}
            />
            {sleepTimerMinutes !== null && (
              <Text style={styles.timerBadge}>{sleepTimerMinutes}m</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => toggleFavorite(work.id)}
            style={styles.iconBtn}
          >
            <Ionicons
              name={isFavorite(work.id) ? 'heart' : 'heart-outline'}
              size={22}
              color={isFavorite(work.id) ? Colors.gold : Colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Toggle Mode: Video vs Copertina */}
        <View style={styles.viewModeToggle}>
          <TouchableOpacity
            style={[styles.modeTab, viewMode === 'video' && styles.modeTabActive]}
            onPress={() => setViewMode('video')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="videocam"
              size={14}
              color={viewMode === 'video' ? '#0C0C12' : Colors.gold}
            />
            <Text
              style={[
                styles.modeTabText,
                viewMode === 'video' && styles.modeTabTextActive,
              ]}
            >
              Video YouTube
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeTab, viewMode === 'cover' && styles.modeTabActive]}
            onPress={() => setViewMode('cover')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="image"
              size={14}
              color={viewMode === 'cover' ? '#0C0C12' : Colors.gold}
            />
            <Text
              style={[
                styles.modeTabText,
                viewMode === 'cover' && styles.modeTabTextActive,
              ]}
            >
              Copertina
            </Text>
          </TouchableOpacity>
        </View>

        {/* Video Player Display */}
        <View style={viewMode === 'video' ? styles.videoBox : styles.videoBoxHidden}>
          <YoutubePlayer
            ref={ytRef}
            height={viewMode === 'video' ? 220 : 1}
            width={viewMode === 'video' ? width - 40 : 1}
            play={isPlaying}
            videoId={videoId}
            onChangeState={handleStateChange}
            forceAndroidAutoplay={true}
            initialPlayerParams={{
              controls: true,
              rel: false,
              preventFullScreen: false,
              showClosedCaptions: false,
            }}
            onError={(err: any) => {
              console.warn('YouTube Error:', err);
              setPlayerError(String(err));
            }}
          />
        </View>

        {/* Cover Art Artwork Frame (shown when in Cover mode) */}
        {viewMode === 'cover' && (
          <View style={styles.artworkContainer}>
            <Image source={{ uri: work.coverImage }} style={styles.artwork} />
            <View style={styles.artworkOverlayBadge}>
              <Text style={styles.catalogBadgeText}>{work.catalogNumber}</Text>
            </View>
          </View>
        )}

        {/* Notice if video error */}
        {playerError && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color="#FF6B6B" />
            <Text style={styles.errorBannerText}>
              Video momentaneamente non disponibile. Prova a selezionare un'altra esecuzione qui sotto.
            </Text>
          </View>
        )}

        {/* Track Details */}
        <View style={styles.trackDetails}>
          <Text style={styles.workTitle}>{work.title}</Text>
          <Text style={styles.movementTitle}>{movement.title}</Text>
          {movement.tempo && (
            <Text style={styles.tempoText}>Tempo: {movement.tempo}</Text>
          )}
        </View>

        {/* Interpretation Switcher Pill */}
        <TouchableOpacity
          style={styles.interpretationCard}
          onPress={() => setShowInterpretationModal(true)}
          activeOpacity={0.8}
        >
          <View style={styles.interpretationInfo}>
            <View style={styles.interpretationHeaderRow}>
              <Ionicons name="disc-outline" size={16} color={Colors.gold} />
              <Text style={styles.interpretationLabel}>Esecuzione Attiva</Text>
            </View>
            <Text style={styles.performerText} numberOfLines={1}>
              {interpretation.label}
            </Text>
            {interpretation.year && (
              <Text style={styles.yearText}>Anno/Versione: {interpretation.year}</Text>
            )}
          </View>
          <View style={styles.changeBadge}>
            <Text style={styles.changeBadgeText}>Confronta</Text>
            <Ionicons name="swap-horizontal" size={14} color={Colors.gold} />
          </View>
        </TouchableOpacity>

        {/* Opera Libretto Action Button (if applicable) */}
        {work.libretto && work.libretto.length > 0 && (
          <TouchableOpacity
            style={styles.librettoBtn}
            onPress={() => setShowLibrettoModal(true)}
          >
            <Ionicons name="book-outline" size={18} color={Colors.gold} />
            <Text style={styles.librettoBtnText}>Leggi Libretto d'Opera</Text>
          </TouchableOpacity>
        )}

        {/* Progress Slider */}
        <View style={styles.sliderContainer}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={handleProgressBarPress}
            style={styles.progressBarWrapper}
          >
            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.min(progress * 100, 100)}%` },
                ]}
              />
            </View>
          </TouchableOpacity>

          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatTime(positionMillis)}</Text>
            <Text style={styles.timeText}>
              {durationMillis > 0
                ? formatTime(durationMillis)
                : movement.durationApprox}
            </Text>
          </View>
        </View>

        {/* Transport Controls */}
        <View style={styles.controlsRow}>
          <TouchableOpacity
            onPress={previousMovement}
            style={styles.secondaryControl}
          >
            <Ionicons name="play-skip-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSkipBackward}
            style={styles.secondaryControl}
          >
            <Ionicons name="refresh" size={22} color={Colors.textSecondary} />
            <Text style={styles.skipSecText}>-15s</Text>
          </TouchableOpacity>

          {/* Main Play/Pause Button */}
          <TouchableOpacity
            onPress={togglePlayPause}
            style={styles.playPauseBtn}
            activeOpacity={0.8}
          >
            {isBuffering ? (
              <ActivityIndicator size="large" color="#0D0D12" />
            ) : (
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={32}
                color="#0D0D12"
                style={{ marginLeft: isPlaying ? 0 : 3 }}
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSkipForward}
            style={styles.secondaryControl}
          >
            <Ionicons name="refresh" size={22} color={Colors.textSecondary} />
            <Text style={styles.skipSecText}>+15s</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={nextMovement}
            style={styles.secondaryControl}
          >
            <Ionicons name="play-skip-forward" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Stream Quality Footer */}
        <View style={styles.streamInfoCard}>
          <Ionicons name="musical-notes-outline" size={14} color={Colors.gold} />
          <Text style={styles.streamInfoText}>
            Harmonia YouTube Engine · Audio & Video HD Integrato
          </Text>
        </View>
      </ScrollView>

      {/* SubModal: Confronto Esecuzioni */}
      <Modal
        visible={showInterpretationModal}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.subModalOverlay}>
          <View style={styles.subModalContent}>
            <View style={styles.subModalHeader}>
              <Text style={styles.subModalTitle}>Confronto Esecuzioni</Text>
              <TouchableOpacity
                onPress={() => setShowInterpretationModal(false)}
              >
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.subModalDesc}>
              Scegli l'interpretazione che preferisci per quest'opera:
            </Text>

            {work.interpretations.map((interp) => {
              const isSelected = interp.id === interpretation.id;
              return (
                <TouchableOpacity
                  key={interp.id}
                  style={[
                    styles.interpretationItem,
                    isSelected && styles.interpretationItemSelected,
                  ]}
                  onPress={() => {
                    switchInterpretation(interp.id);
                    setShowInterpretationModal(false);
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.interpItemLabel,
                        isSelected && { color: Colors.gold },
                      ]}
                    >
                      {interp.label}
                    </Text>
                    <Text style={styles.interpItemSub}>
                      {interp.performer}{' '}
                      {interp.conductor ? `· Dir. ${interp.conductor}` : ''}
                    </Text>
                  </View>
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={Colors.gold}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* SubModal: Sleep Timer */}
      <Modal visible={showSleepTimerModal} animationType="fade" transparent={true}>
        <View style={styles.subModalOverlay}>
          <View style={styles.subModalContent}>
            <View style={styles.subModalHeader}>
              <Text style={styles.subModalTitle}>Timer Spegnimento Serale</Text>
              <TouchableOpacity onPress={() => setShowSleepTimerModal(false)}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.subModalDesc}>
              La musica si fermerà automaticamente per accompagnarti al riposo:
            </Text>

            {sleepOptions.map((opt) => (
              <TouchableOpacity
                key={opt.label}
                style={[
                  styles.interpretationItem,
                  sleepTimerMinutes === opt.value && styles.interpretationItemSelected,
                ]}
                onPress={() => {
                  setSleepTimer(opt.value);
                  setShowSleepTimerModal(false);
                }}
              >
                <Text
                  style={[
                    styles.interpItemLabel,
                    sleepTimerMinutes === opt.value && { color: Colors.gold },
                  ]}
                >
                  {opt.label}
                </Text>
                {sleepTimerMinutes === opt.value && (
                  <Ionicons name="checkmark-circle" size={20} color={Colors.gold} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* SubModal: Libretto d'Opera */}
      <Modal visible={showLibrettoModal} animationType="slide" transparent={false}>
        <View style={styles.librettoContainer}>
          <View style={styles.librettoHeader}>
            <View>
              <Text style={styles.librettoHeaderTitle}>Libretto d'Opera</Text>
              <Text style={styles.librettoHeaderSub}>{work.title}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowLibrettoModal(false)}
              style={styles.iconBtn}
            >
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.librettoScroll}>
            {work.libretto?.map((item, idx) => (
              <View key={idx} style={styles.verseBox}>
                {item.context && (
                  <Text style={styles.verseContext}>[{item.context}]</Text>
                )}
                <Text style={styles.verseCharacter}>{item.character.toUpperCase()}</Text>
                <Text style={styles.verseText}>{item.verse}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 20,
    backgroundColor: Colors.background,
  },
  containerHidden: {
    top: -10000,
    left: 0,
    width: width,
    height: 300,
    opacity: 0.01,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  activeTimerBtn: {
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  timerBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.gold,
    color: '#0D0D12',
    fontSize: 9,
    fontWeight: '800',
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  topTitleContainer: {
    alignItems: 'center',
  },
  headerLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: Colors.gold,
    fontWeight: '700',
  },
  headerEra: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  topRightBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  viewModeToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 3,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  modeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  modeTabActive: {
    backgroundColor: Colors.gold,
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.gold,
  },
  modeTabTextActive: {
    color: '#0C0C12',
  },
  videoBox: {
    width: width - 40,
    height: 220,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 1.5,
    borderColor: Colors.goldDark,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  videoBoxHidden: {
    width: 1,
    height: 1,
    opacity: 0.01,
    overflow: 'hidden',
  },
  artworkContainer: {
    width: width - 80,
    height: width - 80,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.goldDark,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  artwork: {
    width: '100%',
    height: '100%',
  },
  artworkOverlayBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(12, 12, 18, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: Colors.gold,
  },
  catalogBadgeText: {
    color: Colors.goldLight,
    fontSize: 11,
    fontWeight: '700',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 10,
    width: '100%',
  },
  errorBannerText: {
    flex: 1,
    fontSize: 11,
    color: '#FF6B6B',
  },
  trackDetails: {
    width: '100%',
    marginTop: 18,
    alignItems: 'flex-start',
  },
  workTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: 'serif',
    letterSpacing: 0.5,
  },
  movementTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.gold,
    marginTop: 6,
  },
  tempoText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  interpretationCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  interpretationInfo: {
    flex: 1,
  },
  interpretationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  interpretationLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    color: Colors.gold,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  performerText: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginTop: 3,
  },
  yearText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.goldDark,
  },
  changeBadgeText: {
    fontSize: 11,
    color: Colors.gold,
    fontWeight: '700',
  },
  librettoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    marginTop: 14,
    borderWidth: 1,
    borderColor: Colors.goldDark,
  },
  librettoBtnText: {
    color: Colors.goldLight,
    fontSize: 13,
    fontWeight: '700',
  },
  sliderContainer: {
    width: '100%',
    marginTop: 20,
  },
  progressBarWrapper: {
    paddingVertical: 8,
  },
  progressBarBackground: {
    height: 5,
    backgroundColor: Colors.sliderTrack,
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.gold,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timeText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginTop: 12,
  },
  secondaryControl: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
  },
  skipSecText: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: '700',
    marginTop: -2,
  },
  playPauseBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  streamInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 22,
  },
  streamInfoText: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  subModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  subModalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  subModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  subModalDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginVertical: 12,
  },
  interpretationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 4,
    backgroundColor: Colors.surfaceVariant,
  },
  interpretationItemSelected: {
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  interpItemLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  interpItemSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  librettoContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: 48,
    paddingHorizontal: 20,
  },
  librettoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  librettoHeaderTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.gold,
    fontFamily: 'serif',
  },
  librettoHeaderSub: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  librettoScroll: {
    flex: 1,
    paddingTop: 16,
  },
  verseBox: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: Colors.gold,
  },
  verseContext: {
    fontSize: 11,
    color: Colors.gold,
    fontStyle: 'italic',
    marginBottom: 6,
  },
  verseCharacter: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 1,
    marginBottom: 6,
  },
  verseText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
    fontFamily: 'serif',
  },
});

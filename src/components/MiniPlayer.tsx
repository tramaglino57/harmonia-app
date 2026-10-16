import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { useAudio } from '../context/AudioContext';

interface MiniPlayerProps {
  onPress: () => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({ onPress }) => {
  const {
    currentTrack,
    isPlaying,
    isBuffering,
    positionMillis,
    durationMillis,
    togglePlayPause,
    nextMovement,
  } = useAudio();

  if (!currentTrack) return null;

  const progress = durationMillis > 0 ? (positionMillis / durationMillis) * 100 : 0;

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.9}
      onPress={onPress}
    >
      {/* Progress line */}
      <View style={styles.progressBarBackground}>
        <View style={[styles.progressBarFill, { width: `${Math.min(progress, 100)}%` }]} />
      </View>

      <View style={styles.content}>
        <Image
          source={{ uri: currentTrack.work.coverImage }}
          style={styles.coverImage}
        />

        <View style={styles.infoContainer}>
          <Text style={styles.movementTitle} numberOfLines={1}>
            {currentTrack.movement.title}
          </Text>
          <Text style={styles.workTitle} numberOfLines={1}>
            {currentTrack.work.title} · {currentTrack.interpretation.performer}
          </Text>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.controlBtn}
            onPress={togglePlayPause}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {isBuffering ? (
              <ActivityIndicator size="small" color={Colors.gold} />
            ) : (
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={22}
                color={Colors.gold}
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlBtn}
            onPress={nextMovement}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="play-skip-forward" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  progressBarBackground: {
    height: 3,
    backgroundColor: Colors.surfaceVariant,
    width: '100%',
  },
  progressBarFill: {
    height: 3,
    backgroundColor: Colors.gold,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  coverImage: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: Colors.surfaceVariant,
    borderWidth: 1,
    borderColor: Colors.goldDark,
  },
  infoContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  movementTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  workTitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  controlBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

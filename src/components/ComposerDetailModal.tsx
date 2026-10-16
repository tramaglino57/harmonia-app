import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { Composer, ClassicalWork } from '../types';
import { WORKS } from '../data/classicalCatalog';

interface ComposerDetailModalProps {
  composer: Composer | null;
  visible: boolean;
  onClose: () => void;
  onSelectWork: (work: ClassicalWork) => void;
}

export const ComposerDetailModal: React.FC<ComposerDetailModalProps> = ({
  composer,
  visible,
  onClose,
  onSelectWork,
}) => {
  if (!composer) return null;

  const composerWorks = WORKS.filter((w) => w.composerId === composer.id);

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Biografia Compositore</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Portrait & Info */}
          <View style={styles.profileSection}>
            <View style={styles.portraitFrame}>
              <Image source={{ uri: composer.portrait }} style={styles.portrait} />
            </View>

            <Text style={styles.name}>{composer.fullName}</Text>
            <Text style={styles.years}>{composer.years}</Text>

            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{composer.era.toUpperCase()}</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{composer.country}</Text>
              </View>
            </View>
          </View>

          {/* Biography Card */}
          <View style={styles.bioCard}>
            <Text style={styles.bioTitle}>Profilo Storico ed Estetico</Text>
            <Text style={styles.bioText}>{composer.bio}</Text>
          </View>

          {/* Works by this Composer */}
          <View style={styles.worksSection}>
            <Text style={styles.worksSectionTitle}>
              Opere in Harmonia ({composerWorks.length})
            </Text>

            {composerWorks.map((work) => (
              <TouchableOpacity
                key={work.id}
                style={styles.workCard}
                onPress={() => {
                  onClose();
                  onSelectWork(work);
                }}
              >
                <Image source={{ uri: work.coverImage }} style={styles.workThumb} />
                <View style={styles.workInfo}>
                  <Text style={styles.workCatalog}>{work.catalogNumber}</Text>
                  <Text style={styles.workTitle} numberOfLines={1}>
                    {work.title}
                  </Text>
                  <Text style={styles.workSub}>
                    {work.movements.length} movimenti · {work.genre}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.gold} />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: 44,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.gold,
    fontFamily: 'serif',
  },
  scroll: {
    paddingBottom: 50,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  portraitFrame: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: Colors.gold,
    overflow: 'hidden',
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
    backgroundColor: Colors.surface,
  },
  portrait: {
    width: '100%',
    height: '100%',
  },
  name: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: 'serif',
    marginTop: 14,
    textAlign: 'center',
  },
  years: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  badge: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  badgeText: {
    fontSize: 11,
    color: Colors.goldLight,
    fontWeight: '700',
  },
  bioCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    padding: 18,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.gold,
  },
  bioTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.gold,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  bioText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  worksSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  worksSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
    fontFamily: 'serif',
    marginBottom: 12,
  },
  workCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  workThumb: {
    width: 50,
    height: 50,
    borderRadius: 6,
  },
  workInfo: {
    flex: 1,
    marginLeft: 12,
  },
  workCatalog: {
    fontSize: 10,
    color: Colors.gold,
    fontWeight: '800',
  },
  workTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  workSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
});

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

interface HeaderProps {
  onSearchPress?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onSearchPress }) => {
  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.brandTitle}>HARMONIA</Text>
        <Text style={styles.brandSubtitle}>Musica Classica, Antica & Lirica</Text>
      </View>
      {onSearchPress && (
        <TouchableOpacity
          style={styles.searchButton}
          onPress={onSearchPress}
          activeOpacity={0.7}
        >
          <Ionicons name="search" size={20} color={Colors.gold} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: Colors.background,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 4,
    color: Colors.gold,
    fontFamily: 'serif',
  },
  brandSubtitle: {
    fontSize: 11,
    letterSpacing: 0.8,
    color: Colors.textSecondary,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  searchButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

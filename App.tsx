import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from './src/theme/colors';
import { AudioProvider } from './src/context/AudioContext';
import { Header } from './src/components/Header';
import { HomeScreen } from './src/screens/HomeScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import { FavoritesScreen } from './src/screens/FavoritesScreen';
import { MiniPlayer } from './src/components/MiniPlayer';
import { FullPlayerModal } from './src/components/FullPlayerModal';
import { WorkDetailModal } from './src/components/WorkDetailModal';
import { ComposerDetailModal } from './src/components/ComposerDetailModal';
import { ClassicalWork, Composer } from './src/types';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'home' | 'search' | 'favorites'>('home');
  const [selectedWork, setSelectedWork] = useState<ClassicalWork | null>(null);
  const [selectedComposer, setSelectedComposer] = useState<Composer | null>(null);
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);

  return (
    <SafeAreaProvider>
      <AudioProvider>
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
          <StatusBar style="light" />

          {/* Top Brand Header */}
          <Header onSearchPress={() => setCurrentTab('search')} />

          {/* Screen Content */}
          <View style={styles.content}>
            {currentTab === 'home' && (
              <HomeScreen
                onSelectWork={(work) => setSelectedWork(work)}
                onSelectComposer={(composer) => setSelectedComposer(composer)}
                onOpenPlayer={() => setIsFullPlayerOpen(true)}
              />
            )}

            {currentTab === 'search' && (
              <SearchScreen
                onSelectWork={(work) => setSelectedWork(work)}
                onOpenPlayer={() => setIsFullPlayerOpen(true)}
              />
            )}

            {currentTab === 'favorites' && (
              <FavoritesScreen
                onSelectWork={(work) => setSelectedWork(work)}
                onOpenPlayer={() => setIsFullPlayerOpen(true)}
              />
            )}
          </View>

          {/* Persistent MiniPlayer */}
          <MiniPlayer onPress={() => setIsFullPlayerOpen(true)} />

          {/* Bottom Tab Bar */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => setCurrentTab('home')}
              activeOpacity={0.7}
            >
              <Ionicons
                name={currentTab === 'home' ? 'compass' : 'compass-outline'}
                size={22}
                color={currentTab === 'home' ? Colors.gold : Colors.textMuted}
              />
              <Text
                style={[
                  styles.tabLabel,
                  currentTab === 'home' && styles.tabLabelActive,
                ]}
              >
                Esplora
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => setCurrentTab('search')}
              activeOpacity={0.7}
            >
              <Ionicons
                name={currentTab === 'search' ? 'search' : 'search-outline'}
                size={22}
                color={currentTab === 'search' ? Colors.gold : Colors.textMuted}
              />
              <Text
                style={[
                  styles.tabLabel,
                  currentTab === 'search' && styles.tabLabelActive,
                ]}
              >
                Cerca
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => setCurrentTab('favorites')}
              activeOpacity={0.7}
            >
              <Ionicons
                name={currentTab === 'favorites' ? 'heart' : 'heart-outline'}
                size={22}
                color={currentTab === 'favorites' ? Colors.gold : Colors.textMuted}
              />
              <Text
                style={[
                  styles.tabLabel,
                  currentTab === 'favorites' && styles.tabLabelActive,
                ]}
              >
                Preferiti
              </Text>
            </TouchableOpacity>
          </View>

          {/* Modals */}
          <FullPlayerModal
            visible={isFullPlayerOpen}
            onClose={() => setIsFullPlayerOpen(false)}
          />

          <WorkDetailModal
            work={selectedWork}
            visible={selectedWork !== null}
            onClose={() => setSelectedWork(null)}
            onOpenPlayer={() => setIsFullPlayerOpen(true)}
          />

          <ComposerDetailModal
            composer={selectedComposer}
            visible={selectedComposer !== null}
            onClose={() => setSelectedComposer(null)}
            onSelectWork={(work) => setSelectedWork(work)}
          />
        </SafeAreaView>
      </AudioProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 4,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 20,
  },
  tabLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 3,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: Colors.gold,
    fontWeight: '700',
  },
});

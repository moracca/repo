import { StatusBar } from 'expo-status-bar';
import { createStaticNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { colors } from './src/theme/colors';

import { NavMenu } from './src/components/NavMenu';

import { HomeScreen } from './src/screens/HomeScreen';
import { CaptureDreamScreen } from './src/screens/CaptureDreamScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { DreamDetailScreen } from './src/screens/DreamDetailScreen';
import { DreamfieldScreen } from './src/screens/DreamfieldScreen';
import { AnalyticsScreen } from './src/screens/AnalyticsScreen';

// set up the navigation stack config for the app and define the screens and their options.
const RootStack = createStackNavigator({
  screenOptions: {
    headerStyle: { backgroundColor: colors.background },
    headerTintColor: colors.text,
    headerTitleStyle: { fontFamily: 'Social Media', fontSize: 26 },
    headerRight: () => <NavMenu />,
    cardStyle: { backgroundColor: colors.background }
  },
  screens: {
    Home: {
      screen: HomeScreen,
      options: {
        title: 'Dreamweaver',
        // Only the root screen gets the oversized wordmark. It has no back
        // button, so the title container is ~52dp wider here, and it is the
        // app title, so its not wasted space.
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { fontFamily: 'Social Media', fontSize: 48 }
      }
    },
    CaptureDream: {
      screen: CaptureDreamScreen,
      options: { title: 'New Dream' }
    },
    Settings: {
      screen: SettingsScreen,
      options: { title: 'Settings' }
    },
    History: {
      screen: HistoryScreen,
      options: { title: 'Dream History' }
    },
    DreamDetail: {
      screen: DreamDetailScreen,
      options: { title: 'Dream Detail' }
    },
    Dreamfield: {
      screen: DreamfieldScreen,
      options: { title: 'Dreamfield' }
    },
    Analytics: {
      screen: AnalyticsScreen,
      options: { title: 'Analytics' }
    }
  }
});
// create a static navigation component from the RootStack config.
const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return (
    <>
      <StatusBar style="light" />
      <Navigation />
    </>
  );
}

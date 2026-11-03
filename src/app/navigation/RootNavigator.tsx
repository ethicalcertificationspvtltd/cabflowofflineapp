import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useAuthStore} from '../../features/auth/hooks/authStore';
import {LoginScreen} from '../../features/auth/screens/LoginScreen';
import {HomeScreen} from '../../features/audits/screens/HomeScreen';
import {AuditDetailScreen} from '../../features/audits/screens/AuditDetailScreen';
import {OfflineDraftsScreen} from '../../features/drafts/screens/OfflineDraftsScreen';
import {SyncCenterScreen} from '../../features/syncCenter/screens/SyncCenterScreen';
import {ProfileScreen} from '../../features/profile/screens/ProfileScreen';
import {colors} from '../../shared/ui/theme';
import type {
  AuthStackParamList,
  HomeStackParamList,
  MainTabParamList,
} from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function AuditsStack(): React.JSX.Element {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen
        name="Home"
        component={HomeScreen}
        options={{headerShown: false}}
      />
      <HomeStack.Screen
        name="AuditDetail"
        component={AuditDetailScreen}
        options={{title: 'Audit'}}
      />
    </HomeStack.Navigator>
  );
}

function MainTabs(): React.JSX.Element {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.inkMuted,
      }}>
      <Tab.Screen name="Audits" component={AuditsStack} />
      <Tab.Screen
        name="Drafts"
        component={OfflineDraftsScreen}
        options={{headerShown: true, title: 'Drafts'}}
      />
      <Tab.Screen
        name="Sync"
        component={SyncCenterScreen}
        options={{headerShown: true, title: 'Sync Center'}}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{headerShown: true, title: 'Profile'}}
      />
    </Tab.Navigator>
  );
}

export function RootNavigator(): React.JSX.Element {
  const user = useAuthStore(s => s.user);
  const hydrated = useAuthStore(s => s.hydrated);

  if (!hydrated) {
    return <></>;
  }

  return (
    <NavigationContainer>
      {user ? (
        <MainTabs />
      ) : (
        <AuthStack.Navigator screenOptions={{headerShown: false}}>
          <AuthStack.Screen name="Login" component={LoginScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}

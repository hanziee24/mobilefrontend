import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-reanimated';
import { LanguageProvider } from '../contexts/LanguageContext';
import { authAPI } from '../services/api';

export const unstable_settings = {
  initialRouteName: 'index',
};

const ROLE_HOME: Record<string, string> = {
  ADMIN: '/admin-dashboard',
  RIDER: '/rider-dashboard',
  CASHIER: '/cashier-dashboard',
  CUSTOMER: '/customer-dashboard',
};

const ROLE_ALLOWED_PREFIXES: Record<string, string[]> = {
  ADMIN: ['admin', 'analytics', 'pos', 'notifications', 'admin-system-settings', 'admin-create-staff', 'cashier-parcel-history', 'auth'],
  RIDER: ['rider', 'track-delivery', 'update-status', 'proof-of-delivery', 'qr', 'chat', 'contact-rider', 'notifications', 'earnings', 'performance', 'route', 'failed-delivery', 'delivery-qr', 'rider-pos', 'rider-navigation', 'mpin-setup', 'mpin-verify', 'auth'],
  CASHIER: ['cashier-dashboard', 'cashier-create-delivery', 'cashier-parcel-history', 'cashier-profile', 'pos', 'notifications', 'mpin-setup', 'mpin-verify', 'auth'],
  CUSTOMER: ['customer', 'create-delivery', 'bulk-delivery', 'delivery-status', 'track-delivery', 'order-history', 'rate-rider', 'notifications', 'chat', 'contact-rider', 'guest-tracking', 'customer-wallet', 'saved-addresses', 'find-hub', 'auth'],
};

export default function RootLayout() {
  const appState = useRef(AppState.currentState);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const checkRouteAccess = async () => {
      const token = await AsyncStorage.getItem('accessToken');
      const userType = await AsyncStorage.getItem('userType');
      const currentRoute = segments[0] as string | undefined;

      // No token — send to auth unless already there
      if (!token || !userType) {
        if (
          currentRoute &&
          currentRoute !== 'index' &&
          currentRoute !== 'auth' &&
          currentRoute !== '(tabs)' &&
          currentRoute !== 'guest-tracking'
        ) {
          router.replace('/auth');
        }
        return;
      }

      if (!currentRoute || currentRoute === 'index' || currentRoute === '(tabs)') return;

      const allowed = ROLE_ALLOWED_PREFIXES[userType] ?? [];
      const isAllowed = allowed.some((prefix) => currentRoute.startsWith(prefix));

      if (!isAllowed) {
        const home = ROLE_HOME[userType] ?? '/auth';
        router.replace(home as any);
      }
    };

    checkRouteAccess();
  }, [segments, router]);

  useEffect(() => {
    // Listen for app state changes globally
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  const handleAppStateChange = async (nextAppState: any) => {
    // When app goes to background or becomes inactive
    if (
      appState.current.match(/active/) &&
      (nextAppState === 'background' || nextAppState === 'inactive')
    ) {
      console.log('App closing/backgrounding - setting rider offline');
      
      // Check if user is a rider
      const userType = await AsyncStorage.getItem('userType');
      if (userType === 'RIDER') {
        try {
          await authAPI.updateRiderStatus(false);
          console.log('Rider set to offline on app close');
        } catch (error) {
          console.log('Failed to set offline on app close:', error);
        }
      }
    }
    // When app comes back to foreground
    else if (
      appState.current.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      console.log('App reopening - setting rider online');
      
      // Check if user is a rider
      const userType = await AsyncStorage.getItem('userType');
      if (userType === 'RIDER') {
        try {
          await authAPI.updateRiderStatus(true);
          console.log('Rider set to online on app reopen');
        } catch (error) {
          console.log('Failed to set online on app reopen:', error);
        }
      }
    }
    appState.current = nextAppState;
  };

  return (
    <LanguageProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="mpin-setup" />
        <Stack.Screen name="mpin-verify" />
        <Stack.Screen name="customer-dashboard" />
        <Stack.Screen name="rider-dashboard" />
        <Stack.Screen name="find-hub" />
      </Stack>
    </LanguageProvider>
  );
}

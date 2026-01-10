import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useWallet } from '@lazorkit/wallet-mobile-adapter';

/**
 * Callback Screen
 * Handles deep link redirect from Lazorkit Portal after authentication.
 * This route is hit when Portal redirects to: lazorkitstarter://callback?...
 *
 * The SDK should process the callback parameters automatically, but we provide
 * this route to prevent "Unmatched Route" errors and handle navigation.
 */
export default function CallbackScreen() {
  const router = useRouter();
  const wallet = useWallet();
  const params = useLocalSearchParams();

  useEffect(() => {
    // Log callback parameters for debugging
    console.log('Callback received:', params);

    // Check if wallet is now connected after SDK processes callback
    if (wallet.isConnected) {
      console.log('Wallet connected! Navigating to home...');
      router.replace('/home');
    } else {
      // Give SDK a moment to process the callback
      const timer = setTimeout(() => {
        if (wallet.isConnected) {
          router.replace('/home');
        } else {
          // If still not connected after 2 seconds, go back to welcome
          console.log('Wallet not connected after callback. Returning to welcome.');
          router.replace('/');
        }
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [wallet.isConnected, router, params]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#9945FF" />
      <Text style={styles.text}>Completing authentication...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  text: {
    fontSize: 16,
    color: '#171717',
    marginTop: 16,
  },
});

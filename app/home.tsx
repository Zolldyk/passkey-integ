import { View, Text, StyleSheet } from 'react-native';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useWallet } from '@lazorkit/wallet-mobile-adapter';

/**
 * Wallet Home Screen
 * Displays the user's wallet address after successful authentication.
 * Implements protected route pattern to ensure only authenticated users can access.
 */
export default function HomeScreen() {
  const wallet = useWallet();
  const router = useRouter();

  /**
   * Protected route: Redirect to welcome screen if wallet is not connected.
   * This prevents unauthorized access to wallet information.
   */
  useEffect(() => {
    if (!wallet.isConnected) {
      router.replace('/');
    }
  }, [wallet.isConnected, router]);

  // Don't render anything while checking connection state
  if (!wallet.isConnected) return null;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Your Wallet</Text>

        <View style={styles.addressContainer}>
          <Text style={styles.addressLabel}>Wallet Address</Text>
          <Text style={styles.address}>
            {wallet.smartWalletPubkey?.toString()}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA', // Neutral background
    paddingTop: 64, // Generous top spacing
    paddingHorizontal: 24,
  },
  content: {
    flex: 1,
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    fontSize: 24, // H2 size
    fontWeight: '700', // Bold
    color: '#171717', // Neutral text
    marginBottom: 32, // Generous white space
  },
  addressContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  addressLabel: {
    fontSize: 13,
    fontWeight: '600', // Semibold
    color: '#737373', // Neutral 500
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  address: {
    fontSize: 14,
    color: '#171717', // Neutral text
    lineHeight: 20,
  },
});

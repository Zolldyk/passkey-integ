import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useWallet } from '@lazorkit/wallet-mobile-adapter';
import { WalletService } from '../services/WalletService';
import { AddressDisplay } from '../components/AddressDisplay';
import { Colors, Typography, Spacing, BorderRadius } from '../services/constants';

/**
 * Wallet Home Screen
 * Displays the user's wallet address after successful authentication.
 * Implements protected route pattern to ensure only authenticated users can access.
 */
export default function HomeScreen() {
  const wallet = useWallet();
  const router = useRouter();
  const [disconnecting, setDisconnecting] = useState(false);

  /**
   * Protected route: Redirect to welcome screen if wallet is not connected.
   * This prevents unauthorized access to wallet information.
   */
  useEffect(() => {
    if (!wallet.isConnected) {
      router.replace('/');
    }
  }, [wallet.isConnected, router]);

  /**
   * Handle wallet disconnect.
   * Clears persisted session from SecureStore before disconnecting wallet.
   * Shows loading state during disconnect process.
   */
  const handleDisconnect = async () => {
    try {
      setDisconnecting(true);

      // Clear persisted session before disconnecting wallet
      await WalletService.clearSession();
      if (__DEV__) {
        console.log('[HomeScreen] Session cleared, disconnecting wallet');
      }

      // Disconnect wallet and navigate to welcome screen
      await wallet.disconnect();
      router.replace('/');
    } catch (error) {
      // Log error but still attempt disconnect and navigation
      console.error('[HomeScreen] Error during disconnect:', error);

      try {
        await wallet.disconnect();
        router.replace('/');
      } catch (disconnectError) {
        console.error('[HomeScreen] Failed to disconnect wallet:', disconnectError);
      }
    } finally {
      setDisconnecting(false);
    }
  };

  // Don't render anything while checking connection state
  if (!wallet.isConnected) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Wallet</Text>

      {/* Display wallet address with copy functionality */}
      <View style={styles.addressContainer}>
        <AddressDisplay
          address={wallet.smartWalletPubkey?.toString() || ''}
          truncate={true}
          showCopyButton={true}
        />
      </View>

      {/* Placeholder for balance (Epic 2 feature) */}
      <Text style={styles.balanceText}>Balance: Coming soon in Epic 2</Text>

      {/* Navigate to transfer form for USDC transfers (Story 2.1) */}
      <TouchableOpacity
        style={styles.sendButton}
        onPress={() => router.push('/transfer')}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Send USDC"
        accessibilityHint="Opens transfer form to send USDC to another wallet"
      >
        <Text style={styles.sendButtonText}>Send USDC</Text>
      </TouchableOpacity>

      {/* Disconnect button with loading state */}
      <TouchableOpacity
        style={[
          styles.disconnectButton,
          disconnecting && styles.disabledButton,
        ]}
        onPress={handleDisconnect}
        disabled={disconnecting}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Disconnect wallet"
        accessibilityHint="Clears session and returns to welcome screen"
      >
        {disconnecting ? (
          <ActivityIndicator color={Colors.neutral[900]} />
        ) : (
          <Text style={styles.disconnectButtonText}>Disconnect Wallet</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50], // Light background
    padding: Spacing.xl, // 24pt padding
  },
  title: {
    fontSize: Typography.fontSize.h2, // 24pt
    fontWeight: Typography.fontWeight.bold, // 700
    color: Colors.neutral[900], // Dark text
    marginBottom: Spacing.xl, // 24pt
  },
  addressContainer: {
    marginVertical: Spacing.xxl, // 32pt vertical margin
  },
  balanceText: {
    fontSize: Typography.fontSize.body, // 15pt
    color: Colors.neutral[900],
    marginVertical: Spacing.lg, // 16pt
  },
  sendButton: {
    height: 44, // WCAG AA minimum touch target
    backgroundColor: Colors.primary.purple, // Solana purple
    borderRadius: BorderRadius.sm, // 8pt
    paddingHorizontal: Spacing.lg, // 16pt
    marginTop: Spacing.xxl, // 32pt
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: Typography.fontSize.body, // 15pt
    fontWeight: Typography.fontWeight.semibold, // 600
    textAlign: 'center',
  },
  disconnectButton: {
    height: 44, // WCAG AA minimum touch target
    paddingHorizontal: Spacing.lg, // 16pt
    borderRadius: BorderRadius.sm, // 8pt
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    marginTop: Spacing.xxxl, // 48pt for generous spacing
    justifyContent: 'center',
    alignItems: 'center',
  },
  disconnectButtonText: {
    fontSize: Typography.fontSize.body, // 15pt
    color: Colors.neutral[900],
    textAlign: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
});

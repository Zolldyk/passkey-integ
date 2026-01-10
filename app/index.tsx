import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useWallet } from '@lazorkit/wallet-mobile-adapter';

/**
 * Welcome/Onboarding Screen
 * Displays project introduction and provides entry point to wallet features.
 *
 * WALLET CREATION FLOW:
 * 1. User taps "Create Wallet with Biometrics" button
 * 2. handleCreateWallet() calls wallet.connect() from LazorKit SDK
 * 3. SDK opens Lazorkit Portal (https://portal.lazor.sh) in system browser via expo-web-browser
 * 4. Portal initiates WebAuthn credential creation ceremony
 * 5. Native biometric prompt appears (Face ID on iOS, Touch ID/Fingerprint on Android)
 * 6. User authenticates with biometrics - WebAuthn credential is created and stored in device keychain
 * 7. Portal generates Solana wallet keypair bound to the passkey credential
 * 8. Portal redirects back to app via deep link: lazorkitstarter://callback?token=...
 * 9. SDK processes callback token and updates wallet context state (isConnected=true, smartWalletPubkey set)
 * 10. useEffect detects isConnected=true and navigates to /home screen
 * 11. Home screen displays the wallet address
 *
 * The LazorKitProvider (configured in app/_layout.tsx) wraps the entire app and provides:
 * - Wallet context accessible via useWallet() hook
 * - Connection to Solana Devnet RPC
 * - Integration with Lazorkit Portal for authentication
 * - Paymaster configuration for gasless transactions
 */
export default function WelcomeScreen() {
  const wallet = useWallet();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  /**
   * Automatically navigate to home screen when wallet connection completes successfully.
   * This effect monitors the wallet connection state and redirects once authentication is complete.
   */
  useEffect(() => {
    if (wallet.isConnected) {
      console.log('Wallet connected. Public key:', wallet.smartWalletPubkey?.toString());
      router.replace('/home');
    }
  }, [wallet.isConnected, wallet.smartWalletPubkey, router]);

  /**
   * Initiates wallet creation with biometric authentication.
   * wallet.connect() opens Lazorkit Portal in system browser and initiates
   * WebAuthn credential creation with biometric prompt (Face ID/Touch ID).
   * After authentication, Portal redirects back to app via deep link.
   *
   * Error handling strategy:
   * - User cancellation: Inform user they cancelled and can retry
   * - Network errors: Suggest checking connection
   * - Unknown errors: Generic failure message with retry option
   */
  const handleCreateWallet = async () => {
    setError(null); // Clear any previous errors before attempting connection

    try {
      await wallet.connect({
        redirectUrl: 'lazorkitstarter://callback',
      });
    } catch (err: any) {
      console.error('Wallet connection error:', err);

      // Set user-friendly error message based on error type
      if (err.message?.toLowerCase().includes('cancel') || err.message?.toLowerCase().includes('abort')) {
        setError('Authentication cancelled. Please try again.');
      } else if (err.message?.toLowerCase().includes('network') || err.message?.toLowerCase().includes('timeout')) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError('Failed to create wallet. Please try again.');
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Lazorkit Mobile Wallet Starter</Text>

        <Text style={styles.description}>
          Experience seamless biometric wallet authentication powered by WebAuthn passkeys.
          No seed phrases, no passwords—just your fingerprint or face.
        </Text>

        <TouchableOpacity
          style={[styles.button, wallet.isConnecting && styles.buttonDisabled]}
          onPress={handleCreateWallet}
          disabled={wallet.isConnecting}
          accessibilityRole="button"
          accessibilityLabel="Create wallet using biometric authentication"
          accessibilityHint="Opens biometric prompt to create new wallet"
        >
          {wallet.isConnecting ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.buttonText}>Connecting...</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>Create Wallet with Biometrics</Text>
          )}
        </TouchableOpacity>

        {/* Display error message if connection fails */}
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA', // Neutral background for clean look
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 32,
    maxWidth: 400,
    alignItems: 'center',
  },
  title: {
    fontSize: 32, // H1 size
    fontWeight: '700', // Bold
    color: '#171717', // Neutral text
    textAlign: 'center',
    marginBottom: 24,
  },
  description: {
    fontSize: 15, // Body size
    color: '#171717',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#9945FF', // Solana brand purple - primary action color
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    minHeight: 48, // Meets accessibility minimum (44pt iOS / 48dp Android)
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600', // Semibold
  },
  errorText: {
    color: '#EF4444', // Error red
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
});

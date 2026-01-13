import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Linking,
} from 'react-native';
import { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useWallet } from '@lazorkit/wallet-mobile-adapter';
import { Colors, Typography, Spacing, BorderRadius } from '../services/constants';
import { SolanaService } from '../services/SolanaService';
import { TransactionRequest } from '../types';
import { truncateAddress, formatUSDC } from '../utils/FormattingUtils';

/**
 * Transaction Confirm Screen
 *
 * Handles the complete transaction signing and submission flow:
 * 1. Display transaction preview (recipient, amount, gasless badge)
 * 2. User confirms and triggers biometric authentication
 * 3. Build USDC transfer transaction using SolanaService
 * 4. Sign and submit via Lazorkit SDK (triggers biometric prompt)
 * 5. Poll for blockchain confirmation
 * 6. Display success/failure state with transaction details
 *
 * State Management:
 * - transactionStatus: Tracks UI state (preview → pending → confirmed/failed)
 * - signature: Transaction signature returned from blockchain
 * - error: User-friendly error message if transaction fails
 * - isSubmitting: Loading state for button during signing
 *
 * Paymaster Integration:
 * - Paymaster automatically sponsors gas fees when using wallet.signAndSendTransaction()
 * - No explicit paymaster API calls needed - SDK handles it internally
 * - Transaction is built client-side, signed with biometric, then sponsored by paymaster
 *
 * Biometric Security:
 * - Biometric prompt triggered automatically by wallet.signAndSendTransaction()
 * - User must authenticate with Face ID/Touch ID to sign transaction
 * - If user cancels biometric, transaction is rejected and error displayed
 */
export default function ConfirmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const wallet = useWallet();

  // Parse TransactionRequest from route params (passed as JSON string)
  const transactionRequest: TransactionRequest = JSON.parse(
    params.transactionRequest as string
  );

  // Component state for transaction lifecycle
  const [transactionStatus, setTransactionStatus] = useState<
    'preview' | 'pending' | 'confirmed' | 'failed'
  >('preview');
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Handle "Confirm & Sign" button press.
   *
   * Initiates the complete transaction signing and submission flow:
   * 1. Build USDC transfer transaction with SolanaService
   * 2. Trigger biometric authentication via wallet.signAndSendTransaction()
   * 3. Paymaster automatically sponsors gas fees (handled by SDK)
   * 4. Poll for transaction confirmation on blockchain
   * 5. Update UI based on result (confirmed or failed)
   *
   * Error Handling:
   * - User cancelled biometric: Show "Transaction signing was cancelled"
   * - Recipient account not initialized: Show descriptive error about account setup
   * - Insufficient balance: Show "Insufficient USDC balance"
   * - Network errors: Show "Network error, please try again"
   * - Other errors: Show generic error message
   */
  const handleConfirmAndSign = async () => {
    setIsSubmitting(true);
    setTransactionStatus('pending');

    try {
      // Build USDC transfer transaction using SolanaService
      // This creates the SPL Token transfer instruction with sender/recipient token accounts
      const transaction = await SolanaService.buildUSDCTransfer(
        transactionRequest,
        wallet.smartWalletPubkey!
      );

      // Sign and send transaction via Lazorkit SDK
      // This triggers biometric prompt (Face ID/Touch ID) for user authentication
      // After signing, SDK automatically sends transaction to paymaster for gas sponsorship
      // Paymaster adds fee payer instruction and submits to Solana RPC
      const txSignature = await wallet.signAndSendTransaction(
        {
          instructions: transaction.instructions,
          transactionOptions: {
            clusterSimulation: 'devnet',
          },
        },
        {
          redirectUrl: 'passkey-integ://confirm',
        }
      );
      setSignature(txSignature);

      // Poll for transaction confirmation on blockchain
      // Uses 'confirmed' commitment level (32 confirmations, ~15-20 seconds)
      const status = await SolanaService.confirmTransaction(txSignature);

      if (status.status === 'confirmed') {
        setTransactionStatus('confirmed');
      } else {
        setTransactionStatus('failed');
        setError(status.error || 'Transaction failed');
      }
    } catch (error: any) {
      setTransactionStatus('failed');

      // Parse error and provide user-friendly error messages
      let errorMessage = 'Transaction failed. Please try again.';

      if (
        error.message?.includes('User rejected') ||
        error.message?.includes('cancelled')
      ) {
        errorMessage = 'Transaction signing was cancelled';
      } else if (error.message?.includes('not initialized')) {
        errorMessage =
          'Recipient has not yet initialized their USDC account. They must receive USDC at least once before you can send to them.';
      } else if (error.message?.includes('Insufficient')) {
        errorMessage = "You don't have enough USDC to complete this transfer";
      } else if (
        error.message?.includes('Network') ||
        error.message?.includes('timeout')
      ) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (
        error.message?.includes('rejected') ||
        error.message?.includes('Paymaster')
      ) {
        errorMessage =
          'Transaction could not be sponsored. Please try again later.';
      }

      setError(errorMessage);
      console.error('Transaction error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Navigate back to Wallet Home screen.
   * Uses router.replace() to prevent user from navigating back to confirm screen.
   */
  const handleBackToHome = () => {
    router.replace('/home');
  };

  /**
   * Open transaction in Solana Explorer.
   * Constructs Devnet Explorer URL with transaction signature and opens in browser.
   */
  const handleViewOnExplorer = () => {
    if (signature) {
      const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
      Linking.openURL(explorerUrl);
    }
  };

  /**
   * Reset transaction to preview state for retry.
   * Used when transaction fails and user wants to try again.
   */
  const handleTryAgain = () => {
    setTransactionStatus('preview');
    setSignature(null);
    setError(null);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContainer}
    >
      {/* Preview State - Show transaction details and confirm button */}
      {transactionStatus === 'preview' && (
        <>
          <Text style={styles.title}>Confirm Transaction</Text>

          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Recipient</Text>
              <Text style={styles.value}>
                {truncateAddress(transactionRequest.recipientAddress)}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Amount</Text>
              <Text style={styles.value}>
                {formatUSDC(transactionRequest.amount)}
              </Text>
            </View>

            <View style={styles.gaslessBadge}>
              <Text style={styles.gaslessBadgeText}>⚡ Gasless Transaction</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, isSubmitting && { opacity: 0.5 }]}
            onPress={handleConfirmAndSign}
            disabled={isSubmitting}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Confirm and sign transaction with biometrics"
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Confirm & Sign</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleBackToHome}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Cancel transaction"
          >
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Pending State - Show loading spinner while waiting for confirmation */}
      {transactionStatus === 'pending' && (
        <View style={styles.statusContainer}>
          <Text style={styles.title}>Processing Transaction</Text>
          <ActivityIndicator size="large" color={Colors.primary.purple} />
          <Text style={styles.loadingText}>
            Waiting for blockchain confirmation...
          </Text>
          <Text style={styles.loadingText}>This may take 15-30 seconds</Text>
          {signature && (
            <Text style={styles.loadingText}>
              Signature: {truncateAddress(signature, 8, 8)}
            </Text>
          )}
        </View>
      )}

      {/* Confirmed State - Show success with transaction details */}
      {transactionStatus === 'confirmed' && (
        <>
          <View style={styles.statusContainer}>
            <Text style={styles.statusIcon}>✓</Text>
            <Text style={styles.title}>Transaction Successful</Text>
            <Text style={styles.statusMessage}>
              Your USDC transfer was successful
            </Text>
          </View>

          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.label}>Amount Sent</Text>
              <Text style={styles.value}>
                {formatUSDC(transactionRequest.amount)}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.label}>Recipient</Text>
              <Text style={styles.value}>
                {truncateAddress(transactionRequest.recipientAddress)}
              </Text>
            </View>

            {signature && (
              <View style={styles.detailRow}>
                <Text style={styles.label}>Signature</Text>
                <Text style={styles.value}>
                  {truncateAddress(signature, 6, 6)}
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleViewOnExplorer}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="View transaction on Solana Explorer"
          >
            <Text style={styles.primaryButtonText}>View on Explorer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleBackToHome}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Return to wallet home"
          >
            <Text style={styles.secondaryButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Failed State - Show error with retry option */}
      {transactionStatus === 'failed' && (
        <>
          <View style={styles.statusContainer}>
            <Text style={[styles.statusIcon, { color: Colors.error }]}>✗</Text>
            <Text style={styles.title}>Transaction Failed</Text>
            <Text style={[styles.statusMessage, styles.errorText]}>
              {error || 'Transaction failed. Please try again.'}
            </Text>
          </View>

          <View style={styles.detailsCard}>
            <Text style={styles.label}>What happened?</Text>
            <Text style={styles.value}>
              {error?.includes('cancelled')
                ? 'You cancelled the transaction by rejecting the biometric prompt.'
                : error?.includes('not initialized')
                ? 'The recipient needs to set up their USDC account first.'
                : error?.includes('Insufficient')
                ? 'Your wallet does not have enough USDC for this transfer.'
                : error?.includes('Network')
                ? 'Unable to connect to the blockchain. Check your internet connection.'
                : 'An unexpected error occurred. Please try again.'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleTryAgain}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Try transaction again"
          >
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleBackToHome}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Return to wallet home"
          >
            <Text style={styles.secondaryButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  scrollContainer: {
    flexGrow: 1,
    padding: Spacing.xl,
    justifyContent: 'center',
  },
  title: {
    fontSize: Typography.fontSize.h2,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.neutral[900],
    textAlign: 'center',
    marginBottom: Spacing.xxl,
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.md,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: Typography.fontSize.body,
    color: Colors.neutral[900],
    fontWeight: Typography.fontWeight.semibold,
  },
  value: {
    fontSize: Typography.fontSize.body,
    color: Colors.neutral[900],
    textAlign: 'right',
    flex: 1,
    marginLeft: Spacing.md,
  },
  gaslessBadge: {
    backgroundColor: Colors.primary.purple,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
    marginTop: Spacing.md,
  },
  gaslessBadgeText: {
    color: '#fff',
    fontSize: Typography.fontSize.caption,
    fontWeight: Typography.fontWeight.semibold,
  },
  statusContainer: {
    alignItems: 'center',
    marginVertical: Spacing.xxxl,
  },
  statusIcon: {
    fontSize: 64,
    marginBottom: Spacing.xl,
    color: Colors.success,
  },
  statusMessage: {
    fontSize: Typography.fontSize.body,
    textAlign: 'center',
    color: Colors.neutral[900],
    marginBottom: Spacing.lg,
  },
  primaryButton: {
    height: 44,
    backgroundColor: Colors.primary.purple,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: Typography.fontSize.body,
    fontWeight: Typography.fontWeight.semibold,
  },
  secondaryButton: {
    height: 44,
    borderWidth: 1,
    borderColor: Colors.neutral[900],
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  secondaryButtonText: {
    color: Colors.neutral[900],
    fontSize: Typography.fontSize.body,
    fontWeight: Typography.fontWeight.semibold,
  },
  loadingText: {
    fontSize: Typography.fontSize.body,
    color: Colors.neutral[900],
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  errorText: {
    color: Colors.error,
  },
});

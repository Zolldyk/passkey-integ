import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useWallet } from '@lazorkit/wallet-mobile-adapter';
import {
  isValidSolanaAddress,
  isValidAmount,
  formatUSDCAmountToLamports,
} from '../utils/ValidationUtils';
import { Colors, Typography, Spacing, BorderRadius } from '../services/constants';

/**
 * Transfer Form Screen
 *
 * Captures recipient Solana address and USDC amount for token transfer.
 * Implements real-time validation with "touched" pattern for optimal UX.
 *
 * Form State Management:
 * - Controlled inputs: recipientAddress and amount stored in component state
 * - Validation errors: Displayed only after user interacts with field (touched pattern)
 * - Real-time feedback: Once field is touched, validation updates on every keystroke
 *
 * Validation Timing:
 * - onBlur: Mark field as "touched" and trigger initial validation
 * - onChange: If field is touched, validate immediately for real-time feedback
 * - onSubmit: Final validation before navigation to confirmation screen
 *
 * Navigation Flow:
 * - User fills form → Taps "Review Transaction" → Navigate to /confirm with TransactionRequest
 * - Note: /confirm route implemented in Story 2.2 (not yet available)
 */
export default function TransferScreen() {
  const router = useRouter();
  const wallet = useWallet();

  // Form input state (controlled components)
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');

  // Validation error state
  const [recipientError, setRecipientError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);

  // Touched state - tracks which fields user has interacted with
  // Errors only shown after field is touched (better UX than showing errors immediately)
  const [touched, setTouched] = useState({
    recipient: false,
    amount: false,
  });

  /**
   * Handle recipient address input changes.
   * If field is already touched, validate in real-time for immediate feedback.
   */
  const handleRecipientChange = (text: string) => {
    setRecipientAddress(text);

    // Only validate in real-time if field has been touched
    if (touched.recipient) {
      const validation = isValidSolanaAddress(text);
      setRecipientError(validation.valid ? null : validation.error || null);
    }
  };

  /**
   * Handle amount input changes.
   * If field is already touched, validate in real-time for immediate feedback.
   */
  const handleAmountChange = (text: string) => {
    setAmount(text);

    // Only validate in real-time if field has been touched
    if (touched.amount) {
      const validation = isValidAmount(text);
      setAmountError(validation.valid ? null : validation.error || null);
    }
  };

  /**
   * Handle recipient field blur (user leaves field).
   * Mark field as touched and trigger validation.
   * This ensures errors appear only after user has attempted to fill the field.
   */
  const handleRecipientBlur = () => {
    setTouched((prev) => ({ ...prev, recipient: true }));
    const validation = isValidSolanaAddress(recipientAddress);
    setRecipientError(validation.valid ? null : validation.error || null);
  };

  /**
   * Handle amount field blur (user leaves field).
   * Mark field as touched and trigger validation.
   */
  const handleAmountBlur = () => {
    setTouched((prev) => ({ ...prev, amount: true }));
    const validation = isValidAmount(amount);
    setAmountError(validation.valid ? null : validation.error || null);
  };

  /**
   * Check if form is valid and ready for submission.
   * Used to enable/disable "Review Transaction" button.
   */
  const isFormValid = (): boolean => {
    return (
      recipientAddress.trim().length > 0 &&
      amount.trim().length > 0 &&
      !recipientError &&
      !amountError &&
      isValidSolanaAddress(recipientAddress).valid &&
      isValidAmount(amount).valid
    );
  };

  /**
   * Handle "Review Transaction" button press.
   * Validates inputs one final time and navigates to confirmation screen.
   *
   * Note: /confirm route will be implemented in Story 2.2.
   * For now, this prepares the data structure but navigation target doesn't exist yet.
   */
  const handleReviewTransaction = () => {
    // Final validation check
    const addressValidation = isValidSolanaAddress(recipientAddress);
    const amountValidation = isValidAmount(amount);

    if (!addressValidation.valid || !amountValidation.valid) {
      // Set errors if validation fails
      setRecipientError(addressValidation.error || null);
      setAmountError(amountValidation.error || null);
      setTouched({ recipient: true, amount: true });
      return;
    }

    // Prepare TransactionRequest object for confirmation screen
    const transactionRequest = {
      recipientAddress,
      amount: parseFloat(amount),
      amountLamports: formatUSDCAmountToLamports(parseFloat(amount)),
      timestamp: Date.now(),
    };

    // Navigate to confirmation screen (Story 2.2)
    // Note: This route doesn't exist yet - will be created in next story
    router.push({
      pathname: '/confirm',
      params: { transactionRequest: JSON.stringify(transactionRequest) },
    });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Send USDC</Text>

        {/* Recipient Address Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Recipient Address</Text>
          <TextInput
            style={[
              styles.input,
              touched.recipient && recipientError && styles.inputError,
            ]}
            placeholder="Enter Solana address"
            placeholderTextColor={Colors.neutral[500]}
            value={recipientAddress}
            onChangeText={handleRecipientChange}
            onBlur={handleRecipientBlur}
            autoCapitalize="none"
            autoCorrect={false}
            accessible={true}
            accessibilityLabel="Recipient Solana address"
            accessibilityHint="Enter the destination wallet address"
          />
          {touched.recipient && recipientError && (
            <Text style={styles.errorText}>{recipientError}</Text>
          )}
        </View>

        {/* Amount Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Amount (USDC)</Text>
          <TextInput
            style={[
              styles.input,
              touched.amount && amountError && styles.inputError,
            ]}
            placeholder="0.00"
            placeholderTextColor={Colors.neutral[500]}
            value={amount}
            onChangeText={handleAmountChange}
            onBlur={handleAmountBlur}
            keyboardType="decimal-pad"
            accessible={true}
            accessibilityLabel="USDC amount"
            accessibilityHint="Enter the amount to send"
          />
          {touched.amount && amountError && (
            <Text style={styles.errorText}>{amountError}</Text>
          )}
        </View>

        {/* Review Transaction Button */}
        <TouchableOpacity
          style={[styles.button, !isFormValid() && styles.buttonDisabled]}
          onPress={handleReviewTransaction}
          disabled={!isFormValid()}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Review Transaction"
          accessibilityHint="Validates inputs and proceeds to transaction confirmation"
          accessibilityState={{ disabled: !isFormValid() }}
        >
          <Text style={styles.buttonText}>Review Transaction</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50], // Light background
  },
  contentContainer: {
    padding: Spacing.xl, // 24pt padding
  },
  title: {
    fontSize: Typography.fontSize.h2, // 24pt
    fontWeight: Typography.fontWeight.bold, // 700
    color: Colors.neutral[900], // Dark text
    marginBottom: Spacing.xxl, // 32pt
  },
  inputContainer: {
    marginBottom: Spacing.xl, // 24pt spacing between inputs
  },
  label: {
    fontSize: Typography.fontSize.body, // 15pt
    fontWeight: Typography.fontWeight.semibold, // 600
    color: Colors.neutral[900],
    marginBottom: Spacing.sm, // 8pt
  },
  input: {
    height: 44, // WCAG AA minimum touch target
    borderWidth: 1,
    borderColor: '#E5E5E5', // Light gray border
    borderRadius: BorderRadius.sm, // 8pt
    paddingHorizontal: Spacing.lg, // 16pt
    fontSize: Typography.fontSize.body, // 15pt
    backgroundColor: '#fff',
    color: Colors.neutral[900],
  },
  inputError: {
    borderColor: Colors.error, // Red border for errors (#EF4444)
  },
  errorText: {
    fontSize: Typography.fontSize.caption, // 11pt
    color: Colors.error, // Red text
    marginTop: Spacing.xs, // 4pt
  },
  button: {
    height: 44, // WCAG AA minimum touch target
    backgroundColor: Colors.primary.purple, // Solana purple
    borderRadius: BorderRadius.sm, // 8pt
    paddingHorizontal: Spacing.lg, // 16pt
    marginTop: Spacing.xxxl, // 48pt for generous spacing
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5, // Visual feedback for disabled state
  },
  buttonText: {
    color: '#fff',
    fontSize: Typography.fontSize.body, // 15pt
    fontWeight: Typography.fontWeight.semibold, // 600
    textAlign: 'center',
  },
});

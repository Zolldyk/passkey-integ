import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { Colors, Typography, Spacing, BorderRadius } from '../services/constants';

/**
 * Props interface for AddressDisplay component
 */
interface AddressDisplayProps {
  /** The full Solana wallet address to display */
  address: string;
  /** Whether to truncate the address (default: true) */
  truncate?: boolean;
  /** Whether to show the copy button (default: true) */
  showCopyButton?: boolean;
}

/**
 * AddressDisplay Component
 *
 * Displays a Solana wallet address with optional truncation and copy-to-clipboard functionality.
 * Provides visual feedback when address is successfully copied.
 *
 * @param address - The full Solana wallet address to display
 * @param truncate - Whether to show truncated version (first 8 + last 4 chars)
 * @param showCopyButton - Whether to display the copy button
 */
export function AddressDisplay({
  address,
  truncate = true,
  showCopyButton = true,
}: AddressDisplayProps) {
  // Track copy state for visual feedback
  const [copied, setCopied] = useState<boolean>(false);

  /**
   * Handle copy to clipboard
   * Copies the full address to clipboard and shows "Copied!" feedback for 2 seconds
   */
  const handleCopy = async () => {
    try {
      // Copy full address to clipboard
      await Clipboard.setStringAsync(address);

      // Show success feedback
      setCopied(true);

      // Reset feedback after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      // Log error in development but fail silently in UI
      if (__DEV__) {
        console.error('Failed to copy address:', error);
      }
    }
  };

  /**
   * Truncate address to first 8 and last 4 characters
   * Example: "3jeq5nuZjJZXjRKKmEfGvJz8qxLQC5rQFrDu7RqZ7rdu" → "3jeq5nuZ...7rdu"
   */
  const displayAddress = truncate
    ? `${address.slice(0, 8)}...${address.slice(-4)}`
    : address;

  return (
    <View style={styles.container}>
      {/* Address label */}
      <Text style={styles.label}>Wallet Address</Text>

      {/* Address text (truncated or full) */}
      <Text style={styles.address}>{displayAddress}</Text>

      {/* Copy button with visual feedback */}
      {showCopyButton && (
        <TouchableOpacity
          style={styles.copyButton}
          onPress={handleCopy}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Copy wallet address"
          accessibilityHint="Copies address to clipboard"
        >
          <Text style={[styles.copyButtonText, copied && styles.copiedText]}>
            {copied ? 'Copied!' : 'Copy Address'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  label: {
    fontSize: Typography.fontSize.caption,
    fontWeight: Typography.fontWeight.semibold,
    color: '#737373', // Neutral 500
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  address: {
    fontSize: Typography.fontSize.body,
    color: Colors.neutral[900],
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  copyButton: {
    backgroundColor: Colors.primary.purple,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    minHeight: 44, // Meets WCAG AA touch target minimum
    justifyContent: 'center',
    alignItems: 'center',
  },
  copyButtonText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.body,
    fontWeight: Typography.fontWeight.semibold,
  },
  copiedText: {
    color: Colors.success,
  },
});

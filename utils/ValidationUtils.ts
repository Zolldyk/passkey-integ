import { PublicKey } from '@solana/web3.js';

/**
 * ValidationUtils Module
 *
 * Provides validation functions for Solana addresses and USDC amounts.
 * Used by the Transfer Form to validate user inputs before transaction creation.
 */

/**
 * Validation result object returned by all validation functions.
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates Solana address format.
 *
 * Checks that the address is:
 * - Non-empty string
 * - Valid base58-encoded public key (using @solana/web3.js PublicKey constructor)
 * - Proper length (32-44 characters for base58-encoded addresses)
 *
 * @param address - The Solana address to validate
 * @returns ValidationResult with valid flag and optional error message
 *
 * @example
 * isValidSolanaAddress('Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr')
 * // Returns: { valid: true }
 *
 * isValidSolanaAddress('invalid')
 * // Returns: { valid: false, error: 'Invalid Solana address format' }
 */
export function isValidSolanaAddress(address: string): ValidationResult {
  // Check for empty address
  if (!address || address.trim().length === 0) {
    return { valid: false, error: 'Recipient address is required' };
  }

  // Check length range (base58-encoded public keys are typically 32-44 characters)
  if (address.length < 32 || address.length > 44) {
    return { valid: false, error: 'Invalid Solana address format' };
  }

  // Validate base58 format using Solana SDK
  // PublicKey constructor throws if address is invalid base58
  try {
    new PublicKey(address);
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid Solana address format' };
  }
}

/**
 * Validates USDC amount format and value.
 *
 * Checks that the amount is:
 * - Non-empty string
 * - Valid positive number (> 0)
 * - Not NaN
 * - Has at most 6 decimal places (USDC token precision)
 *
 * @param amount - The USDC amount to validate (as string from TextInput)
 * @returns ValidationResult with valid flag and optional error message
 *
 * @example
 * isValidAmount('10.50')
 * // Returns: { valid: true }
 *
 * isValidAmount('0')
 * // Returns: { valid: false, error: 'Amount must be greater than zero' }
 *
 * isValidAmount('10.1234567')
 * // Returns: { valid: false, error: 'USDC supports up to 6 decimal places' }
 */
export function isValidAmount(amount: string): ValidationResult {
  // Check for empty amount
  if (!amount || amount.trim().length === 0) {
    return { valid: false, error: 'Amount is required' };
  }

  // Parse as float
  const numericAmount = parseFloat(amount);

  // Check for NaN (invalid numeric format)
  if (isNaN(numericAmount)) {
    return { valid: false, error: 'Amount must be a valid number' };
  }

  // Check for positive number
  if (numericAmount <= 0) {
    return { valid: false, error: 'Amount must be greater than zero' };
  }

  // Check decimal places (USDC has 6 decimals)
  // Split on decimal point and check length of decimal portion
  const parts = amount.split('.');
  if (parts.length > 1 && parts[1].length > 6) {
    return { valid: false, error: 'USDC supports up to 6 decimal places' };
  }

  return { valid: true };
}

/**
 * Converts USDC decimal amount to lamports (smallest unit).
 *
 * USDC token uses 6 decimal places, so 1 USDC = 1,000,000 lamports.
 * This function multiplies the decimal amount by 1,000,000 to get the integer lamport value
 * required for blockchain transactions.
 *
 * @param amount - The USDC amount in decimal format (e.g., 10.50)
 * @returns The amount in lamports as an integer (e.g., 10,500,000)
 *
 * @example
 * formatUSDCAmountToLamports(10.5)
 * // Returns: 10500000
 *
 * formatUSDCAmountToLamports(0.01)
 * // Returns: 10000
 */
export function formatUSDCAmountToLamports(amount: number): number {
  // USDC has 6 decimals, so multiply by 1,000,000
  return Math.round(amount * 1_000_000);
}

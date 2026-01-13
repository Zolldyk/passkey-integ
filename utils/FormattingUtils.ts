/**
 * Formatting Utilities for Display Formatting
 *
 * This module provides utility functions for formatting blockchain data
 * for user-friendly display in the UI.
 *
 * Functions:
 * - truncateAddress(): Shorten Solana addresses for compact display
 * - formatUSDC(): Format USDC amounts with proper currency symbol
 */

/**
 * Truncate a Solana address for compact display.
 *
 * Takes a long Solana address (32-44 characters) and shortens it to show
 * only the first and last few characters with ellipsis in the middle.
 *
 * @param address - The full Solana address to truncate (base58-encoded)
 * @param startChars - Number of characters to show at start (default: 4)
 * @param endChars - Number of characters to show at end (default: 4)
 * @returns Truncated address string (e.g., "3jeq...rdu")
 *
 * @example
 * truncateAddress('3jeq5nuZ3a89zpmDCvvMfxs3YJYG1jFtonrgkjyHrdu')
 * // Returns: "3jeq...Hrdu"
 *
 * @example
 * truncateAddress('3jeq5nuZ3a89zpmDCvvMfxs3YJYG1jFtonrgkjyHrdu', 6, 6)
 * // Returns: "3jeq5n...jyHrdu"
 */
export function truncateAddress(
  address: string,
  startChars: number = 4,
  endChars: number = 4
): string {
  if (!address) {
    return '';
  }

  // If address is shorter than requested truncation length, return as-is
  if (address.length <= startChars + endChars) {
    return address;
  }

  const start = address.slice(0, startChars);
  const end = address.slice(-endChars);

  return `${start}...${end}`;
}

/**
 * Format a USDC amount with currency symbol for display.
 *
 * Converts a numeric USDC amount to a formatted string with the USDC symbol.
 * Handles decimal places appropriately (max 6 decimals for USDC precision).
 *
 * @param amount - The USDC amount to format (decimal number)
 * @returns Formatted string with USDC symbol (e.g., "10.50 USDC")
 *
 * @example
 * formatUSDC(10.5)
 * // Returns: "10.50 USDC"
 *
 * @example
 * formatUSDC(0.123456)
 * // Returns: "0.123456 USDC"
 *
 * @example
 * formatUSDC(1000)
 * // Returns: "1,000.00 USDC"
 */
export function formatUSDC(amount: number): string {
  // Format with up to 6 decimal places (USDC precision)
  // Remove trailing zeros after decimal point
  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });

  return `${formatted} USDC`;
}

/**
 * Wallet session data model for persistent authentication.
 * Stored in Expo SecureStore for encrypted local storage.
 */
export interface WalletSession {
  /**
   * Solana wallet public address (base58-encoded, 32-44 characters).
   * Retrieved from wallet.smartWalletPubkey.toString() after connection.
   * Example: "3jeq5nuZ3a89zpmDCvvMfxs3YJYG1jFtonrgkjyHrdu"
   */
  publicKey: string;

  /**
   * WebAuthn credential ID from Lazorkit Portal.
   * For MVP, can use placeholder like "lazorkit" if SDK doesn't expose this directly.
   */
  credentialId: string;

  /**
   * Unix timestamp (milliseconds) when wallet was created.
   * Used for session age tracking (if implementing expiration).
   */
  createdAt: number;

  /**
   * Unix timestamp (milliseconds) of last app launch.
   * Updated each app launch, used for session age tracking.
   */
  lastAccessedAt: number;

  /**
   * Optional device identifier for multi-device awareness.
   * Can use Device.modelName from expo-device if desired.
   * Example: "iPhone 14 Pro"
   */
  deviceInfo?: string;
}

/**
 * Transaction request data model for USDC transfers.
 * Passed from Transfer Form to Transaction Confirm screen via navigation params.
 *
 * Used to build Solana SPL Token transfer transactions with all necessary details.
 */
export interface TransactionRequest {
  /**
   * Destination Solana address (base58-encoded).
   * Must be a valid Solana public key.
   * Example: "3jeq5nuZ3a89zpmDCvvMfxs3YJYG1jFtonrgkjyHrdu"
   */
  recipientAddress: string;

  /**
   * USDC amount in decimal format.
   * Example: 10.50 represents 10.50 USDC
   */
  amount: number;

  /**
   * USDC amount in lamports (smallest unit).
   * Calculated by multiplying amount by 1,000,000 (USDC has 6 decimals).
   * Example: 10.50 USDC = 10,500,000 lamports
   */
  amountLamports: number;

  /**
   * Optional transaction memo/note.
   * Can be used for transaction description or reference.
   */
  memo?: string;

  /**
   * Unix timestamp (milliseconds) when transaction was initiated.
   * Used for transaction tracking and debugging.
   */
  timestamp: number;
}

/**
 * Transaction status data model for tracking blockchain transaction lifecycle.
 * Returned by SolanaService.confirmTransaction() and used to update UI state.
 *
 * Tracks transaction from submission through confirmation or failure.
 */
export interface TransactionStatus {
  /**
   * Blockchain transaction signature (unique identifier).
   * Base58-encoded string, typically 87-88 characters.
   * Example: "5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW"
   */
  signature?: string;

  /**
   * Current transaction state.
   * - 'pending': Transaction submitted, waiting for confirmation
   * - 'confirmed': Transaction confirmed on blockchain (32 confirmations)
   * - 'failed': Transaction failed or rejected
   */
  status: 'pending' | 'confirmed' | 'failed';

  /**
   * Number of confirmations received from blockchain.
   * 32 confirmations = 'confirmed' commitment level (~15-20 seconds).
   */
  confirmations: number;

  /**
   * Error message if transaction failed.
   * User-friendly description of failure reason.
   */
  error?: string;

  /**
   * Solana Explorer URL for viewing transaction details.
   * Includes cluster parameter for Devnet.
   * Example: "https://explorer.solana.com/tx/5VERv8...?cluster=devnet"
   */
  explorerUrl?: string;

  /**
   * Unix timestamp (milliseconds) when transaction was submitted.
   * Used for calculating transaction duration.
   */
  submittedAt: number;

  /**
   * Unix timestamp (milliseconds) when transaction was confirmed.
   * Undefined if transaction is pending or failed.
   */
  confirmedAt?: number;
}

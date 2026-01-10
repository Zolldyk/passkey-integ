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

import * as SecureStore from 'expo-secure-store';
import type { WalletSession } from '../types';

/**
 * SecureStore key for wallet session data.
 * Data is encrypted using OS-level keychain (iOS) or EncryptedSharedPreferences (Android).
 */
const SESSION_KEY = 'WALLET_SESSION';

/**
 * WalletService handles wallet session persistence using Expo SecureStore.
 *
 * Session data includes wallet public key, credential ID, and timestamps.
 * This enables automatic reconnection after app restarts without re-authentication.
 *
 * All methods are static - no instantiation required.
 */
export class WalletService {
  /**
   * Save wallet session to encrypted SecureStore.
   * Called after successful wallet creation in Welcome screen.
   *
   * Session data is serialized to JSON and stored under key WALLET_SESSION.
   * Storage is encrypted using OS-level encryption (iOS Keychain, Android EncryptedSharedPreferences).
   *
   * @param session - WalletSession object containing publicKey, credentialId, timestamps
   * @throws Error if SecureStore.setItemAsync fails
   */
  static async saveSession(session: WalletSession): Promise<void> {
    try {
      const sessionJson = JSON.stringify(session);
      await SecureStore.setItemAsync(SESSION_KEY, sessionJson);
      if (__DEV__) {
        console.log('[WalletService] Session saved successfully:', {
          publicKey: session.publicKey.substring(0, 8) + '...',
          createdAt: new Date(session.createdAt).toISOString(),
        });
      }
    } catch (error) {
      console.error('[WalletService] Failed to save session:', error);
      throw error;
    }
  }

  /**
   * Load wallet session from encrypted SecureStore.
   * Called on app launch to check for existing authentication.
   *
   * Retrieves session JSON from SecureStore and parses it.
   * Updates lastAccessedAt timestamp to current time and re-saves.
   * Returns null if no session exists or if session data is corrupted.
   *
   * @returns WalletSession object if session exists and is valid, null otherwise
   */
  static async loadSession(): Promise<WalletSession | null> {
    try {
      const sessionJson = await SecureStore.getItemAsync(SESSION_KEY);
      if (!sessionJson) {
        console.log('[WalletService] No existing session found');
        return null;
      }

      const session = JSON.parse(sessionJson) as WalletSession;

      // Update lastAccessedAt to track when user last opened the app
      session.lastAccessedAt = Date.now();

      // Re-save session with updated timestamp
      try {
        await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
      } catch (updateError) {
        // Log but don't fail if update fails - still return the session
        if (__DEV__) {
          console.warn('[WalletService] Failed to update lastAccessedAt:', updateError);
        }
      }

      if (__DEV__) {
        console.log('[WalletService] Session loaded successfully:', {
          publicKey: session.publicKey.substring(0, 8) + '...',
          lastAccessedAt: new Date(session.lastAccessedAt).toISOString(),
        });
      }
      return session;
    } catch (error) {
      console.error('[WalletService] Failed to load session:', error);
      // If session is corrupted, return null and let user create new wallet
      return null;
    }
  }

  /**
   * Clear wallet session from encrypted SecureStore.
   * Called when user disconnects wallet.
   *
   * Deletes session data from SecureStore to prevent automatic reconnection.
   *
   * @throws Error if SecureStore.deleteItemAsync fails
   */
  static async clearSession(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(SESSION_KEY);
      if (__DEV__) {
        console.log('[WalletService] Session cleared successfully');
      }
    } catch (error) {
      console.error('[WalletService] Failed to clear session:', error);
      throw error;
    }
  }

  /**
   * Validate if a session is still valid.
   *
   * Checks if session exists and hasn't expired based on lastAccessedAt timestamp.
   * Sessions expire after 30 days of inactivity for security purposes.
   *
   * @param session - WalletSession object to validate, or null
   * @returns true if session is valid and not expired, false otherwise
   */
  static isSessionValid(session: WalletSession | null): boolean {
    if (!session) return false;

    // Check session age - expire after 30 days of inactivity
    const sessionAge = Date.now() - session.lastAccessedAt;
    const MAX_SESSION_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

    if (sessionAge >= MAX_SESSION_AGE) {
      if (__DEV__) {
        console.log('[WalletService] Session expired (age:', Math.floor(sessionAge / (24 * 60 * 60 * 1000)), 'days)');
      }
      return false;
    }

    return true;
  }
}

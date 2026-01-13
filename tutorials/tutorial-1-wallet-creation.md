# Tutorial 1: Wallet Creation with Biometric Authentication

## Introduction

Welcome to this hands-on tutorial on implementing biometric wallet authentication using the Lazorkit SDK! In this tutorial, you'll learn how to create a seamless wallet creation experience powered by WebAuthn passkeys—no seed phrases, no passwords, just your fingerprint or face id.

**What You'll Build:**

By the end of this tutorial, you'll have implemented a complete biometric wallet creation flow that:
- Opens a secure authentication portal in the user's browser
- Prompts for Face ID (iOS) or fingerprint authentication (Android)
- Creates a Solana wallet bound to the user's biometric credential
- Handles deep link callbacks to return the user to your app
- Persists the wallet session for automatic reconnection

**What You'll Learn:**

- Installing and configuring the Lazorkit SDK with required polyfills
- Setting up deep linking for authentication callbacks
- Configuring the LazorKitProvider with Devnet endpoints
- Building a wallet creation UI with the `useWallet` hook
- Handling authentication flow and navigation

**Time Required:** ~20-30 minutes

**Prerequisites:**

- **React Native Knowledge**: Familiarity with React hooks, components, and navigation
- **Expo CLI Installed**: Install with `npm install -g expo-cli` if needed
- **Development Environment**: iOS (Xcode) or Android (Android Studio) development tools
- **Physical Device with Biometrics**: Face ID, Touch ID, or fingerprint sensor (biometrics don't work reliably on simulators)
- **Expo SDK 54**: This tutorial assumes Expo SDK 54 or later

---

## Step 1: Install Dependencies

First, install the Lazorkit SDK and required polyfills.

### Install the Lazorkit SDK

```bash
npm install @lazorkit/wallet-mobile-adapter
```

### Install Required Polyfills

The Lazorkit SDK depends on several JavaScript APIs that aren't available in React Native by default. Install these polyfills:

```bash
npm install react-native-get-random-values react-native-url-polyfill buffer
```

**Package Versions** (from this project):

| Package | Version | Purpose |
|---------|---------|---------|
| `@lazorkit/wallet-mobile-adapter` | ^1.5.1 | Core SDK for passkey authentication and Solana wallet management |
| `@solana/web3.js` | ^1.98.4 | Solana blockchain interactions (installed as SDK dependency) |
| `react-native-get-random-values` | ~1.11.0 | Crypto randomness polyfill (CRITICAL - provides `crypto.getRandomValues()`) |
| `react-native-url-polyfill` | ^3.0.0 | URL API polyfill (CRITICAL - provides `URL` global for RPC and deep linking) |
| `buffer` | ^6.0.3 | Buffer polyfill (CRITICAL - provides `Buffer` global for Solana binary operations) |

### Why These Polyfills Are Required

- **react-native-get-random-values**: The Solana SDK uses `crypto.getRandomValues()` for cryptographic operations (keypair generation, transaction signing). React Native doesn't provide this API natively.
- **react-native-url-polyfill**: The Solana RPC client and deep linking logic use the `URL` class for parsing endpoints and callback URLs. React Native's JavaScriptCore doesn't include the full URL API.
- **buffer**: Solana transactions are binary data structures that use Node.js `Buffer` objects. React Native doesn't provide `Buffer` globally.

**Compatibility Note**: This tutorial uses Expo SDK 54. Ensure your Expo version is compatible with these polyfill versions.

---

## Step 2: Configure Polyfills

**CRITICAL**: Polyfills MUST be imported at the VERY TOP of your root layout file, before ANY other imports. The Solana SDK will crash if these APIs aren't available when it loads.

### Add Polyfill Imports to `app/_layout.tsx`

Open (or create) your root layout file at `app/_layout.tsx` and add these imports as the **first lines** of the file:

```typescript
// CRITICAL: Import polyfills FIRST, in this exact order
// Note: react-native-get-random-values is imported by @lazorkit/wallet-mobile-adapter internally
import 'react-native-url-polyfill/auto'; // MUST be first - provides URL API for Solana RPC and deep linking
import { Buffer } from 'buffer'; // MUST be second - provides Buffer for Solana binary operations
global.Buffer = global.Buffer || Buffer; // Assign Buffer to global namespace

// Now safe to import other modules after polyfills are loaded
// eslint-disable-next-line import/first -- Polyfills must be imported before other modules
import { LazorKitProvider } from '@lazorkit/wallet-mobile-adapter';
// ... other imports
```

**Source**: `app/_layout.tsx:1-9`

### Why Import Order Matters

The Solana SDK and Lazorkit adapter access these globals (`crypto`, `URL`, `Buffer`) during module initialization. If you import the SDK before the polyfills, you'll get errors like:

- `TypeError: Cannot read property 'getRandomValues' of undefined`
- `ReferenceError: Buffer is not defined`
- `ReferenceError: URL is not defined`

**Key Points:**

1. **react-native-url-polyfill** must be imported first (the SDK imports react-native-get-random-values internally)
2. **Buffer** must be assigned to `global.Buffer` so Solana SDK can find it
3. All polyfills must load **before** any Solana or Lazorkit imports

**Common Mistake**: Adding polyfills in the middle of your import list. They won't work if the SDK has already loaded!

---

## Step 3: Configure Deep Linking

Deep linking allows the Lazorkit Portal to redirect back to your app after authentication. You must configure a unique URL scheme in your `app.json` configuration file.

### Add Deep Linking Configuration to `app.json`

Open your `app.json` file and add the following fields inside the `expo` object:

```json
{
  "expo": {
    "scheme": "lazorkitstarter",
    "ios": {
      "bundleIdentifier": "com.lazorkitstarter.app"
    },
    "android": {
      "package": "com.lazorkitstarter.app"
    }
  }
}
```

**Source**: `app.json:10,18-19,26`

### What Deep Linking Is

Deep linking is a mechanism that allows URLs to open specific screens in your mobile app. When a user authenticates in the Lazorkit Portal (which opens in their browser), the portal redirects back to your app using a deep link like:

```
lazorkitstarter://callback?token=...
```

The operating system sees this URL, recognizes the `lazorkitstarter://` scheme, and opens your app at the callback route.

### Configuration Fields Explained

- **`scheme`**: Your app's unique deep link URL scheme. This should be:
  - Unique (avoid conflicts with other apps)
  - Lowercase (iOS requirement)
  - No special characters or spaces
  - Match the scheme you'll use in `LazorKitProvider` configuration

- **`ios.bundleIdentifier`**: Your iOS app's unique identifier. This must match your Apple Developer account configuration.

- **`android.package`**: Your Android app's package name. This must match your Google Play Console configuration.

### Choosing a Unique Scheme

Choose a scheme name that's unlikely to conflict with other apps. Good patterns:
- Your company name + "app": `acmecorpapp://`
- Your app name: `mywallet://`
- A unique prefix: `mycompany-wallet://`

**Important**: After changing `app.json`, you must rebuild your app (changes don't apply via over-the-air updates).

### Testing Deep Links

You can test that your deep linking configuration works with this command:

```bash
# iOS
npx uri-scheme open lazorkitstarter://test --ios

# Android
npx uri-scheme open lazorkitstarter://test --android
```

This should open your app if deep linking is configured correctly.

---

## Step 4: Setup LazorKitProvider

The `LazorKitProvider` is a React Context provider that wraps your entire app and provides wallet functionality to all child components. You'll configure it with:
- A Solana RPC endpoint (Devnet for development)
- The Lazorkit Portal URL (for WebAuthn authentication)
- A Paymaster URL (for gasless transactions)

### Configure LazorKitProvider in `app/_layout.tsx`

In your `app/_layout.tsx` file (after the polyfill imports), wrap your navigation stack with `LazorKitProvider`:

```typescript
// CRITICAL: Import polyfills FIRST (see Step 2)
import 'react-native-url-polyfill/auto';
import { Buffer } from 'buffer';
global.Buffer = global.Buffer || Buffer;

// Now safe to import other modules after polyfills are loaded
// eslint-disable-next-line import/first -- Polyfills must be imported before other modules
import { LazorKitProvider } from '@lazorkit/wallet-mobile-adapter';
// eslint-disable-next-line import/first -- Polyfills must be imported before other modules
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <LazorKitProvider
      rpcUrl="https://api.devnet.solana.com" // Solana Devnet RPC endpoint for blockchain interactions
      portalUrl="https://portal.lazor.sh" // Lazorkit Portal for WebAuthn passkey authentication
      configPaymaster={{
        paymasterUrl: 'https://kora.devnet.lazorkit.com', // Lazorkit Paymaster for gasless transactions
      }}
    >
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Welcome' }} />
        <Stack.Screen name="callback" options={{ headerShown: false }} />
        <Stack.Screen name="home" options={{ title: 'Wallet' }} />
      </Stack>
    </LazorKitProvider>
  );
}
```

**Source**: `app/_layout.tsx:1-42`

### LazorKitProvider Props Explained

**`rpcUrl`** (required):
- The Solana RPC endpoint your app will use for blockchain interactions
- **Devnet**: `https://api.devnet.solana.com` (for development/testing)
- **Mainnet**: `https://api.mainnet-beta.solana.com` (for production)
- Used for: Balance queries, transaction submission, confirmation polling

**`portalUrl`** (required):
- The Lazorkit Portal URL that handles WebAuthn authentication
- **Production**: `https://portal.lazor.sh`
- The portal manages the WebAuthn credential creation ceremony and presents the biometric prompt

**`configPaymaster.paymasterUrl`** (required):
- The paymaster service that sponsors transaction gas fees
- **Devnet**: `https://kora.devnet.lazorkit.com`
- **Mainnet**: Contact Lazorkit for mainnet paymaster access
- Allows users to send transactions without holding SOL for gas fees

### How the Provider Works

`LazorKitProvider` creates a React Context that provides the `useWallet()` hook to all child components. This hook gives you access to:
- `wallet.connect()` - Start authentication flow
- `wallet.disconnect()` - Clear wallet session
- `wallet.isConnected` - Check connection status
- `wallet.isConnecting` - Check if authentication is in progress
- `wallet.smartWalletPubkey` - Get user's Solana public key
- `wallet.signAndSendTransaction()` - Sign and submit transactions

**Note on Mainnet vs Devnet**: For production apps, change `rpcUrl` to mainnet and ensure you have a mainnet paymaster configured. Everything else stays the same.

---

## Step 5: Implement Wallet Creation UI

Now that the SDK is configured, let's build the UI that lets users create a wallet with biometrics.

### Create Welcome Screen with Wallet Creation Button

Create (or update) `app/index.tsx` with the following code:

```typescript
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useWallet } from '@lazorkit/wallet-mobile-adapter';

export default function WelcomeScreen() {
  const wallet = useWallet(); // Access wallet context from LazorKitProvider
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  // Handle wallet creation button press
  const handleCreateWallet = async () => {
    setError(null); // Clear any previous errors

    try {
      // Initiate wallet creation - SDK will open Lazorkit Portal in browser
      await wallet.connect({
        redirectUrl: 'lazorkitstarter://callback', // MUST match scheme in app.json
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

  // Auto-navigate to home screen after successful wallet connection
  useEffect(() => {
    if (wallet.isConnected && wallet.smartWalletPubkey) {
      router.replace('/home');
    }
  }, [wallet.isConnected, wallet.smartWalletPubkey, router]);

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

        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 32,
    maxWidth: 400,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#171717',
    textAlign: 'center',
    marginBottom: 24,
  },
  description: {
    fontSize: 15,
    color: '#171717',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#9945FF', // Solana purple
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    minHeight: 48,
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
    fontWeight: '600',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
});
```

**Source**: `app/index.tsx:1-186` (simplified version focusing on wallet creation)

### useWallet Hook Properties and Methods

The `useWallet()` hook returns an object with the following properties:

**State Properties:**

- **`wallet.isConnected`**: Boolean indicating if the wallet is currently connected
  - `true` after successful authentication
  - `false` before authentication or after disconnect
  - **CRITICAL**: Use `isConnected`, NOT `connected` 

- **`wallet.isConnecting`**: Boolean indicating if authentication is in progress
  - `true` while SDK is opening portal and waiting for callback
  - `false` when idle or after completion
  - **CRITICAL**: Use `isConnecting`, NOT `connecting`

- **`wallet.smartWalletPubkey`**: PublicKey object or `null`
  - Contains the user's Solana wallet address after successful connection
  - Type: `PublicKey` from `@solana/web3.js`
  - Access string representation with: `wallet.smartWalletPubkey.toString()`
  - **CRITICAL**: Use `smartWalletPubkey`, NOT `publicKey`

**Methods:**

- **`wallet.connect(options)`**: Initiates the authentication flow
  - Opens Lazorkit Portal in system browser
  - Portal triggers WebAuthn biometric prompt
  - Returns a Promise that resolves when authentication completes
  - **Options**: `{ redirectUrl: 'your-scheme://callback' }` (must match app.json scheme)

- **`wallet.disconnect()`**: Clears wallet session and disconnects
  - Sets `isConnected` to `false`
  - Clears `smartWalletPubkey`
  - Usually called when user wants to log out

- **`wallet.signAndSendTransaction(transaction)`**: Signs and submits a transaction (covered in Tutorial 2)

### Critical SDK API Naming Convention

**IMPORTANT**: The Lazorkit SDK uses specific property names that differ from some documentation examples:

| Correct | Wrong |
|-----------|----------|
| `wallet.isConnected` | `wallet.connected` |
| `wallet.isConnecting` | `wallet.connecting` |
| `wallet.smartWalletPubkey` | `wallet.publicKey` |

Using the wrong property names will cause TypeScript errors and runtime failures.

### User Flow Explanation

When the user taps "Create Wallet with Biometrics":

1. `handleCreateWallet()` calls `wallet.connect({ redirectUrl: '...' })`
2. SDK opens Lazorkit Portal in the system browser (via `expo-web-browser`)
3. Portal initiates WebAuthn credential creation
4. Native OS prompts for biometric authentication (Face ID/Touch ID/Fingerprint)
5. User authenticates with biometrics
6. Portal creates Solana wallet bound to the passkey
7. Portal redirects back via deep link: `lazorkitstarter://callback?token=...`
8. SDK processes callback, updates `wallet.isConnected` to `true`, sets `wallet.smartWalletPubkey`
9. React useEffect detects state change and navigates to home screen

---

## Step 6: Handle Authentication Callback

After the user authenticates in the Lazorkit Portal, the SDK needs to detect when the wallet connection succeeds and navigate the user to the appropriate screen.

### Automatic Navigation with useEffect

The wallet state changes are handled by the `useEffect` hook in the Welcome screen:

```typescript
// Auto-navigate to home screen after successful wallet connection
useEffect(() => {
  if (wallet.isConnected && wallet.smartWalletPubkey) {
    router.replace('/home'); // Navigate to home screen
  }
}, [wallet.isConnected, wallet.smartWalletPubkey, router]);
```

**Source**: `app/index.tsx:75-106`

### Authentication Callback Flow

Here's the complete sequence of events during authentication:

```
┌─────────────┐
│ 1. User taps│
│   "Create   │
│   Wallet"   │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────┐
│ 2. wallet.connect() called       │
│    SDK opens Lazorkit Portal     │
│    in system browser             │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│ 3. Portal initiates WebAuthn     │
│    credential creation ceremony  │
└──────┬───────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ 4. Native biometric prompt      │
│    appears (Face ID/Touch ID)   │
└──────┬──────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│ 5. User authenticates            │
│    OS creates passkey credential │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│ 6. Portal generates Solana       │
│    wallet bound to passkey       │
└──────┬───────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ 7. Portal redirects via deep    │
│    link: scheme://callback?token│
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│ 8. OS opens app, SDK receives   │
│    deep link and processes token│
└──────┬──────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│ 9. SDK updates wallet state:     │
│    - isConnected = true          │
│    - smartWalletPubkey = address │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│ 10. useEffect detects state      │
│     change and navigates to      │
│     home screen                  │
└──────────────────────────────────┘
```

### Key Points About the Callback

**Deep Link Processing**: The SDK automatically handles the deep link callback. You don't need to manually parse the token or process the callback URL. The SDK:
- Listens for deep links matching your configured scheme
- Extracts the authentication token from the URL
- Validates the token with the Lazorkit backend
- Updates the wallet context state

**State Updates**: When the callback is processed, the SDK sets:
- `wallet.isConnected = true`
- `wallet.smartWalletPubkey = [PublicKey object]`

**Navigation**: Your React component detects these state changes via the `useEffect` hook and navigates accordingly.

### Session Persistence

After successful wallet creation, the session persists across app restarts. This is handled by the `WalletService`:

```typescript
// Save session after connection (from app/index.tsx)
useEffect(() => {
  async function saveSessionAndNavigate() {
    if (wallet.isConnected && wallet.smartWalletPubkey) {
      try {
        const session: WalletSession = {
          publicKey: wallet.smartWalletPubkey.toString(),
          credentialId: 'lazorkit',
          createdAt: Date.now(),
          lastAccessedAt: Date.now(),
        };
        await WalletService.saveSession(session);
      } catch (error) {
        console.error('Failed to save session:', error);
      }
      router.replace('/home');
    }
  }
  saveSessionAndNavigate();
}, [wallet.isConnected, wallet.smartWalletPubkey, router]);
```

**Source**: `app/index.tsx:75-106`

On app restart, the Welcome screen checks for an existing session and automatically navigates to the home screen:

```typescript
// Check for existing session on app launch (from app/index.tsx)
useEffect(() => {
  async function checkExistingSession() {
    const session = await WalletService.loadSession();
    const isValid = WalletService.isSessionValid(session);

    if (isValid) {
      router.replace('/home'); // Skip welcome screen, go directly to home
    }
  }
  checkExistingSession();
}, []);
```

**Source**: `app/index.tsx:42-68`

---

## Troubleshooting

### Issue 1: "TypeError: Cannot read property 'getRandomValues' of undefined"

**Cause**: Polyfills not loaded or loaded in wrong order.

**Solution**:
1. Check that `react-native-url-polyfill/auto` is imported at the VERY TOP of `app/_layout.tsx`
2. Check that polyfills are imported BEFORE any Solana or Lazorkit imports
3. The Lazorkit SDK imports `react-native-get-random-values` internally, so you don't need to import it explicitly
4. Verify all polyfill packages are installed: `npm list react-native-get-random-values react-native-url-polyfill buffer`


### Issue 2: "Deep link not opening app after authentication"

**Cause**: Scheme mismatch between `app.json` and `wallet.connect()` options, or deep linking not configured properly.

**Solution**:
1. Verify the `scheme` field in `app.json` matches the `redirectUrl` in `wallet.connect()`:
   ```typescript
   // app.json
   "scheme": "lazorkitstarter"

   // app/index.tsx
   await wallet.connect({ redirectUrl: 'lazorkitstarter://callback' });
   ```
2. Rebuild your app after changing `app.json` (deep linking config doesn't apply via OTA updates)
3. Test deep linking with: `npx uri-scheme open lazorkitstarter://test --ios`

**Additional Debugging**:
- Check iOS Console logs for deep link errors (Xcode > Window > Devices and Simulators > Open Console)
- Check Android logcat for deep link errors: `adb logcat | grep -i "intent"`
- Ensure you're using a development build, not Expo Go (custom schemes require native code)

### Issue 3: "Biometric prompt not appearing"

**Cause**: Testing on simulator (biometrics require physical device).

**Solution**:
1. Test on a physical device with Face ID/Touch ID enabled
2. Ensure biometric authentication is set up in device settings:
   - **iOS**: Settings > Face ID & Passcode (or Touch ID & Passcode)
   - **Android**: Settings > Security > Fingerprint
3. Note: Expo Go may have limitations with biometric prompts; use a development build for full support

**Development Build Command**:
```bash
# iOS
eas build --profile development --platform ios

# Android
eas build --profile development --platform android
```

### Issue 4: "App stuck on 'Connecting...' indefinitely"

**Cause**: Network error, portal redirect timeout, or deep link callback not received.

**Solution**:
1. Check network connectivity (portal requires internet access)
2. Verify portal URL is correct: `https://portal.lazor.sh`
3. Check Expo logs for errors:
   ```bash
   npx expo start --dev-client
   ```
4. Look for timeout or network errors in the Metro bundler console
5. Ensure the user isn't stuck in the browser (manually switch back to the app)

**Debugging Tips**:
- Add console logs in the `handleCreateWallet` catch block to see error details
- Check if `wallet.isConnecting` ever becomes `false` (it should after completion or error)
- Verify the portal URL is reachable: `curl https://portal.lazor.sh`

### Issue 5: "Buffer is not defined"

**Cause**: Buffer polyfill not assigned to global namespace.

**Solution**:
1. Ensure you have this line in `app/_layout.tsx`:
   ```typescript
   import { Buffer } from 'buffer';
   global.Buffer = global.Buffer || Buffer;
   ```
2. Check that this appears BEFORE any Solana or Lazorkit imports
3. Verify the `buffer` package is installed: `npm list buffer`

### Issue 6: "Property 'isConnected' does not exist on type 'WalletContextState'"

**Cause**: Using incorrect property name from outdated documentation.

**Solution**: Use the correct SDK property names:
- Use `wallet.isConnected` (NOT `wallet.connected`)
- Use `wallet.isConnecting` (NOT `wallet.connecting`)
- Use `wallet.smartWalletPubkey` (NOT `wallet.publicKey`)


### Issue 7: ESLint error "Import 'X' must come before 'Y'"

**Cause**: ESLint enforces import ordering, but polyfills must violate this rule.

**Solution**: Add the ESLint disable comment after polyfill imports:
```typescript
import 'react-native-url-polyfill/auto';
import { Buffer } from 'buffer';
global.Buffer = global.Buffer || Buffer;

// eslint-disable-next-line import/first -- Polyfills must be imported before other modules
import { LazorKitProvider } from '@lazorkit/wallet-mobile-adapter';
```

---

## Next Steps

Congratulations! You've successfully implemented biometric wallet creation with Lazorkit SDK. Here's what you can explore next:

### Tutorial 2: Gasless USDC Transactions with Lazorkit Paymaster
Learn how to send USDC transactions without requiring users to hold SOL for gas fees. This tutorial covers:
- Building a transfer form with amount and recipient inputs
- Validating Solana addresses and amounts
- Using the paymaster for gasless transactions
- Handling transaction confirmation and errors

**File**: `tutorial-2-gasless-transactions.md`

### Explore the Codebase

Check out these files to see wallet features in action:
- **`app/home.tsx`**: See how to display wallet balance and address
- **`app/transfer.tsx`**: See the complete USDC transfer form implementation
- **`services/WalletService.ts`**: Explore session persistence logic
- **`utils/ValidationUtils.ts`**: See Solana address and amount validation

---

## Additional Resources

### Official Documentation

- **Lazorkit SDK Documentation**: [https://docs.lazor.sh](https://docs.lazor.sh)
- **Solana Web3.js Documentation**: [https://solana-labs.github.io/solana-web3.js/](https://solana-labs.github.io/solana-web3.js/)
- **Expo Router Documentation**: [https://docs.expo.dev/router/introduction/](https://docs.expo.dev/router/introduction/)
- **Expo SecureStore API**: [https://docs.expo.dev/versions/latest/sdk/securestore/](https://docs.expo.dev/versions/latest/sdk/securestore/)

### WebAuthn and Passkeys

- **WebAuthn Guide**: [https://webauthn.guide/](https://webauthn.guide/)
- **Passkeys.dev**: [https://passkeys.dev/](https://passkeys.dev/)
- **Apple Face ID Documentation**: [https://developer.apple.com/face-id/](https://developer.apple.com/face-id/)

### Solana Resources

- **Solana Explorer (Devnet)**: [https://explorer.solana.com/?cluster=devnet](https://explorer.solana.com/?cluster=devnet)
  - Use this to look up wallet addresses and transactions
- **Solana Cookbook**: [https://solanacookbook.com/](https://solanacookbook.com/)
- **Solana Airdrop (Devnet)**: [https://solfaucet.com/](https://solfaucet.com/)
  - Get free devnet SOL for testing (though you don't need it with Lazorkit paymaster!)

### Project Resource

- **Repository README**: [../README.md](../README.md) - Project overview and setup instructions

---

## Full Source Code Reference

All code snippets in this tutorial are extracted from the actual repository. Here are direct links to the full source files:

### Configuration Files

- **Polyfill Configuration**: [`app/_layout.tsx`](../../app/_layout.tsx) - Lines 1-5 (polyfill imports)
- **LazorKitProvider Setup**: [`app/_layout.tsx`](../../app/_layout.tsx) - Lines 20-42 (provider configuration)
- **Deep Linking Config**: [`app.json`](../../app.json) - Lines 10, 18-19, 26 (scheme and bundle IDs)
- **Package Versions**: [`package.json`](../../package.json) - Lines 11-30 (dependencies)

### Implementation Files

- **Wallet Creation UI**: [`app/index.tsx`](../../app/index.tsx) - Complete Welcome screen implementation
- **Wallet Home Screen**: [`app/home.tsx`](../../app/home.tsx) - Connected wallet state display
- **Session Service**: [`services/WalletService.ts`](../../services/WalletService.ts) - Session persistence logic
- **Type Definitions**: [`types/index.ts`](../../types/index.ts) - WalletSession interface

---

**Happy building with Lazorkit!**
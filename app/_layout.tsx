// CRITICAL: Import polyfills FIRST, in this exact order
// Note: react-native-get-random-values is imported by @lazorkit/wallet-mobile-adapter internally
import 'react-native-url-polyfill/auto'; // MUST be first - provides URL API for Solana RPC and deep linking
import { Buffer } from 'buffer'; // MUST be second - provides Buffer for Solana binary operations
global.Buffer = global.Buffer || Buffer; // Assign Buffer to global namespace

// Now safe to import other modules after polyfills are loaded
import { LazorKitProvider } from '@lazorkit/wallet-mobile-adapter';
import { Stack } from 'expo-router';

/**
 * Root layout component for the Lazorkit Mobile Wallet Starter.
 * Configures the LazorKitProvider with Devnet RPC, Portal, and Paymaster.
 *
 * Note: Session loading and auto-navigation handled in Welcome screen (index.tsx) for simplicity.
 * The SDK manages its own wallet state internally.
 */
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
        {/* Callback screen - handles deep link redirect from Portal */}
        <Stack.Screen name="callback" options={{ headerShown: false }} />
        {/* Home screen - displays wallet address after successful authentication */}
        <Stack.Screen name="home" options={{ title: 'Wallet' }} />
        {/* Transfer screen - USDC transfer form with input validation (Story 2.1) */}
        <Stack.Screen name="transfer" options={{ title: 'Send USDC' }} />
      </Stack>
    </LazorKitProvider>
  );
}

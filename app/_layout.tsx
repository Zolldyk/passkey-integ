// CRITICAL: Import polyfills FIRST, in this exact order
// These polyfills are required for @solana/web3.js to function correctly in React Native
import 'react-native-get-random-values'; // MUST be first - provides crypto randomness for Solana SDK
import 'react-native-url-polyfill/auto'; // MUST be second - provides URL API for Solana RPC and deep linking
import { Buffer } from 'buffer'; // MUST be third - provides Buffer for Solana binary operations
global.Buffer = global.Buffer || Buffer; // Assign Buffer to global namespace

// Now safe to import other modules after polyfills are loaded
import { LazorKitProvider } from '@lazorkit/wallet-mobile-adapter';
import { Stack } from 'expo-router';

/**
 * Root layout component for the Lazorkit Mobile Wallet Starter.
 * Configures the LazorKitProvider with Devnet RPC, Portal, and Paymaster.
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
        {/* Future screens will be added in later stories */}
      </Stack>
    </LazorKitProvider>
  );
}

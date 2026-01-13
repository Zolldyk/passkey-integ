# Lazorkit Mobile Starter - Biometric Wallet & Gasless Transactions

![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue)
![Expo SDK](https://img.shields.io/badge/Expo%20SDK-54-black)

A production-ready React Native starter template demonstrating biometric wallet authentication and gasless USDC transfers on Solana. This educational template showcases WebAuthn passkey integration with Face ID/Touch ID and Lazorkit Paymaster for gasless blockchain transactions. It is built with Expo SDK 54, TypeScript, and Solana web3.js. applications.

## Key Features

- **Face ID/Touch ID Biometric Authentication** - WebAuthn passkey-based wallet creation with native biometric security (iOS Face ID, Android Biometric API)
- **Gasless USDC Transfers on Solana** - Users send tokens without holding SOL for transaction fees via Lazorkit Paymaster integration
- **Session Persistence with Encrypted Storage** - Wallet sessions stored securely in iOS Keychain and Android EncryptedSharedPreferences
- **Production-Ready TypeScript Codebase** - Strict type safety, clean architecture with separation of concerns (services, utils, components)
- **File-Based Navigation with Expo Router** - Intuitive routing built on React Navigation with deep linking support
- **Educational Tutorials and Documentation** - Step-by-step guides covering wallet creation and transaction implementation

## Architecture Overview

This is a **client-side mobile application** built with React Native and Expo. There is no custom backend - the app communicates directly with Solana Devnet RPC and Lazorkit services (Portal for authentication, Paymaster for gasless transactions). The architecture emphasizes simplicity and educational clarity, making it ideal for developers learning Solana mobile development.

**Technology Stack:**
- React Native 0.83.x (via Expo SDK 54)
- TypeScript 5.9.3
- @lazorkit/wallet-mobile-adapter for biometric wallets
- @solana/web3.js 1.98.4 for blockchain interactions
- @solana/spl-token 0.4.14 for USDC token transfers

## Prerequisites

Before starting, ensure you have the following installed:

**Required:**
- **Node.js** v18+ or v20+ (LTS recommended)
- **npm** v9+ or **yarn**
- **Git**
- **Expo CLI** (no global install required - use via `npx`)

**Optional (for specific platforms):**
- **iOS Development**: macOS with Xcode 14+ from Mac App Store (required for iOS Simulator)
- **Android Development**: Android Studio with SDK 33+ and `ANDROID_HOME` environment variable configured

**Important Notes:**
- **Physical device required for biometric testing**: Face ID and Touch ID do not work reliably on simulators. You will need an actual iPhone (iOS 13+) or Android device (Android 8.0+) to test WebAuthn passkey authentication with biometrics.
- **Minimum OS versions**: iOS 13+ and Android 8.0+ for WebAuthn support

## Installation

Follow these steps to set up the project locally:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-org/lazorkit-mobile-starter.git
   ```

2. **Navigate to the project directory:**
   ```bash
   cd lazorkit-mobile-starter
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Verify installation:**
   ```bash
   npx expo doctor
   ```

**Configuration:**
No environment variables are required for the Devnet demo. All configuration (RPC URL, Portal URL, Paymaster URL) is hardcoded in `app/_layout.tsx` for simplicity.

**Estimated installation time:** ~5 minutes

## Run the App

### Start Development Server

```bash
npm start
```

This will start the Expo development server and display a QR code in your terminal.

### Platform-Specific Commands

**iOS Simulator (requires macOS with Xcode):**
```bash
npm run ios
```

**Android Emulator (requires Android Studio):**
```bash
npm run android
```

### Physical Device Testing (Recommended)

For full biometric authentication testing, use a physical device:

1. Install **Expo Go** from the App Store (iOS) or Google Play (Android)
2. Scan the QR code from the Metro bundler terminal output
3. The app will load on your physical device

**Critical Note:** Biometric authentication (Face ID/Touch ID) requires physical devices. Simulators and emulators cannot reliably test WebAuthn passkey flows with native biometric APIs.

## Tutorials

This repository includes comprehensive step-by-step tutorials:

### Tutorial 1: Wallet Creation with Biometric Authentication
**[tutorials/tutorial-1-wallet-creation.md](tutorials/tutorial-1-wallet-creation.md)**

Learn how to implement passkey-based wallet creation with Face ID/Touch ID integration. Covers polyfill configuration, LazorKitProvider setup, deep linking, and biometric authentication flows.

**Duration:** ~20-30 minutes

### Tutorial 2: Gasless USDC Transactions with Lazorkit Paymaster
**[tutorials/tutorial-2-gasless-transactions.md](tutorials/tutorial-2-gasless-transactions.md)**

Build gasless SPL token transfers using Solana web3.js and paymaster integration. Covers transaction construction, paymaster signing, and blockhash management.

**Duration:** ~30-40 minutes

**Prerequisites:** Tutorial 2 assumes completion of Tutorial 1
**Target Audience:** Developers familiar with React Native and Expo basics

## Troubleshooting

### "Polyfill errors on app launch"

**Error:** `Cannot read property 'getRandomValues' of undefined` or `Buffer is not defined`

**Solution:** Ensure polyfills are loaded in the correct order at the top of `app/_layout.tsx`:
```typescript
import 'react-native-url-polyfill/auto';
import { Buffer } from 'buffer';
global.Buffer = Buffer;
import 'react-native-get-random-values';
```

**Why:** Solana SDK requires these globals during module initialization. See Tutorial 1 Step 2 for details.

### "Deep linking not working on Android"

**Solution:** Verify the `scheme` in `app.json` matches and doesn't conflict with other installed apps. Test deep links with:
```bash
npx uri-scheme open lazorkitstarter://callback --android
```

### "Face ID/Touch ID not working"

**Solution:** Use a physical device for testing. Simulators cannot reliably test WebAuthn passkey flows with native biometric APIs.

**iOS Simulator Workaround:** You can enroll Face ID via Features > Face ID menu in the simulator, but the full portal authentication flow may not work correctly.

### "USDC balance shows 0"

**Solution:** This app uses Solana Devnet (test network), not Mainnet. Get test USDC from the SPL Token Faucet:
- [https://spl-token-faucet.com/?token-name=USDC-Dev](https://spl-token-faucet.com/?token-name=USDC-Dev)
- Enter your wallet address from the Home screen
- Request test USDC tokens

### "Transaction fails with blockhash not found"

**Solution:** Blockhashes expire after approximately 60 seconds on Solana. Always fetch a fresh blockhash immediately before signing transactions. See Tutorial 2 for proper blockhash management.

### "Module not found" errors

**Solution:** Delete `node_modules/`, reinstall dependencies, and restart Metro bundler with cache clearing:
```bash
rm -rf node_modules
npm install
npm start --clear
```

For additional troubleshooting, see the troubleshooting sections in Tutorial 1 and Tutorial 2.

## Project Structure

```
lazorkit-mobile-starter/
├── app/                      # Expo Router file-based routes (screens)
│   ├── _layout.tsx           # Root layout with LazorKitProvider and polyfills
│   ├── index.tsx             # Welcome/Onboarding screen
│   ├── home.tsx              # Wallet Home screen (shows balance)
│   ├── transfer.tsx          # Transfer Form screen
│   └── confirm.tsx           # Transaction Confirm screen
├── components/               # Reusable UI components
├── services/                 # Business logic and API integration
│   ├── SolanaService.ts      # Blockchain RPC interactions (balance, transfer)
│   ├── WalletService.ts      # Session management (save/load/clear)
│   └── constants.ts          # App constants (RPC URLs, token addresses)
├── utils/                    # Pure utility functions
│   ├── ValidationUtils.ts    # Input validation (address format, amounts)
│   └── FormattingUtils.ts    # Display formatting (balance, addresses)
├── types/                    # TypeScript type definitions
│   └── index.ts              # Shared types (WalletSession, etc.)
├── tutorials/                # Step-by-step educational tutorials
│   ├── tutorial-1-wallet-creation.md
│   └── tutorial-2-gasless-transactions.md
├
├── app.json                  # Expo configuration (deep linking, permissions)
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
└── README.md                 # This file
```

**Critical Files:**
- **app/_layout.tsx** - Polyfill imports and LazorKitProvider configuration (must be loaded first)
- **app.json** - Deep linking scheme configuration required for Lazorkit Portal authentication
- **services/SolanaService.ts** - Core blockchain interaction logic
- **services/constants.ts** - RPC URLs, paymaster configuration, and token addresses

## Resources

### Lazorkit Documentation
- [Lazorkit SDK Documentation](https://lazorkit.com/docs) - Official SDK reference and integration guides
- [Lazorkit Portal](https://portal.lazor.sh) - WebAuthn passkey authentication service
- [Lazorkit Paymaster](https://kora.devnet.lazorkit.com) - Gasless transaction sponsorship (Devnet)

### Solana Resources
- [Solana Web3.js Documentation](https://solana-labs.github.io/solana-web3.js/) - Blockchain interactions and transaction construction
- [Solana Explorer (Devnet)](https://explorer.solana.com/?cluster=devnet) - View transactions and accounts on the blockchain
- [SPL Token Documentation](https://spl.solana.com/token) - Token accounts, transfers, and SPL Token program
- [Solana Cookbook](https://solanacookbook.com/) - Practical Solana development guides and code examples

### Mobile Development
- [Expo Documentation](https://docs.expo.dev/) - Expo SDK and platform documentation
- [React Native Documentation](https://reactnative.dev/) - React Native API reference

### WebAuthn and Passkeys
- [WebAuthn Guide](https://webauthn.guide/) - Understanding passkey authentication fundamentals
- [Passkeys.dev](https://passkeys.dev/) - Passkey implementation resources and best practices

## What's Next?

After getting the app running, here are suggested next steps:

1. **Complete both tutorials** - Work through Tutorial 1 and Tutorial 2 to understand the implementation details
2. **Fork and customize** - Clone this repository and adapt it for your specific use case
3. **Configure for production** - Replace Devnet configuration with Mainnet RPC and paymaster URLs
4. **Add custom branding** - Implement your own UI styling and design system
5. **Extend functionality** - Add features like transaction history, multi-token support, address book, etc.

**Moving to Production:**
- Update RPC URL from `https://api.devnet.solana.com` to a production Solana RPC provider
- Configure production paymaster URL (or remove paymaster and require users to hold SOL)
- Update USDC token address from Devnet to Mainnet: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- Test thoroughly on physical devices before App Store/Google Play submission

## Acknowledgments

Built with the [Lazorkit SDK](https://lazorkit.com) for biometric wallet authentication and gasless transaction support. 
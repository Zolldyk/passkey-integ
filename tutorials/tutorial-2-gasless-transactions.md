# Tutorial 2: Gasless USDC Transactions with Lazorkit Paymaster

## Introduction

In traditional blockchain applications, users need native cryptocurrency (like SOL on Solana) to pay for transaction fees, even when they're just sending tokens like USDC. This creates a major onboarding friction: users must acquire SOL before they can use your app to send USDC.

**Gasless transactions solve this problem.** With Lazorkit's paymaster integration, users can send USDC without holding any SOL. The paymaster service sponsors the transaction fees on behalf of the user, creating a seamless experience where users only need the tokens they want to send.

### What is a Paymaster?

A paymaster is a third-party service that pays transaction fees on behalf of users. Here's how it works:

1. **User builds and signs transaction** - The user creates a transfer transaction and signs it with their biometric authentication
2. **Paymaster receives signed transaction** - The Lazorkit SDK automatically sends the signed transaction to the paymaster service
3. **Paymaster adds fee payment** - The paymaster validates the transaction and adds a fee payer instruction (using their own SOL)
4. **Paymaster submits to blockchain** - The sponsored transaction is submitted to the Solana network

**Trustless security:** Users only sign the transfer instruction itself, not the fee payment. The paymaster adds its own fee payment after receiving the user's signature. This means users always know exactly what they're signing.

### Prerequisites

Before starting this tutorial, you should have:

- Completed [Tutorial 1: Wallet Creation with Biometric Authentication](./tutorial-1-wallet-creation.md)
- Basic understanding of React Native and Expo
- Familiarity with Solana blockchain concepts (accounts, transactions, tokens)
- Knowledge of TypeScript and async/await patterns
- Understanding of `@solana/web3.js` library basics

### What You'll Build

In this tutorial, you'll implement a complete gasless USDC transfer flow:

1. **Transfer Form** - Input validation for recipient address and amount
2. **Transaction Preview** - Display transaction details before signing
3. **Transaction Building** - Construct SPL Token transfer instruction using @solana/web3.js
4. **Biometric Signing** - Trigger Face ID/Touch ID authentication
5. **Gasless Submission** - Automatic paymaster sponsorship via Lazorkit SDK
6. **Confirmation Polling** - Monitor blockchain for transaction confirmation
7. **Success Display** - Show transaction details with Solana Explorer link

### Time Required

Approximately **30-40 minutes** to complete all steps.

### Related Resources

- [Tutorial 1: Wallet Creation](./tutorial-1-wallet-creation.md) - Complete wallet setup first
- [Project README](../README.md) - Project overview and architecture
- [Lazorkit SDK Documentation](https://docs.lazorkit.com) - Official SDK reference

---

## Step 1: Understanding USDC SPL Token Transfers

Before building transactions, it's important to understand how USDC transfers work on Solana.

### What is the SPL Token Program?

The **Solana Program Library (SPL)** Token Program is the standard for creating and managing fungible tokens on Solana. USDC on Solana is an SPL Token, just like thousands of other tokens on the network.

Key concepts:

- **Mint Address**: Every SPL Token has a unique mint address that identifies the token type (like USDC)
- **Token Accounts**: Each wallet needs a separate "token account" to hold each type of SPL Token
- **Associated Token Accounts (ATAs)**: Deterministic addresses derived from wallet address + mint address

### USDC Mint Address

In this project, we use the Devnet USDC mint address:

```typescript
// Source: services/constants.ts:127-129
export const USDC_MINT_DEVNET = new PublicKey(
  'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr'
);
```

**What is a mint address?** Think of it as the "contract address" or unique identifier for USDC on Solana. All USDC tokens on Devnet share this same mint address.

> **Note:** Mainnet USDC has a different mint address. Always verify you're using the correct mint for your target network.

### Associated Token Accounts (ATAs)

To hold USDC, each wallet needs an **Associated Token Account (ATA)**. The ATA address is deterministically derived from:
- The wallet's public key (owner)
- The token mint address (e.g., USDC)

```typescript
// Source: services/SolanaService.ts:115-119
const senderTokenAccount = await getAssociatedTokenAddress(
  usdcMint,           // USDC mint address
  senderPublicKey,    // Wallet owner's public key
  true                // allowOwnerOffCurve - CRITICAL for smart wallets!
);
```

#### CRITICAL: Smart Wallet Compatibility

The third parameter `allowOwnerOffCurve: true` is **required** for Lazorkit smart wallets:

- **Why?** Lazorkit smart wallets use Program Derived Addresses (PDAs)
- **What are PDAs?** Deterministic addresses generated using seeds (not random keypairs)
- **The issue:** PDAs are intentionally "off the ed25519 curve" (not valid elliptic curve points)
- **The fix:** Setting `allowOwnerOffCurve: true` tells the SDK to allow these off-curve addresses

**Without this parameter, you'll get `TokenOwnerOffCurveError`** and transactions will fail. 

```typescript
// WRONG - Will fail for smart wallets
const tokenAccount = await getAssociatedTokenAddress(mint, owner);

// CORRECT - Works with smart wallets (PDAs)
const tokenAccount = await getAssociatedTokenAddress(mint, owner, true);
```

### SPL Token Transfer Instruction

Once you have both sender and recipient token accounts, you create a transfer instruction:

```typescript
// Source: services/SolanaService.ts:140-147
const transferInstruction = createTransferInstruction(
  senderTokenAccount,      // Source: sender's USDC token account
  recipientTokenAccount,   // Destination: recipient's USDC token account
  senderPublicKey,         // Owner: wallet signing the transfer
  amountLamports,          // Amount: USDC in lamports (6 decimals)
  [],                      // Multi-signers: empty for single signature
  TOKEN_PROGRAM_ID         // Program: SPL Token program
);
```

**Parameters explained:**
- **Source**: The sender's USDC token account (where USDC comes from)
- **Destination**: The recipient's USDC token account (where USDC goes)
- **Owner**: The sender's wallet public key (must sign the transaction)
- **Amount**: The amount to transfer in **lamports** (see below)
- **Multi-signers**: Empty array for single-signature wallets
- **Program ID**: The SPL Token program that processes this instruction

### USDC Lamports Conversion

> **Important:** USDC has 6 decimal places, just like USD cents but with 4 more digits.

**1 USDC = 1,000,000 lamports**

Examples:
- 10.50 USDC = 10,500,000 lamports
- 0.01 USDC = 10,000 lamports
- 100 USDC = 100,000,000 lamports

```typescript
// Source: utils/ValidationUtils.ts:125-128
export function formatUSDCAmountToLamports(amount: number): number {
  // USDC has 6 decimals, so multiply by 1,000,000
  return Math.round(amount * 1_000_000);
}
```

This conversion is critical - transactions use lamports, not decimal amounts.

### Full Source References

- [services/constants.ts](../services/constants.ts) - USDC mint address and RPC configuration
- [services/SolanaService.ts](../services/SolanaService.ts) - Transaction building implementation
- [utils/ValidationUtils.ts](../utils/ValidationUtils.ts) - Amount formatting utilities

---

## Step 2: Building the Transfer Transaction

Now that you understand SPL Token transfers, let's implement the transaction building logic using the `SolanaService` class.

### The buildUSDCTransfer Method

The complete transaction building flow is encapsulated in `SolanaService.buildUSDCTransfer()`:

```typescript
// Source: services/SolanaService.ts:101-161
static async buildUSDCTransfer(
  request: TransactionRequest,
  senderPublicKey: PublicKey
): Promise<Transaction> {
  // 1. Initialize RPC connection
  const connection = this.getConnection();
  const usdcMint = this.getUSDCMintAddress();

  // 2. Parse recipient address to PublicKey
  const recipientPublicKey = new PublicKey(request.recipientAddress);

  // 3. Derive sender's USDC token account (ATA)
  const senderTokenAccount = await getAssociatedTokenAddress(
    usdcMint,
    senderPublicKey,
    true // allowOwnerOffCurve - CRITICAL for smart wallets!
  );

  // 4. Derive recipient's USDC token account (ATA)
  const recipientTokenAccount = await getAssociatedTokenAddress(
    usdcMint,
    recipientPublicKey,
    true // allowOwnerOffCurve - recipient may also use smart wallet
  );

  // 5. CRITICAL VALIDATION: Check recipient account exists
  const recipientAccountInfo = await connection.getAccountInfo(
    recipientTokenAccount
  );

  if (recipientAccountInfo === null) {
    throw new Error(
      'Recipient USDC token account not initialized. They must receive USDC at least once before you can send to them.'
    );
  }

  // 6. Create SPL Token transfer instruction
  const transferInstruction = createTransferInstruction(
    senderTokenAccount,      // Source
    recipientTokenAccount,   // Destination
    senderPublicKey,         // Owner
    request.amountLamports,  // Amount in lamports
    [],                      // No multi-signers
    TOKEN_PROGRAM_ID         // SPL Token program
  );

  // 7. Build transaction with instruction
  const transaction = new Transaction().add(transferInstruction);

  // 8. Set fee payer (will be overridden by paymaster)
  transaction.feePayer = senderPublicKey;

  // 9. Fetch recent blockhash
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;

  return transaction;
}
```

### Step-by-Step Breakdown

Let's understand each step in detail:

#### Step 1-2: Initialize Connection and Parse Address

```typescript
const connection = this.getConnection();
const usdcMint = this.getUSDCMintAddress();
const recipientPublicKey = new PublicKey(request.recipientAddress);
```

- **Connection**: Create RPC connection to Solana Devnet
- **USDC Mint**: Get the USDC token mint address constant
- **Recipient PublicKey**: Convert recipient address string to PublicKey object

#### Step 3-4: Derive Token Accounts

```typescript
const senderTokenAccount = await getAssociatedTokenAddress(
  usdcMint,
  senderPublicKey,
  true // allowOwnerOffCurve - CRITICAL!
);
```

**Why `allowOwnerOffCurve: true`?**
- Lazorkit smart wallets use Program Derived Addresses (PDAs)
- PDAs are "off the ed25519 curve" by design
- Without this parameter, `getAssociatedTokenAddress()` throws `TokenOwnerOffCurveError`
- This applies to BOTH sender and recipient (either could use smart wallets)

#### Step 5: Validate Recipient Account Exists ⚠️

```typescript
const recipientAccountInfo = await connection.getAccountInfo(recipientTokenAccount);

if (recipientAccountInfo === null) {
  throw new Error('Recipient USDC token account not initialized...');
}
```

**Why is this validation critical?**

1. **Paymaster won't initialize accounts** - Creating token accounts costs SOL, and paymasters won't do this (too expensive and abusable)
2. **Transaction would fail** - Sending to a non-existent account fails on-chain
3. **Better user experience** - Fail fast with clear error before signing

**When does this happen?**
- Recipient has never received USDC before
- Their USDC token account doesn't exist yet
- They need to receive USDC from another source first (faucet, exchange, friend)

#### Step 6: Create Transfer Instruction

```typescript
const transferInstruction = createTransferInstruction(
  senderTokenAccount,      // Where USDC comes from
  recipientTokenAccount,   // Where USDC goes
  senderPublicKey,         // Who signs the transfer
  request.amountLamports,  // How much (in lamports)
  [],                      // Multi-sig signers (none)
  TOKEN_PROGRAM_ID         // SPL Token program ID
);
```

This instruction tells the SPL Token program to move USDC from sender to recipient.

#### Step 7-9: Build Transaction

```typescript
const transaction = new Transaction().add(transferInstruction);
transaction.feePayer = senderPublicKey;

const { blockhash } = await connection.getLatestBlockhash();
transaction.recentBlockhash = blockhash;
```

**Fee Payer**: Set to sender's wallet, but **paymaster will override this**
**Blockhash**: Acts as a timestamp to prevent transaction replay. Valid for ~60 seconds.

> **Important:** Always fetch blockhash immediately before signing. Don't pre-build transactions minutes in advance, or the blockhash will become stale and the transaction will be rejected.

### The TransactionRequest Interface

The method accepts a `TransactionRequest` object from the transfer form:

```typescript
// Source: types/index.ts:45-77
interface TransactionRequest {
  recipientAddress: string;    // Base58-encoded Solana address
  amount: number;              // USDC in decimal format (e.g., 10.50)
  amountLamports: number;      // USDC in lamports (e.g., 10,500,000)
  timestamp: number;           // Unix timestamp (milliseconds)
}
```

This is created by the transfer form and passed via navigation params.

### Full Source References

- [services/SolanaService.ts](../services/SolanaService.ts) - Complete implementation with comments
- [types/index.ts](../types/index.ts) - TransactionRequest interface definition

---

## Step 3: Configuring the Paymaster

The paymaster integration is configured once at the application root using `LazorKitProvider`. Once configured, all transactions automatically benefit from gas sponsorship with no additional code required.

### LazorKitProvider Configuration

In your root layout file, wrap your application with `LazorKitProvider`:

```typescript
// Source: app/_layout.tsx:22-28
<LazorKitProvider
  rpcUrl="https://api.devnet.solana.com"
  portalUrl="https://portal.lazor.sh"
  configPaymaster={{
    paymasterUrl: 'https://kora.devnet.lazorkit.com'
  }}
>
  {children}
</LazorKitProvider>
```

### Configuration Parameters Explained

#### `rpcUrl` - Solana RPC Endpoint

```typescript
rpcUrl="https://api.devnet.solana.com"
```

**What it does:** Defines the Solana blockchain RPC endpoint for:
- Querying account data (balances, token accounts)
- Submitting transactions to the network
- Confirming transaction status

**Networks:**
- Devnet: `https://api.devnet.solana.com` (for development)
- Mainnet: `https://api.mainnet-beta.solana.com` (for production)

> **Note:** The public RPC has rate limits (~40 requests per 10 seconds). For production apps, use a paid RPC provider like QuickNode, Alchemy, or Helius.

#### `portalUrl` - Lazorkit Portal for Authentication

```typescript
portalUrl="https://portal.lazor.sh"
```

**What it does:** Lazorkit Portal URL for WebAuthn passkey authentication:
- Handles biometric credential creation (Face ID/Touch ID)
- Manages passkey authentication flow
- Returns signed transactions to your app

**How it works:** When signing transactions, your app opens this portal in a browser, which triggers the biometric prompt and signs the transaction using the user's passkey.

#### `configPaymaster` - Paymaster Service Configuration

```typescript
configPaymaster={{
  paymasterUrl: 'https://kora.devnet.lazorkit.com'
}}
```

**What it does:** Configures the paymaster service that sponsors transaction fees.

**Paymaster URLs:**
- Devnet: `https://kora.devnet.lazorkit.com`
- Mainnet: `https://kora.lazorkit.com`

**How it works:**
1. You build and sign transaction client-side
2. SDK automatically sends signed transaction to `paymasterUrl`
3. Paymaster validates the transaction
4. Paymaster adds its own fee payer instruction (sponsors the gas)
5. Paymaster submits sponsored transaction to Solana RPC
6. SDK receives transaction signature and returns to your app

**No explicit API calls needed** - The Lazorkit SDK handles all paymaster communication internally when you call `wallet.signAndSendTransaction()`.

### Automatic Paymaster Routing

Once configured, every transaction signed with `wallet.signAndSendTransaction()` automatically routes through the paymaster. You don't need to:
- Make explicit paymaster API calls
- Handle paymaster request/response manually
- Add fee payer logic to your code

The SDK does it all automatically based on the `configPaymaster.paymasterUrl` setting.

### Environment-Specific Configuration

For production apps, consider using environment variables:

```typescript
<LazorKitProvider
  rpcUrl={process.env.EXPO_PUBLIC_SOLANA_RPC_URL}
  portalUrl={process.env.EXPO_PUBLIC_PORTAL_URL}
  configPaymaster={{
    paymasterUrl: process.env.EXPO_PUBLIC_PAYMASTER_URL
  }}
>
  {children}
</LazorKitProvider>
```

This allows easy switching between Devnet and Mainnet without code changes.

### Full Source References

- [app/_layout.tsx](../app/_layout.tsx) - Complete LazorKitProvider setup

---

## Step 4: Signing and Submitting the Transaction

Now that the transaction is built and the paymaster is configured, let's implement the signing and submission flow using the Lazorkit SDK.

### Complete Signing Flow

Here's the complete flow extracted from the confirm screen:

```typescript
// Source: app/confirm.tsx:84-106
const handleConfirmAndSign = async () => {
  setIsSubmitting(true);
  setTransactionStatus('pending');

  try {
    // Build USDC transfer transaction
    const transaction = await SolanaService.buildUSDCTransfer(
      transactionRequest,
      wallet.smartWalletPubkey!
    );

    // Sign and send via Lazorkit SDK (triggers biometric + paymaster)
    const txSignature = await wallet.signAndSendTransaction(
      {
        instructions: transaction.instructions,
        transactionOptions: {
          clusterSimulation: 'devnet',
        },
      },
      {
        redirectUrl: 'passkey-integ://confirm',
      }
    );

    setSignature(txSignature);

    // Poll for confirmation (covered in Step 5)
    const status = await SolanaService.confirmTransaction(txSignature);
    // ... handle status
  } catch (error) {
    // ... handle error
  }
};
```

### Understanding signAndSendTransaction()

The `wallet.signAndSendTransaction()` method is the heart of the Lazorkit SDK. Let's break down its parameters:

#### First Parameter: Transaction Payload

```typescript
{
  instructions: transaction.instructions,
  transactionOptions: {
    clusterSimulation: 'devnet',
  },
}
```

**`instructions`**: Array of transaction instructions to sign
- Extracted from the Transaction object built by SolanaService
- Contains the SPL Token transfer instruction

**`transactionOptions.clusterSimulation`**: Blockchain network for simulation
- Set to `'devnet'` for development
- Set to `'mainnet-beta'` for production
- Used by SDK to validate transaction before submission

> **Important:** The Lazorkit SDK uses a specific API format. You pass `{ instructions: [...] }`, NOT a complete Transaction object like standard Solana wallet adapters.

#### Second Parameter: Sign Options

```typescript
{
  redirectUrl: 'passkey-integ://confirm',
}
```

**`redirectUrl`**: Deep link URL for returning to your app
- After signing, Portal redirects back to this URL
- Must match your app's deep link scheme (configured in `app.json`)
- Example: `'yourapp://confirm'` or `'yourapp://callback'`

This is required for the authentication flow to return control to your app after biometric signing.

### The Automatic Paymaster Flow

When you call `wallet.signAndSendTransaction()`, here's what happens automatically:

```
┌──────────────────────────────────────────────────────────────┐
│                   Paymaster Flow (Automatic)                 │
└──────────────────────────────────────────────────────────────┘

1.  App calls wallet.signAndSendTransaction()
   └─> SDK receives unsigned transaction

2.  SDK triggers biometric prompt
   └─> User authenticates with Face ID/Touch ID

3.   SDK signs transaction with passkey
   └─> User signature applied to transfer instruction

4.  SDK sends signed transaction to paymaster
   └─> Automatic POST to configPaymaster.paymasterUrl

5.  Paymaster validates transaction
   └─> Checks signature, structure, and limits

6.  Paymaster adds fee payer instruction
   └─> Paymaster's wallet pays transaction fees (SOL)

7.  Paymaster submits to Solana RPC
   └─> Sponsored transaction sent to blockchain

8.  SDK receives transaction signature
   └─> Returns signature to your app
```

### Trustless Security Model

**Critical security feature:** Users only sign the transfer instruction, NOT the fee payment.

```typescript
// What user signs:
//  "Transfer 10 USDC from my account to recipient"

// What user does NOT sign:
//  Fee payer instruction (added by paymaster after signing)
```

This means:
- User sees exactly what they're signing (transfer amount and recipient)
- Paymaster cannot modify the transfer instruction (already signed)
- Paymaster can only add its own fee payment (doesn't affect transfer)
- User always knows precisely what transaction will execute

### Biometric Authentication

When `signAndSendTransaction()` is called, the SDK automatically:

1. Opens Lazorkit Portal in system browser
2. Portal triggers OS biometric prompt (Face ID/Touch ID)
3. User authenticates with biometrics
4. Portal signs transaction using passkey credential
5. Portal redirects back to your app via `redirectUrl`

**User cancellation:** If user cancels biometric prompt, SDK throws error:
```typescript
catch (error) {
  if (error.message?.includes('cancelled')) {
    // User cancelled - handle gracefully
  }
}
```

### Error Handling

Common errors during signing:

```typescript
try {
  const signature = await wallet.signAndSendTransaction(...)
} catch (error: any) {
  if (error.message?.includes('cancelled')) {
    // User cancelled biometric prompt
  } else if (error.message?.includes('not initialized')) {
    // Recipient account doesn't exist
  } else if (error.message?.includes('Insufficient')) {
    // Not enough USDC balance
  } else if (error.message?.includes('Paymaster')) {
    // Paymaster rejected transaction
  } else {
    // Other network or SDK errors
  }
}
```

See Step 6 (Troubleshooting) for detailed error handling strategies.

### Full Source References

- [app/confirm.tsx](../app/confirm.tsx) - Complete signing flow implementation (lines 84-152)
- [types/index.ts](../types/index.ts) - TransactionRequest interface

---

## Step 5: Confirming Transaction on Blockchain

After the transaction is signed and submitted, you need to poll the blockchain to confirm it was successfully processed.

### Transaction Confirmation Flow

```typescript
// Source: app/confirm.tsx:109-118
const txSignature = await wallet.signAndSendTransaction(...);
setSignature(txSignature);

// Poll for confirmation with 'confirmed' commitment
const status = await SolanaService.confirmTransaction(txSignature);

if (status.status === 'confirmed') {
  setTransactionStatus('confirmed');
} else {
  setTransactionStatus('failed');
  setError(status.error || 'Transaction failed');
}
```

### The confirmTransaction Method

The `SolanaService.confirmTransaction()` method polls the RPC for transaction status:

```typescript
// Source: services/SolanaService.ts:189-239
static async confirmTransaction(
  signature: TransactionSignature
): Promise<TransactionStatus> {
  const connection = this.getConnection();
  const submittedAt = Date.now();

  try {
    // Poll for transaction confirmation with 'confirmed' commitment level
    const confirmation = await connection.confirmTransaction(
      signature,
      'confirmed'
    );

    const confirmedAt = Date.now();

    // Check if transaction succeeded or failed on-chain
    if (confirmation.value.err) {
      // Transaction was confirmed but failed execution
      return {
        signature,
        status: 'failed',
        confirmations: 32,
        error: `Transaction failed: ${JSON.stringify(confirmation.value.err)}`,
        explorerUrl: `${SOLANA_EXPLORER_URL}/tx/${signature}?cluster=devnet`,
        submittedAt,
        confirmedAt,
      };
    }

    // Transaction succeeded
    return {
      signature,
      status: 'confirmed',
      confirmations: 32,
      explorerUrl: `${SOLANA_EXPLORER_URL}/tx/${signature}?cluster=devnet`,
      submittedAt,
      confirmedAt,
    };
  } catch (error: any) {
    // Confirmation timeout or RPC error
    return {
      signature,
      status: 'failed',
      confirmations: 0,
      error: error.message || 'Transaction confirmation failed',
      explorerUrl: `${SOLANA_EXPLORER_URL}/tx/${signature}?cluster=devnet`,
      submittedAt,
    };
  }
}
```

### Understanding Commitment Levels

Solana offers different commitment levels for transaction confirmation:

| Commitment Level | Confirmations | Time | Finality | Use Case |
|-----------------|---------------|------|----------|----------|
| **processed** | 0 | Instant | None | Real-time updates (NOT recommended for financial ops) |
| **confirmed** | 32 | 15-20s | High | **RECOMMENDED** - Good balance of speed and security |
| **finalized** | Max | 30+s | Highest | Maximum security (slow for UX) |

**Why we use 'confirmed':**
- Provides high confidence of finality (32 confirmations)
- Much faster than 'finalized' (15-20s vs 30+s)
- Better user experience without sacrificing security
- Sufficient for most applications including financial transfers

> **Note:** Once a transaction reaches 'confirmed' status, the probability of it being rolled back is extremely low on Solana.

### The TransactionStatus Interface

The confirmation method returns a `TransactionStatus` object:

```typescript
// Source: types/index.ts:85-131
interface TransactionStatus {
  signature?: string;           // Transaction signature
  status: 'pending' | 'confirmed' | 'failed';
  confirmations: number;        // Number of confirmations (32 for 'confirmed')
  error?: string;               // Error message if failed
  explorerUrl?: string;         // Solana Explorer link
  submittedAt: number;          // Timestamp when submitted
  confirmedAt?: number;         // Timestamp when confirmed
}
```

### UI State Management

The confirm screen manages transaction state through the lifecycle:

```typescript
// Source: app/confirm.tsx:56-61
const [transactionStatus, setTransactionStatus] = useState<
  'preview' | 'pending' | 'confirmed' | 'failed'
>('preview');
const [signature, setSignature] = useState<string | null>(null);
const [error, setError] = useState<string | null>(null);
```

**State transitions:**
1. **preview** → User sees transaction details, taps "Confirm & Sign"
2. **pending** → Show loading spinner while waiting for confirmation
3. **confirmed** → Show success checkmark with Explorer link
4. **failed** → Show error message with retry option

### Displaying Transaction Status

The UI shows different views based on transaction status:

**Pending State:**
```typescript
// Source: app/confirm.tsx:242-256
{transactionStatus === 'pending' && (
  <View style={styles.statusContainer}>
    <Text style={styles.title}>Processing Transaction</Text>
    <ActivityIndicator size="large" color={Colors.primary.purple} />
    <Text style={styles.loadingText}>
      Waiting for blockchain confirmation...
    </Text>
    <Text style={styles.loadingText}>This may take 15-30 seconds</Text>
  </View>
)}
```

**Confirmed State:**
```typescript
// Source: app/confirm.tsx:259-313
{transactionStatus === 'confirmed' && (
  <>
    <View style={styles.statusContainer}>
      <Text style={styles.statusIcon}>✓</Text>
      <Text style={styles.title}>Transaction Successful</Text>
    </View>

    {/* Show transaction details */}
    <TouchableOpacity onPress={handleViewOnExplorer}>
      <Text>View on Explorer</Text>
    </TouchableOpacity>
  </>
)}
```

### Opening Solana Explorer

Allow users to view transaction details on Solana Explorer:

```typescript
// Source: app/confirm.tsx:167-171
const handleViewOnExplorer = () => {
  if (signature) {
    const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
    Linking.openURL(explorerUrl);
  }
};
```

The Explorer shows:
- Transaction signature
- Block number and timestamp
- **Fee payer** (shows paymaster address, not user's address!)
- All instructions (transfer + fee payment)
- Transaction logs

### Full Source References

- [services/SolanaService.ts](../services/SolanaService.ts) - confirmTransaction method (lines 189-239)
- [app/confirm.tsx](../app/confirm.tsx) - UI state management and status display
- [types/index.ts](../types/index.ts) - TransactionStatus interface

---

## Step 6: Verifying Gasless Execution

One of the key benefits of the paymaster is that users don't need SOL to send USDC. Let's verify this.

### How to Verify Gasless Transaction

Follow these steps to confirm the transaction was truly gasless:

#### 1. Check Wallet SOL Balance Before Transfer

```typescript
import { Connection } from '@solana/web3.js';

const connection = new Connection('https://api.devnet.solana.com');
const balanceBefore = await connection.getBalance(wallet.smartWalletPubkey);
console.log('SOL balance before:', balanceBefore / 1e9, 'SOL');
```

#### 2. Complete USDC Transfer

Execute the transfer as documented in Steps 1-5.

#### 3. Check Wallet SOL Balance After Transfer

```typescript
const balanceAfter = await connection.getBalance(wallet.smartWalletPubkey);
console.log('SOL balance after:', balanceAfter / 1e9, 'SOL');
```

#### 4. Verify SOL Balance Unchanged

```typescript
if (balanceBefore === balanceAfter) {
  console.log('Transaction was gasless! SOL balance unchanged.');
} else {
  console.log('Transaction consumed SOL:', (balanceBefore - balanceAfter) / 1e9, 'SOL');
}
```

**Expected result:** SOL balance should be exactly the same (typically 0 SOL for new wallets).

### What "Gasless" Means

**Gasless transactions:**
- User's wallet never needs SOL for transaction fees
- Paymaster's wallet pays all gas fees (SOL)
- User only needs USDC to send USDC
- No friction for users to acquire SOL

**Traditional transactions:**
- User must hold SOL to pay gas fees
- Even for sending USDC, SOL is required
- Adds onboarding friction (where to buy SOL?)

### Verifying on Solana Explorer

Open the transaction in Solana Explorer to see the paymaster in action:

1. Click "View on Explorer" button after transaction confirms
2. Look for the **"Fee Payer"** field in transaction details
3. The fee payer address will be the **paymaster's wallet**, not your wallet

**What to look for:**
```
Transaction Details
├─ Signature: 5VERv8NMvzb...
├─ Block: 234567890
├─ Fee Payer: <Paymaster Address>  ← Not your wallet!
├─ Recent Blockhash: abc123...
└─ Instructions:
    ├─ 1. SPL Token Transfer (your signature)
    └─ 2. Fee Payment (paymaster signature)
```

The **Fee Payer** field shows who paid for the transaction. In gasless transactions, this is the paymaster's address, proving your wallet didn't spend any SOL.

### Benefits of Gasless Transactions

**For Users:**
- **Simpler onboarding** - No need to acquire SOL first
- **One-token model** - Only need USDC to send USDC
- **Mobile-first UX** - Works like traditional payment apps
- **Instant start** - Send transactions immediately after wallet creation

**For Developers:**
- **Lower user friction** - Higher conversion rates
- **Better UX** - No "acquire gas" tutorial needed
- **Mainstream appeal** - Blockchain complexity hidden
- **Business model flexibility** - You control sponsorship limits

### Full Source References

- [services/SolanaService.ts](../services/SolanaService.ts) - RPC connection for balance queries
- [services/constants.ts](../services/constants.ts) - Solana Explorer URL

---

## Troubleshooting

Common issues you may encounter when implementing gasless USDC transfers:

### Issue 1: "Recipient USDC token account not initialized"

**Error Message:**
```
Recipient USDC token account not initialized. They must receive USDC at least once before you can send to them.
```

**Cause:**
- Recipient has never received USDC before
- Their Associated Token Account (ATA) for USDC doesn't exist on-chain

**Solution:**
- Recipient must receive USDC at least once from another source first
- Options: Devnet faucet, exchange transfer, or transfer from another wallet
- The paymaster will NOT initialize token accounts (too expensive and abusable)

**Code Reference:**
See `services/SolanaService.ts` lines 128-136 for the validation logic.

**Prevention:**
Display a clear error message to users explaining that the recipient needs to initialize their USDC account first.

---

### Issue 2: "TokenOwnerOffCurveError when calling getAssociatedTokenAddress"

**Error Message:**
```
TokenOwnerOffCurveError: Token owner off curve
```

**Cause:**
- Missing `allowOwnerOffCurve: true` parameter in `getAssociatedTokenAddress()` call
- Lazorkit smart wallets use Program Derived Addresses (PDAs) which are off-curve

**Solution:**
Always add the third parameter to `getAssociatedTokenAddress()`:

```typescript
// WRONG - Will fail for smart wallets
const tokenAccount = await getAssociatedTokenAddress(mint, owner);

// CORRECT - Works with smart wallets
const tokenAccount = await getAssociatedTokenAddress(mint, owner, true);
```

**Code Reference:**
See `services/SolanaService.ts` lines 115-125.

**Background:**
PDAs are intentionally "off the ed25519 curve" - they're deterministic addresses generated using seeds, not random keypairs. The `allowOwnerOffCurve` parameter tells the SDK to allow these addresses.

---

### Issue 3: "Transaction signing was cancelled"

**Error Message:**
```
Transaction signing was cancelled
```

**Cause:**
- User cancelled the biometric prompt (Face ID/Touch ID)
- User dismissed the authentication dialog

**Solution:**
This is expected user behavior - handle gracefully:

```typescript
catch (error: any) {
  if (error.message?.includes('cancelled')) {
    // Show user-friendly message
    setError('Transaction signing was cancelled. You can try again.');
  }
}
```

**User Experience:**
- Allow users to retry the transaction
- Don't treat cancellation as a critical error
- Provide a "Try Again" button

**Code Reference:**
See `app/confirm.tsx` lines 125-129 for error handling implementation.

---

### Issue 4: "Insufficient USDC balance"

**Error Message:**
```
You don't have enough USDC to complete this transfer
```

**Cause:**
- User's wallet doesn't have enough USDC for the transfer amount
- Balance check happens on-chain when transaction executes

**Solution:**
Implement client-side balance validation before transaction building:

```typescript
// Query USDC balance before building transaction
const connection = new Connection(SOLANA_RPC_URL);
const tokenAccount = await getAssociatedTokenAddress(
  USDC_MINT_DEVNET,
  wallet.smartWalletPubkey,
  true
);

const accountInfo = await connection.getTokenAccountBalance(tokenAccount);
const balance = accountInfo.value.uiAmount; // USDC balance as decimal

if (amount > balance) {
  throw new Error('Insufficient USDC balance');
}
```

**Prevention:**
- Display wallet balance on transfer form
- Validate `amount <= balance` before allowing submission
- Provide a "Max" button to set amount to full balance

---

### Issue 5: "Transaction confirmation timeout"

**Error Message:**
```
Transaction confirmation failed
```

**Cause:**
- Solana network congestion
- RPC node issues or downtime
- Transaction took longer than expected to confirm

**Solution:**

**Option 1: Retry confirmation polling**
```typescript
const status = await SolanaService.confirmTransaction(signature);

if (status.status === 'failed' && status.error?.includes('timeout')) {
  // Retry confirmation
  const retryStatus = await SolanaService.confirmTransaction(signature);
}
```

**Option 2: Check Explorer manually**
Even if confirmation times out, the transaction may have succeeded. Check Solana Explorer with the transaction signature.

**Prevention:**
- Implement exponential backoff retry logic
- Extend confirmation timeout for congested periods
- Use a more reliable RPC provider (QuickNode, Alchemy, Helius)

**Code Reference:**
See `services/SolanaService.ts` lines 189-239 for confirmation implementation.

---

### Issue 6: "Paymaster rejected transaction"

**Error Message:**
```
Transaction could not be sponsored. Please try again later.
```

**Cause:**
- Transaction exceeds paymaster size limits
- Paymaster service is temporarily down
- Transaction structure is invalid
- Paymaster rate limits exceeded

**Solution:**

**For size limits:**
- Keep transactions simple (single transfer instruction)
- Don't add unnecessary instructions or metadata

**For service downtime:**
- Implement retry logic with exponential backoff
- Show user-friendly error: "Service temporarily unavailable"

**For invalid transactions:**
- Validate all transaction parameters before signing
- Ensure blockhash is fresh (< 60 seconds old)

**Code Reference:**
See `app/confirm.tsx` lines 141-145 for paymaster error handling.

**Devnet Note:**
The Devnet paymaster may have stricter limits than Mainnet. This is normal for testing environments.

---

### Issue 7: "Stale blockhash error"

**Error Message:**
```
Transaction simulation failed: Blockhash not found
```

**Cause:**
- Transaction not submitted within ~60 seconds of fetching blockhash
- Blockhash expired before reaching the blockchain

**Solution:**

**Always fetch blockhash immediately before signing:**
```typescript
// WRONG - Building transaction minutes in advance
const transaction = await buildTransaction(); // Gets blockhash
await doSomethingElse();                      // Time passes...
await signTransaction(transaction);            // Blockhash is stale!

// CORRECT - Build and sign immediately
const transaction = await buildTransaction(); // Gets fresh blockhash
await signTransaction(transaction);            // Sign right away
```

**Prevention:**
- Build transactions just-in-time (right before signing)
- Don't pre-build transactions and store them
- If you must wait, fetch a new blockhash before signing

**Code Reference:**
See `services/SolanaService.ts` lines 155-158 for blockhash fetching.

**Blockhash Lifetime:**
Blockhashes are valid for approximately 60 seconds (150 blocks at 400ms per block).

---

## Testing Your Implementation

### Manual Testing Checklist

Follow these steps to manually test your gasless USDC transfer implementation:

1. **Setup Prerequisites**
   - [ ] Wallet created and authenticated (Tutorial 1 complete)
   - [ ] App connected to Devnet
   - [ ] Deep linking configured correctly

2. **Get Test USDC**
   - [ ] Visit [SPL Token Faucet](https://spl-token-faucet.com/) for Devnet
   - [ ] Request test USDC to your wallet address
   - [ ] Verify USDC appears in wallet (may take 15-30 seconds)

3. **Prepare Test Recipient**
   - [ ] Find or create a test recipient address
   - [ ] Ensure recipient has initialized USDC account (received USDC at least once)
   - [ ] If recipient is new, send them test USDC from faucet first

4. **Test Transfer Flow**
   - [ ] Open transfer form
   - [ ] Enter valid recipient address
   - [ ] Enter amount (less than balance)
   - [ ] Verify "Review Transaction" button enables
   - [ ] Tap "Review Transaction"

5. **Test Transaction Preview**
   - [ ] Verify recipient address displays correctly (truncated)
   - [ ] Verify amount displays correctly
   - [ ] Verify "Gasless Transaction" badge appears
   - [ ] Tap "Confirm & Sign"

6. **Test Biometric Signing**
   - [ ] Biometric prompt appears (Face ID/Touch ID)
   - [ ] Authenticate with biometrics
   - [ ] Browser opens with Lazorkit Portal (briefly)
   - [ ] App receives control back via deep link

7. **Test Transaction Confirmation**
   - [ ] "Pending" screen displays with loading spinner
   - [ ] Wait 15-30 seconds for confirmation
   - [ ] "Success" screen displays with checkmark
   - [ ] Transaction signature displays

8. **Verify Gasless Execution**
   - [ ] Check SOL balance unchanged (should be 0 or same as before)
   - [ ] Tap "View on Explorer"
   - [ ] Verify Fee Payer is paymaster address (not your wallet)

9. **Test Error Cases**
   - [ ] Test with invalid recipient address (should show validation error)
   - [ ] Test with insufficient balance (should show error)
   - [ ] Test with uninitialized recipient (should show "not initialized" error)
   - [ ] Test cancelling biometric prompt (should show cancellation error)

### USDC Faucet Information

**Devnet USDC Faucet:**
- URL: [https://spl-token-faucet.com/](https://spl-token-faucet.com/)
- Select "USDC" token
- Enter your wallet address
- Request test USDC 

**Important Notes:**
- Devnet tokens have no real value
- Devnet resets periodically (tokens may disappear)
- Faucet may have rate limits (one request per hour per address)

### Using Solana Explorer

After transaction confirms, verify details on Solana Explorer:

1. **Open Explorer**
   - Click "View on Explorer" button in app
   - Or manually visit: `https://explorer.solana.com/tx/YOUR_SIGNATURE?cluster=devnet`

2. **Verify Transaction Details**
   - **Signature**: Transaction unique identifier
   - **Block**: Block number where transaction was included
   - **Timestamp**: When transaction was confirmed
   - **Fee Payer**: Should be paymaster address (NOT your wallet!)
   - **Status**: Should show "Success"

3. **Inspect Instructions**
   - **Instruction 1**: SPL Token Transfer (your transfer)
   - **Instruction 2**: Fee Payment (paymaster's fee payment)
   - Verify transfer amount matches what you sent

4. **Check Fee**
   - Transaction fee (usually ~0.000005 SOL)
   - Verify paid by paymaster, not your wallet

---

## Next Steps

Congratulations! You've successfully implemented gasless USDC transfers with Lazorkit. Here are some ways to enhance your implementation:

### Feature Enhancements

1. **Add USDC Balance Display**
   - Query and display user's USDC balance on transfer form
   - Implement `getTokenAccountBalance()` to fetch balance
   - Add "Max" button to set amount to full balance

2. **Implement Transaction History**
   - Query past transactions for the user's wallet
   - Use `getSignaturesForAddress()` to fetch transaction signatures
   - Display transaction list with amounts, recipients, and timestamps

3. **Add Transaction Memo Field**
   - Allow users to add optional memo/note to transactions
   - Use SPL Memo program to attach memo on-chain
   - Display memos in transaction history

4. **Support Multiple SPL Tokens**
   - Extend beyond USDC to support other SPL Tokens
   - Add token selection dropdown to transfer form
   - Query token accounts for multiple mints

5. **Add QR Code Scanning**
   - Implement QR code scanner for recipient address input
   - Use `expo-barcode-scanner` for camera access
   - Support Solana Pay QR codes

6. **Implement Transaction Limits**
   - Add client-side limits per transaction
   - Implement daily/weekly spending limits
   - Store limits in SecureStore

### Production Considerations

Before launching to production:

1. **Switch to Mainnet**
   - Update RPC URL to Mainnet: `https://api.mainnet-beta.solana.com`
   - Update paymaster URL: `https://kora.lazorkit.com`
   - Update USDC mint to Mainnet USDC address

2. **Use Paid RPC Provider**
   - Public RPCs have rate limits (~40 req/10s)
   - Consider QuickNode, Alchemy, or Helius
   - Implement retry logic for RPC failures

3. **Add Error Tracking**
   - Integrate Sentry or similar error tracking
   - Log all transaction errors with context
   - Monitor paymaster rejection rates

4. **Implement Analytics**
   - Track transaction success/failure rates
   - Monitor average confirmation times
   - Measure user drop-off points in flow

5. **Add Security Features**
   - Implement transaction amount limits
   - Add address whitelist/blacklist functionality
   - Consider adding 2FA for large transactions

### Related Tutorials

- [Tutorial 1: Wallet Creation with Biometric Authentication](./tutorial-1-wallet-creation.md) - Review wallet setup


### Additional Resources

- [Lazorkit SDK Documentation](https://docs.lazorkit.com) - Official SDK reference
- [Solana Web3.js Documentation](https://solana-labs.github.io/solana-web3.js/) - Transaction building
- [SPL Token Documentation](https://spl.solana.com/token) - Token accounts and transfers
- [Solana Explorer](https://explorer.solana.com/) - View transactions (Devnet and Mainnet)
- [Solana Cookbook](https://solanacookbook.com/) - Practical Solana development guides
- [WebAuthn Guide](https://webauthn.guide/) - Understanding passkey authentication

### Full Repository

Access the complete source code for this tutorial:
- [app/transfer.tsx](../app/transfer.tsx) - Transfer form implementation
- [app/confirm.tsx](../app/confirm.tsx) - Transaction confirmation flow
- [services/SolanaService.ts](../services/SolanaService.ts) - Transaction building and confirmation
- [services/constants.ts](../services/constants.ts) - Configuration constants
- [types/index.ts](../types/index.ts) - TypeScript interfaces
- [utils/ValidationUtils.ts](../utils/ValidationUtils.ts) - Input validation
- [utils/FormattingUtils.ts](../utils/FormattingUtils.ts) - Display formatting

---

## Conclusion

You've learned how to implement gasless USDC transfers using Lazorkit's paymaster integration. Key takeaways:

- SPL Token transfers require Associated Token Accounts (ATAs) for sender and recipient
- Smart wallets require `allowOwnerOffCurve: true` when deriving token accounts
- Paymaster automatically sponsors gas fees when configured in LazorKitProvider
- Users sign only the transfer instruction (trustless security model)
- Transaction confirmation uses 'confirmed' commitment (15-20s, good UX)
- Gasless execution means users need zero SOL to send USDC

By removing the gas fee requirement, you've created a significantly better user experience that removes blockchain friction and feels like traditional payment apps.

Happy building! 

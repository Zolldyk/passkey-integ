import {
  Connection,
  PublicKey,
  Transaction,
  TransactionSignature,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { TransactionRequest, TransactionStatus } from '../types';
import { USDC_MINT_DEVNET, SOLANA_RPC_URL, SOLANA_EXPLORER_URL } from './constants';

/**
 * SolanaService - Blockchain Interaction Service
 *
 * Encapsulates all Solana blockchain interactions including:
 * - RPC connection management
 * - USDC SPL Token transfer transaction building
 * - Transaction confirmation polling
 * - Account validation
 *
 * All methods are static since no instance state is required.
 */
export class SolanaService {
  /**
   * Get configured Solana RPC connection.
   *
   * Creates a Connection instance pointing to Solana Devnet RPC.
   * Connection is used for all blockchain queries and transaction submissions.
   *
   * @returns Connection instance configured with Devnet RPC URL
   *
   * @example
   * const connection = SolanaService.getConnection();
   * const balance = await connection.getBalance(publicKey);
   */
  static getConnection(): Connection {
    return new Connection(SOLANA_RPC_URL, 'confirmed');
  }

  /**
   * Get USDC mint address for Solana Devnet.
   *
   * Returns the PublicKey of the Devnet USDC SPL Token mint.
   * This address is used to derive Associated Token Accounts for USDC.
   *
   * @returns PublicKey of USDC mint on Devnet
   *
   * @example
   * const usdcMint = SolanaService.getUSDCMintAddress();
   * const tokenAccount = await getAssociatedTokenAddress(usdcMint, wallet);
   */
  static getUSDCMintAddress(): PublicKey {
    return USDC_MINT_DEVNET;
  }

  /**
   * Build a USDC SPL Token transfer transaction.
   *
   * Constructs a Solana transaction with a transfer instruction to move USDC
   * from the sender's token account to the recipient's token account.
   *
   * CRITICAL: This method validates that the recipient's USDC token account exists.
   * If the account is not initialized, it throws an error. The paymaster will NOT
   * initialize token accounts, so this validation prevents failed transactions.
   *
   * SMART WALLET COMPATIBILITY: Uses allowOwnerOffCurve=true for getAssociatedTokenAddress
   * to support Lazorkit smart wallets which use Program Derived Addresses (PDAs).
   * PDAs are intentionally off-curve and will throw TokenOwnerOffCurveError without this flag.
   *
   * Transaction Flow:
   * 1. Parse recipient address as PublicKey
   * 2. Derive sender's Associated Token Account for USDC (with PDA support)
   * 3. Derive recipient's Associated Token Account for USDC (with PDA support)
   * 4. Validate recipient token account exists on-chain
   * 5. Create transfer instruction (sender → recipient, specified amount)
   * 6. Build transaction with instruction
   * 7. Set fee payer (will be overridden by paymaster)
   * 8. Fetch and set recent blockhash (required for transaction validity)
   *
   * @param request - Transaction request with recipient address and amount
   * @param senderPublicKey - Sender's wallet public key (supports both regular keypairs and PDAs)
   * @returns Promise<Transaction> - Unsigned transaction ready for signing
   * @throws Error if recipient token account is not initialized
   * @throws Error if RPC request fails or network issues
   *
   * @example
   * const request: TransactionRequest = {
   *   recipientAddress: '3jeq5nuZ3a89zpmDCvvMfxs3YJYG1jFtonrgkjyHrdu',
   *   amount: 10.5,
   *   amountLamports: 10500000,
   *   timestamp: Date.now(),
   * };
   * const transaction = await SolanaService.buildUSDCTransfer(
   *   request,
   *   wallet.smartWalletPubkey
   * );
   */
  static async buildUSDCTransfer(
    request: TransactionRequest,
    senderPublicKey: PublicKey
  ): Promise<Transaction> {
    const connection = this.getConnection();
    const usdcMint = this.getUSDCMintAddress();

    // Parse recipient address string to PublicKey
    const recipientPublicKey = new PublicKey(request.recipientAddress);

    // Derive Associated Token Accounts for USDC
    // These are deterministic addresses based on wallet + mint
    // CRITICAL: Set allowOwnerOffCurve=true for smart wallet (PDA) compatibility
    // Lazorkit smart wallets use Program Derived Addresses which are intentionally off-curve
    const senderTokenAccount = await getAssociatedTokenAddress(
      usdcMint,
      senderPublicKey,
      true // allowOwnerOffCurve - required for smart wallet PDAs
    );

    const recipientTokenAccount = await getAssociatedTokenAddress(
      usdcMint,
      recipientPublicKey,
      true // allowOwnerOffCurve - recipient may also use smart wallet
    );

    // Verify recipient has initialized USDC token account (paymaster won't initialize)
    const recipientAccountInfo = await connection.getAccountInfo(
      recipientTokenAccount
    );

    if (recipientAccountInfo === null) {
      throw new Error(
        'Recipient USDC token account not initialized. They must receive USDC at least once before you can send to them.'
      );
    }

    // Create SPL Token transfer instruction
    // This moves USDC from sender's token account to recipient's token account
    const transferInstruction = createTransferInstruction(
      senderTokenAccount, // Source token account
      recipientTokenAccount, // Destination token account
      senderPublicKey, // Owner of source account
      request.amountLamports, // Amount in lamports (USDC has 6 decimals)
      [], // No multi-signers
      TOKEN_PROGRAM_ID // SPL Token program
    );

    // Build transaction with transfer instruction
    const transaction = new Transaction().add(transferInstruction);

    // Set fee payer (required, but will be overridden by paymaster)
    transaction.feePayer = senderPublicKey;

    // Fetch recent blockhash (required for transaction validity)
    // Blockhash acts as a timestamp and prevents transaction replay
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;

    return transaction;
  }

  /**
   * Confirm a submitted transaction and poll for finality.
   *
   * After a transaction is submitted to the blockchain, this method polls
   * the RPC node to wait for confirmation. Uses 'confirmed' commitment level
   * which requires 32 confirmations (~15-20 seconds on Solana).
   *
   * Returns a TransactionStatus object with signature, status, timestamps,
   * and Solana Explorer URL for viewing transaction details.
   *
   * Commitment Levels:
   * - 'processed': Transaction included in block (instant, not final)
   * - 'confirmed': 32 confirmations (~15-20 seconds) ← We use this
   * - 'finalized': Maximum confirmations (~30+ seconds, highest finality)
   *
   * @param signature - Transaction signature returned from signAndSendTransaction()
   * @returns Promise<TransactionStatus> - Status object with confirmation details
   * @throws Error if confirmation times out or RPC fails
   *
   * @example
   * const signature = await wallet.signAndSendTransaction(transaction);
   * const status = await SolanaService.confirmTransaction(signature);
   * if (status.status === 'confirmed') {
   *   console.log('Transaction confirmed!', status.explorerUrl);
   * }
   */
  static async confirmTransaction(
    signature: TransactionSignature
  ): Promise<TransactionStatus> {
    const connection = this.getConnection();
    const submittedAt = Date.now();

    try {
      // Poll for transaction confirmation with 'confirmed' commitment level
      // This method waits until the transaction reaches 32 confirmations
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
}

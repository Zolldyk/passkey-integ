import { PublicKey } from '@solana/web3.js';

/**
 * Design Tokens for Passkey Integration App
 *
 * This file contains all design tokens (colors, typography, spacing, border radius)
 * used throughout the application to ensure consistent styling and maintainability.
 *
 * Usage:
 * import { Colors, Typography, Spacing, BorderRadius } from '../services/constants';
 */

/**
 * Color Palette
 *
 * Defines the color system for the application including primary brand colors,
 * neutral colors for backgrounds and text, and semantic colors for UI states.
 */
export const Colors = {
  /** Primary brand colors from Solana design system */
  primary: {
    /** Solana brand purple - use for primary actions and accents */
    purple: '#9945FF',
    /** Solana brand cyan - use for highlights and secondary accents */
    cyan: '#14F195',
  },

  /** Neutral colors for backgrounds, borders, and text */
  neutral: {
    /** Lightest background color */
    50: '#FAFAFA',
    /** Secondary background color */
    100: '#F5F5F5',
    /** Medium gray for borders and secondary UI elements */
    500: '#737373',
    /** Primary text color */
    900: '#171717',
  },

  /** Semantic colors for UI states */
  /** Success state color (e.g., "Copied!" feedback) */
  success: '#10B981',
  /** Error state color (e.g., validation errors) */
  error: '#EF4444',
  /** Warning state color (e.g., important notices) */
  warning: '#F59E0B',
};

/**
 * Typography System
 *
 * Defines font sizes and weights for consistent text hierarchy.
 * All sizes are in points (pt) for mobile platforms.
 */
export const Typography = {
  /** Font size scale */
  fontSize: {
    /** Heading 1 - Large page titles */
    h1: 32,
    /** Heading 2 - Section titles */
    h2: 24,
    /** Body text - Default text size */
    body: 15,
    /** Caption - Small text, labels */
    caption: 11,
  },

  /** Font weight scale */
  fontWeight: {
    /** Regular weight for body text */
    regular: '400' as const,
    /** Semibold weight for emphasis */
    semibold: '600' as const,
    /** Bold weight for headings */
    bold: '700' as const,
  },
};

/**
 * Spacing Scale
 *
 * Defines consistent spacing values for padding, margins, and gaps.
 * All values are in points (pt) for mobile platforms.
 */
export const Spacing = {
  /** Extra small spacing (4pt) */
  xs: 4,
  /** Small spacing (8pt) */
  sm: 8,
  /** Medium spacing (12pt) */
  md: 12,
  /** Large spacing (16pt) */
  lg: 16,
  /** Extra large spacing (24pt) */
  xl: 24,
  /** 2x extra large spacing (32pt) */
  xxl: 32,
  /** 3x extra large spacing (48pt) - for generous white space */
  xxxl: 48,
};

/**
 * Border Radius Scale
 *
 * Defines consistent border radius values for cards, buttons, and containers.
 * All values are in points (pt) for mobile platforms.
 */
export const BorderRadius = {
  /** Small radius (8pt) - buttons, small cards */
  sm: 8,
  /** Medium radius (12pt) - cards, containers */
  md: 12,
  /** Large radius (16pt) - large cards, modals */
  lg: 16,
  /** Full radius (999pt) - pills, circular buttons */
  full: 999,
};

/**
 * USDC SPL Token mint address on Solana Devnet.
 *
 * This is the official Devnet USDC token mint address used for all token operations.
 * On mainnet, this would be replaced with the mainnet USDC mint address.
 *
 * Address: Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr
 */
export const USDC_MINT_DEVNET = new PublicKey(
  'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr'
);

/**
 * Solana Devnet RPC endpoint URL.
 *
 * Public RPC endpoint for connecting to Solana Devnet blockchain.
 * Used for querying account data, sending transactions, and confirming transaction status.
 *
 * Rate Limit: ~40 requests per 10 seconds per IP (public endpoint)
 * For production use, consider using a paid RPC provider (QuickNode, Alchemy, Helius)
 */
export const SOLANA_RPC_URL = 'https://api.devnet.solana.com';

/**
 * Solana Explorer base URL.
 *
 * Used to construct deep links to view transaction details on Solana Explorer.
 * Append transaction signature and cluster parameter to create full URL.
 *
 * Example: https://explorer.solana.com/tx/SIGNATURE?cluster=devnet
 */
export const SOLANA_EXPLORER_URL = 'https://explorer.solana.com';

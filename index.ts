/**
 * @packageDocumentation
 * @module Lavarage SDK
 * 
 * The main entry point for the Lavarage SDK, providing functionality for interacting
 * with the Lavarage DeFi protocol on both Solana and EVM chains.
 * 
 * @example
 * ```typescript
 * import { getPda, getPositionAccountPDA } from '@lavarage/sdk';
 * import * as lending from '@lavarage/sdk/lending';
 * ```
 */

import { BN, Program, ProgramAccount } from "@coral-xyz/anchor";
import { Lavarage } from "./idl/lavarage";
import { Lavarage as LavarageV2 } from "./idl/lavaragev2";
import { UserVault, IDL as userVaultIDL } from "./idl/referralVault";
import bs58 from "bs58";
import {
  AccountInfo,
  AddressLookupTableAccount,
  ComputeBudgetProgram,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  TokenAccountNotFoundError,
  TokenInvalidAccountOwnerError,
} from "@solana/spl-token";

export * from "./evm";
export * as lending from "./lending";


type OptionalRPCResults = {
  addressLookupTableAccounts?: AccountInfo<Buffer>[];
  latestBlockhash?: string;
  tokenAccountConfirmCreatedAddresses?: PublicKey[];
  quoteMintAccountInfo?: AccountInfo<Buffer>;
}
const REFFERAL_VAULT_PROGRAM_ID = new PublicKey("FFe8xWs9iBdWB6vsxg8yBLirZHsbACFNbXqAM4K3fPPB");



/**
 * Derives a Program Derived Address (PDA) for the given seed(s) and program ID
 * 
 * @group Traders
 * @category Utilities
 * 
 * @param seed - Single buffer or array of buffers to use as seeds
 * @param programId - The Solana program ID to derive the PDA from
 * @returns The derived public key address
 * 
 * @example
 * ```typescript
 * const seed = Buffer.from("position");
 * const pda = getPda(seed, programId);
 * ```
 */
export function getPda(seed: Buffer | Buffer[], programId: PublicKey) {
  const seedsBuffer = Array.isArray(seed) ? seed : [seed];

  return PublicKey.findProgramAddressSync(seedsBuffer, programId)[0];
}
/**
 * Generates a Position Account PDA for a specific offer and user
 *
 * @group Traders
 * @category Utilities
 *
 * @param lavarageProgram - The Lavarage program instance (V1 or V2)
 * @param offer - The offer program account
 * @param seed - Additional seed for uniqueness (typically a public key)
 * @returns The Position Account PDA public key
 * 
 * @example
 * ```typescript
 * const positionPDA = getPositionAccountPDA(
 *   lavarageProgram,
 *   offerAccount,
 *   userPublicKey
 * );
 * ```
 */

export function getPositionAccountPDA(
  lavarageProgram: Program<Lavarage> | Program<LavarageV2>,
  offer: ProgramAccount,
  seed: PublicKey
) {
  return getPda(
    [
      Buffer.from("position"),
      lavarageProgram.provider.publicKey!.toBuffer(),
      offer.publicKey.toBuffer(),
      seed.toBuffer(),
    ],
    lavarageProgram.programId
  );
}
/**
 * Gets an associated token account or creates the instruction to create one if it doesn't exist
 * 
 * @group Solana
 * @category Token Accounts
 * @internal
 * 
 * @param lavarageProgram - The Lavarage program instance
 * @param ownerPublicKey - The owner of the token account
 * @param tokenAddress - The mint address of the token
 * @param tokenProgram - Optional token program ID (defaults to TOKEN_PROGRAM_ID)
 * @param confirmCreatedAddresses - Optional array of addresses to confirm creation of token accounts
 * @returns Object containing the account address and creation instruction
 */

async function getTokenAccountOrCreateIfNotExists(
  lavarageProgram: Program<Lavarage> | Program<LavarageV2>,
  ownerPublicKey: PublicKey,
  tokenAddress: PublicKey,
  tokenProgram?: PublicKey,
  confirmCreatedAddresses?: PublicKey[]
) {
  const associatedTokenAddress = getAssociatedTokenAddressSync(
    tokenAddress,
    ownerPublicKey,
    true,
    tokenProgram,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  if (confirmCreatedAddresses?.includes(associatedTokenAddress)) {
    return {
      account: {
        address: associatedTokenAddress,
      },
      instruction: undefined,
    };
  }

  const instruction = createAssociatedTokenAccountIdempotentInstruction(
    lavarageProgram.provider.publicKey!,
    associatedTokenAddress,
    ownerPublicKey,
    tokenAddress,
    tokenProgram,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  return {
    account: {
      address: associatedTokenAddress,
    },
    instruction,
  };
}
/**
 * Re-exports all types and interfaces from the Lavarage V1 IDL
 * @group Solana
 */
export * from "./idl/lavarage";
/**
 * Namespace containing all types and interfaces from the Lavarage V2 IDL
 * @group Solana
 */
export * as IDLV2 from "./idl/lavaragev2";
/**
 * Fetches all available lending offers from the Lavarage protocol
 * 
 * @group Traders
 * @category Queries
 * 
 * @param lavarageProgram - The Lavarage program instance (V1 or V2)
 * @returns Promise resolving to an array of all pool/offer accounts
 * 
 * @example
 * ```typescript
 * // Fetch all offers
 * const offers = await getOffers(lavarageProgram);
 * 
 * // Process each offer
 * offers.forEach(offer => {
 *   console.log('Offer:', offer.publicKey.toString());
 *   console.log('Data:', offer.account);
 * });
 * ```
 */

export const getOffers = (
  lavarageProgram: Program<Lavarage> | Program<LavarageV2>
) => {
  return lavarageProgram.account.pool.all();
};
/**
 * Fetches all open positions from the Lavarage protocol
 * 
 * This function filters for positions with a specific data structure size (178 bytes)
 * and checks for positions that are currently open.
 *
 * @group Traders
 * @category Queries
 * 
 * @param lavarageProgram - The Lavarage program instance (V1 or V2)
 * @returns Promise resolving to an array of open position accounts
 * 
 * @example
 * ```typescript
 * // Get all open positions
 * const openPositions = await getOpenPositions(lavarageProgram);
 * 
 * console.log(`Found ${openPositions.length} open positions`);
 * 
 * // Filter positions by user
 * const userPositions = openPositions.filter(pos => 
 *   pos.account.owner.equals(userPublicKey)
 * );
 * ```
 * 
 * @remarks
 * The function query only open positions
 * without fetching closed or liquidated positions.
 */

export const getOpenPositions = (
  lavarageProgram: Program<Lavarage> | Program<LavarageV2>
) => {
  return lavarageProgram.account.position.all([
    { dataSize: 178 },
    {
      memcmp: {
        offset: 40,
        bytes: bs58.encode(new Uint8Array(8)),
      },
    },
  ]);
};
/**
 * Fetches all closed positions from the Lavarage protocol
 * 
 * 
 * @group Traders
 * @category Queries
 * 
 * @param lavarageProgram - The Lavarage program instance (V1 or V2)
 * @returns Promise resolving to an array of all closed position accounts from all three states
 * 
 * @example
 * ```typescript
 * // Get all closed positions
 * const closedPositions = await getClosedPositions(lavarageProgram);
 * 
 * console.log(`Found ${closedPositions.length} closed positions`);
 * 
 * // Filter by specific user
 * const userClosedPositions = closedPositions.filter(pos =>
 *   pos.account.owner.equals(userPublicKey)
 * );
 * ```
 * 
 */

export const getClosedPositions = async (
  lavarageProgram: Program<Lavarage> | Program<LavarageV2>
) => {
  const value = BigInt(9997);
  const valueBuffer = Buffer.alloc(8);
  valueBuffer.writeBigUInt64LE(value);
  const value2 = BigInt(9998);
  const valueBuffer2 = Buffer.alloc(8);
  valueBuffer2.writeBigUInt64LE(value2);
  const value3 = BigInt(9996);
  const valueBuffer3 = Buffer.alloc(8);
  valueBuffer3.writeBigUInt64LE(value3);
  return (
    await lavarageProgram.account.position.all([
      { dataSize: 178 },
      {
        memcmp: {
          offset: 40,
          bytes: bs58.encode(Uint8Array.from(valueBuffer)),
        },
      },
    ])
  )
    .concat(
      await lavarageProgram.account.position.all([
        { dataSize: 178 },
        {
          memcmp: {
            offset: 40,
            bytes: bs58.encode(Uint8Array.from(valueBuffer2)),
          },
        },
      ])
    )
    .concat(
      await lavarageProgram.account.position.all([
        { dataSize: 178 },
        {
          memcmp: {
            offset: 40,
            bytes: bs58.encode(Uint8Array.from(valueBuffer3)),
          },
        },
      ])
    );
};
/**
 * Fetches all liquidated positions from the Lavarage protocol
 * 
 * Liquidated positions are positions that were forcefully closed due to 
 * insufficient collateral or health factor falling below the threshold.
 * 
 * @group Traders
 * @category Queries
 * 
 * @param lavarageProgram - The Lavarage program instance (V1 or V2)
 * @returns Promise resolving to an array of liquidated position accounts
 * 
 * @example
 * ```typescript
 * // Get all liquidated positions
 * const liquidatedPositions = await getLiquidatedPositions(lavarageProgram);
 * 
 * console.log(`Found ${liquidatedPositions.length} liquidated positions`);
 * 
 * // Analyze liquidation data
 * liquidatedPositions.forEach(pos => {
 *   console.log('Position:', pos.publicKey.toString());
 *   console.log('Liquidated amount:', pos.account.amount);
 * });
 * ```
 * 
 * 
 * @see {@link getClosedPositions} - For other types of closed positions
 * @see {@link getOpenPositions} - For currently active positions
 */

export const getLiquidatedPositions = (
  lavarageProgram: Program<Lavarage> | Program<LavarageV2>
) => {
  const value = BigInt(9999);
  const valueBuffer = Buffer.alloc(8);
  valueBuffer.writeBigUInt64LE(value);
  return lavarageProgram.account.position.all([
    { dataSize: 178 },
    {
      memcmp: {
        offset: 40,
        bytes: bs58.encode(Uint8Array.from(valueBuffer)),
      },
    },
  ]);
};
/**
 * Fetches all positions from the Lavarage protocol
 * 
 * This function retrieves all position accounts regardless of their state (open, closed, liquidated).
 *
 * @group Traders
 * @category Queries
 * 
 * @param lavarageProgram - The Lavarage program instance (V1 or V2)
 * @returns Promise resolving to an array of position accounts
 * 
 * @example
 * ```typescript
 * // Get all positions
 * const allPositions = await getAllPositions(lavarageProgram);
 * 
 * console.log(`Found ${allPositions.length} total positions`);
 * 
 * // Filter positions by user
 * const userPositions = allPositions.filter(pos => 
 *   pos.account.owner.equals(userPublicKey)
 * );
 * ```
 *  
 * @remarks
 * Unlike other position query functions, this returns ALL positions without
 * filtering by status. Use more specific functions like `getOpenPositions`,
 * `getClosedPositions`, or `getLiquidatedPositions` if you only need positions
 * with a specific status.
 * 
 * @see {@link getOpenPositions} - For only open positions
 * @see {@link getClosedPositions} - For only closed positions
 * @see {@link getLiquidatedPositions} - For only liquidated positions
 */

export const getAllPositions = (
  lavarageProgram: Program<Lavarage> | Program<LavarageV2>
) => {
  return lavarageProgram.account.position.all([{ dataSize: 178 }]);
};

export const borrowV1 = async (
  lavarageProgram: Program<Lavarage>,
  offer: ProgramAccount<{
    nodeWallet: PublicKey;
    interestRate: number;
    collateralType: PublicKey;
  }>,
  marginSOL: BN,
  leverage: number,
  randomSeed: Keypair,
  tokenProgram: PublicKey,
  partnerFeeRecipient?: PublicKey,
  partnerFeeMarkup?: number,
  computeBudgetMicroLamports?: number,
  discountBps?: number,
  referralBps?: number,
  referralVaultProgram?: Program<UserVault>,
) => {
  let partnerFeeMarkupAsPkey;
  if (partnerFeeMarkup) {
    const feeBuffer = Buffer.alloc(8);
    feeBuffer.writeBigUInt64LE(BigInt(partnerFeeMarkup));
    const feeBuffer32 = Buffer.alloc(32);
    feeBuffer32.set(feeBuffer, 0);
    partnerFeeMarkupAsPkey = new PublicKey(feeBuffer32);
  }
  // assuming all token accounts are created prior
  const positionAccount = getPositionAccountPDA(
    lavarageProgram,
    offer,
    randomSeed.publicKey
  );

  const fromTokenAccount = await getTokenAccountOrCreateIfNotExists(
    lavarageProgram,
    lavarageProgram.provider.publicKey!,
    offer.account.collateralType,
    tokenProgram
  );

  const toTokenAccount = await getTokenAccountOrCreateIfNotExists(
    lavarageProgram,
    positionAccount,
    offer.account.collateralType,
    tokenProgram
  );

  const { blockhash } =
    await lavarageProgram.provider.connection.getLatestBlockhash("finalized");

  const useReferral = discountBps !== undefined && referralBps !== undefined;

  // Check if partner fee recipient vault needs to be initialized via referralVaultProgram
  let partnerFeeRecipientCreateIx: TransactionInstruction | undefined;
  let userVaultPda: PublicKey | undefined;
  if (partnerFeeRecipient && referralBps !== undefined && referralVaultProgram) {
    [userVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_vault"), new PublicKey(partnerFeeRecipient).toBuffer()],
      referralVaultProgram.programId
    );
    const vaultAccountInfo = await lavarageProgram.provider.connection.getAccountInfo(userVaultPda);
    if (!vaultAccountInfo) {
      // Initialize the vault using referralVaultProgram
      partnerFeeRecipientCreateIx = await referralVaultProgram.methods
        .initializeVault()
        .accountsStrict({
          userVault: userVaultPda,
          user: partnerFeeRecipient!,
          funder: lavarageProgram.provider.publicKey!,
          systemProgram: SystemProgram.programId,
        })
        .instruction();
    }
  }

  const tradingOpenBorrowInstruction = useReferral
    ? await lavarageProgram.methods
        .tradingOpenBorrowWithReferral(
          new BN((marginSOL.toNumber() * leverage).toFixed(0)),
          marginSOL,
          new BN(discountBps),
          new BN(referralBps)
        )
        .accountsStrict({
          nodeWallet: offer.account.nodeWallet,
          instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
          tradingPool: offer.publicKey,
          positionAccount,
          trader: lavarageProgram.provider.publicKey!,
          systemProgram: SystemProgram.programId,
          clock: SYSVAR_CLOCK_PUBKEY,
          randomAccountAsId: randomSeed.publicKey.toBase58(),
          feeReceipient: "6JfTobDvwuwZxZP6FR5JPmjdvQ4h4MovkEVH2FPsMSrF",
          positionTokenAccount: toTokenAccount.account!.address,
          collateralTokenProgram: tokenProgram,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          collateralMint: offer.account.collateralType,
        })
        .remainingAccounts(
          partnerFeeRecipient && partnerFeeMarkupAsPkey && userVaultPda
            ? [
              {
                pubkey: userVaultPda,
                isSigner: false,
                isWritable: true,
              }
            ]
            : []
        )
        .instruction()
    : await lavarageProgram.methods
        .tradingOpenBorrow(
          new BN((marginSOL.toNumber() * leverage).toFixed(0)),
          marginSOL
        )
        .accountsStrict({
          nodeWallet: offer.account.nodeWallet,
          instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
          tradingPool: offer.publicKey,
          positionAccount,
          trader: lavarageProgram.provider.publicKey!,
          systemProgram: SystemProgram.programId,
          clock: SYSVAR_CLOCK_PUBKEY,
          randomAccountAsId: randomSeed.publicKey.toBase58(),
          feeReceipient: "6JfTobDvwuwZxZP6FR5JPmjdvQ4h4MovkEVH2FPsMSrF",
          positionTokenAccount: toTokenAccount.account!.address,
          collateralTokenProgram: tokenProgram,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          collateralMint: offer.account.collateralType,
        })
        .remainingAccounts(
          partnerFeeRecipient && partnerFeeMarkupAsPkey
            ? [
              {
                pubkey: partnerFeeRecipient,
                isSigner: false,
                isWritable: true,
              },
              {
                pubkey: partnerFeeMarkupAsPkey,
                isSigner: false,
                isWritable: false,
              },
            ]
            : []
        )
        .instruction();

  const openAddCollateralInstruction = await lavarageProgram.methods
    .tradingOpenAddCollateral(offer.account.interestRate)
    .accountsStrict({
      tradingPool: offer.publicKey,
      trader: lavarageProgram.provider.publicKey!,
      mint: offer.account.collateralType,
      toTokenAccount: toTokenAccount.account!.address,
      systemProgram: SystemProgram.programId,
      positionAccount,
      randomAccountAsId: randomSeed.publicKey.toBase58(),
      tokenProgram: tokenProgram,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .instruction();

  const computeFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: computeBudgetMicroLamports ?? 100000,
  });

  const allInstructions = [
    fromTokenAccount.instruction!,
    toTokenAccount.instruction!,
    partnerFeeRecipientCreateIx,
    tradingOpenBorrowInstruction!,
    openAddCollateralInstruction!,
    computeBudgetMicroLamports ? computeFeeIx : undefined,
  ].filter(Boolean) as TransactionInstruction[];

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions: allInstructions,
  }).compileToV0Message();

  const tx = new VersionedTransaction(messageV0);

  return tx;
};

export const borrowV2 = async (
  lavarageProgram: Program<LavarageV2>,
  offer: ProgramAccount<{
    nodeWallet: PublicKey;
    interestRate: number;
    collateralType: PublicKey;
  }>,
  marginSOL: BN,
  leverage: number,
  randomSeed: Keypair,
  quoteToken: PublicKey,
  tokenProgram: PublicKey,
  partnerFeeRecipient?: PublicKey,
  partnerFeeMarkup?: number,
  computeBudgetMicroLamports?: number,
  discountBps?: number,
  referralBps?: number,
  referralVaultProgram?: Program<UserVault>,
) => {
  let partnerFeeMarkupAsPkey;
  if (partnerFeeMarkup) {
    const feeBuffer = Buffer.alloc(8);
    feeBuffer.writeBigUInt64LE(BigInt(partnerFeeMarkup));
    const feeBuffer32 = Buffer.alloc(32);
    feeBuffer32.set(feeBuffer, 0);
    partnerFeeMarkupAsPkey = new PublicKey(feeBuffer32);
  }
  // assuming all token accounts are created prior
  const positionAccount = getPositionAccountPDA(
    lavarageProgram,
    offer,
    randomSeed.publicKey
  );

  const quoteMintAccount =
    await lavarageProgram.provider.connection.getAccountInfo(quoteToken);
  const quoteTokenProgram = quoteMintAccount?.owner;

  const fromTokenAccount = await getTokenAccountOrCreateIfNotExists(
    lavarageProgram,
    lavarageProgram.provider.publicKey!,
    offer.account.collateralType,
    tokenProgram
  );

  const toTokenAccount = await getTokenAccountOrCreateIfNotExists(
    lavarageProgram,
    positionAccount,
    offer.account.collateralType,
    tokenProgram
  );

  const { blockhash } =
    await lavarageProgram.provider.connection.getLatestBlockhash("finalized");

  const useReferral = discountBps !== undefined && referralBps !== undefined;

  // Check if partner fee recipient vault and token account need to be created
  let partnerFeeRecipientVaultCreateIx: TransactionInstruction | undefined;
  let partnerFeeRecipientTokenAccountCreateIx: TransactionInstruction | undefined;
  let userVaultPda: PublicKey | undefined;
  
  if (partnerFeeRecipient && partnerFeeMarkupAsPkey && referralVaultProgram) {
    // Derive the userVault PDA
    [userVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_vault"), new PublicKey(partnerFeeRecipient).toBuffer()],
      referralVaultProgram.programId
    );
    
    // Get the vault's associated token account
    const vaultTokenAccount = getAssociatedTokenAddressSync(
      quoteToken,
      userVaultPda,
      true, // allowOwnerOffCurve for PDA
      quoteTokenProgram
    );
    
    // Check both accounts at the same time
    const [vaultAccountInfo, vaultTokenAccountInfo] = await lavarageProgram.provider.connection.getMultipleAccountsInfo([
      userVaultPda,
      vaultTokenAccount
    ]);
    
    // Create vault if it doesn't exist
    if (!vaultAccountInfo) {
      partnerFeeRecipientVaultCreateIx = await referralVaultProgram.methods
        .initializeVault()
        .accountsStrict({
          userVault: userVaultPda,
          user: partnerFeeRecipient!,
          funder: lavarageProgram.provider.publicKey!,
          systemProgram: SystemProgram.programId,
        })
        .instruction();
    }
    
    // Create token account if it doesn't exist
    if (!vaultTokenAccountInfo) {
      partnerFeeRecipientTokenAccountCreateIx = createAssociatedTokenAccountIdempotentInstruction(
        lavarageProgram.provider.publicKey!,
        vaultTokenAccount,
        userVaultPda,
        quoteToken,
        quoteTokenProgram,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
    }
  }

  const tradingOpenBorrowInstruction = useReferral
    ? await lavarageProgram.methods
        .tradingOpenBorrowWithReferral(
          new BN((marginSOL.toNumber() * leverage).toFixed(0)),
          marginSOL,
          new BN(discountBps),
          new BN(referralBps)
        )
        .accountsStrict({
          nodeWallet: offer.account.nodeWallet,
          instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
          tradingPool: offer.publicKey,
          positionAccount,
          trader: lavarageProgram.provider.publicKey!,
          systemProgram: SystemProgram.programId,
          clock: SYSVAR_CLOCK_PUBKEY,
          randomAccountAsId: randomSeed.publicKey.toBase58(),
          feeTokenAccount: getAssociatedTokenAddressSync(
            quoteToken,
            new PublicKey("6JfTobDvwuwZxZP6FR5JPmjdvQ4h4MovkEVH2FPsMSrF"),
            true,
            quoteTokenProgram
          ),
          toTokenAccount: getAssociatedTokenAddressSync(
            quoteToken,
            lavarageProgram.provider.publicKey!,
            true,
            quoteTokenProgram
          ),
          tokenProgram: quoteTokenProgram!,
          fromTokenAccount: getAssociatedTokenAddressSync(
            quoteToken,
            offer.account.nodeWallet,
            true,
            quoteTokenProgram
          ),
          positionTokenAccount: toTokenAccount.account!.address,
          collateralTokenProgram: tokenProgram,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          collateralMint: offer.account.collateralType,
        })
        .remainingAccounts(
          partnerFeeRecipient && partnerFeeMarkupAsPkey && userVaultPda
            ? [
              {
                pubkey: getAssociatedTokenAddressSync(
                  quoteToken,
                  userVaultPda,
                  true, // allowOwnerOffCurve for PDA
                  quoteTokenProgram
                ),
                isSigner: false,
                isWritable: true,
              }
            ]
            : []
        )
        .instruction()
    : await lavarageProgram.methods
        .tradingOpenBorrow(
          new BN((marginSOL.toNumber() * leverage).toFixed(0)),
          marginSOL
        )
        .accountsStrict({
          nodeWallet: offer.account.nodeWallet,
          instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
          tradingPool: offer.publicKey,
          positionAccount,
          trader: lavarageProgram.provider.publicKey!,
          systemProgram: SystemProgram.programId,
          clock: SYSVAR_CLOCK_PUBKEY,
          randomAccountAsId: randomSeed.publicKey.toBase58(),
          feeTokenAccount: getAssociatedTokenAddressSync(
            quoteToken,
            new PublicKey("6JfTobDvwuwZxZP6FR5JPmjdvQ4h4MovkEVH2FPsMSrF"),
            true,
            quoteTokenProgram
          ),
          toTokenAccount: getAssociatedTokenAddressSync(
            quoteToken,
            lavarageProgram.provider.publicKey!,
            true,
            quoteTokenProgram
          ),
          tokenProgram: quoteTokenProgram!,
          fromTokenAccount: getAssociatedTokenAddressSync(
            quoteToken,
            offer.account.nodeWallet,
            true,
            quoteTokenProgram
          ),
          positionTokenAccount: toTokenAccount.account!.address,
          collateralTokenProgram: tokenProgram,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          collateralMint: offer.account.collateralType,
        })
        .remainingAccounts(
          partnerFeeRecipient && partnerFeeMarkupAsPkey && userVaultPda
            ? [
              {
                pubkey: getAssociatedTokenAddressSync(
                  quoteToken,
                  userVaultPda,
                  true, // allowOwnerOffCurve for PDA
                  quoteTokenProgram
                ),
                isSigner: false,
                isWritable: true,
              },
              {
                pubkey: partnerFeeMarkupAsPkey,
                isSigner: false,
                isWritable: false,
              },
            ]
            : []
        )
        .instruction();

  const openAddCollateralInstruction = await lavarageProgram.methods
    .tradingOpenAddCollateral(offer.account.interestRate < 255 ? offer.account.interestRate + 1 : 255)
    .accountsStrict({
      tradingPool: offer.publicKey,
      trader: lavarageProgram.provider.publicKey!,
      mint: offer.account.collateralType,
      toTokenAccount: toTokenAccount.account!.address,
      systemProgram: SystemProgram.programId,
      positionAccount,
      randomAccountAsId: randomSeed.publicKey.toBase58(),
      tokenProgram: tokenProgram,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .instruction();

  const computeFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: computeBudgetMicroLamports ?? 100000,
  });

  const allInstructions = [
    fromTokenAccount.instruction!,
    partnerFeeRecipientVaultCreateIx,
    partnerFeeRecipientTokenAccountCreateIx,
    tradingOpenBorrowInstruction!,
    openAddCollateralInstruction!,
    computeBudgetMicroLamports ? computeFeeIx : undefined,
  ].filter(Boolean) as TransactionInstruction[];

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions: allInstructions,
  }).compileToV0Message();

  const tx = new VersionedTransaction(messageV0);

  return tx;
};

/**
 * Opens a leveraged trading position on Lavarage V1
 * 
 * This function executes a complete leveraged trade by:
 * 1. Borrowing funds from the lending pool based on leverage
 * 2. Swapping tokens through Jupiter DEX
 * 3. Depositing the swapped tokens as collateral
 * 
 * @group Traders
 * @category Trading
 * 
 * @param lavarageProgram - The Lavarage V1 program instance
 * @param offer - The lending offer containing terms (interest rate, collateral type, node wallet)
 * @param jupInstruction - Jupiter swap instructions including setup and swap details
 * @param marginSOL - The user's margin amount in SOL (as BN)
 * @param leverage - The leverage multiplier (e.g., 2 for 2x leverage)
 * @param randomSeed - A keypair used to generate unique position account address
 * @param tokenProgram - The SPL token program ID
 * @param partnerFeeRecipient - Optional wallet to receive partner fees
 * @param partnerFeeMarkup - Optional partner fee amount in basis points
 * @param computeBudgetMicroLamports - Optional compute budget for priority fees
 * @param platformFeeRecipient - Optional wallet to receive platform fees (jup, okx)
 * @param splitTransactions - Optional boolean to split the transaction into multiple transactions (jito bundle)
 * @param discountBps - Optional discount basis points for the referral program
 * @param referralBps - Optional referral basis points for the referral program
 * @param optionalRPCResults - Optional RPC results to use for the transaction (speeds up the transaction building)
 * 
 * @returns A versioned transaction ready to be signed and sent
 * 
 * @example
 * ```typescript
 * // Open a 2x leveraged position with 1 SOL margin
 * const marginSOL = new BN(1_000_000_000); // 1 SOL in lamports
 * const leverage = 2;
 * const randomSeed = Keypair.generate();
 * 
 * const tx = await openTradeV1(
 *   lavarageProgram,
 *   offerAccount,
 *   jupiterInstructions,
 *   marginSOL,
 *   leverage,
 *   randomSeed,
 *   TOKEN_PROGRAM_ID
 * );
 * 
 * // Sign and send transaction
 * const signature = await sendAndConfirmTransaction(connection, tx, [wallet, randomSeed]);
 * ```
 * 
 * @remarks
 * - The function creates token accounts if they don't exist
 * 
 * @throws Will throw if token accounts cannot be created or if Jupiter instructions are invalid
 */

export const openTradeV1 = async (
  lavarageProgram: Program<Lavarage>,
  offer: ProgramAccount<{
    nodeWallet: PublicKey;
    interestRate: number;
    collateralType: PublicKey;
  }>,
  jupInstruction: {
    instructions: {
      setupInstructions: Record<string, unknown>[];
      swapInstruction: Record<string, unknown>;
      addressLookupTableAddresses: string[];
    };
  },
  marginSOL: BN,
  leverage: number,
  randomSeed: Keypair,
  tokenProgram: PublicKey,
  partnerFeeRecipient?: PublicKey,
  partnerFeeMarkup?: number,
  computeBudgetMicroLamports?: number,
  platformFeeRecipient?: PublicKey,
  splitTransactions?: boolean,
  discountBps?: number,
  referralBps?: number,
  optionalRPCResults?: OptionalRPCResults,
) => {
  let partnerFeeMarkupAsPkey;
  const referralVaultProgram = new Program<UserVault>(userVaultIDL, REFFERAL_VAULT_PROGRAM_ID, lavarageProgram.provider);
  if (partnerFeeMarkup) {
    const feeBuffer = Buffer.alloc(8);
    feeBuffer.writeBigUInt64LE(BigInt(partnerFeeMarkup));
    const feeBuffer32 = Buffer.alloc(32);
    feeBuffer32.set(feeBuffer, 0);
    partnerFeeMarkupAsPkey = new PublicKey(feeBuffer32);
  }
  // assuming all token accounts are created prior
  const positionAccount = getPositionAccountPDA(
    lavarageProgram,
    offer,
    randomSeed.publicKey
  );

  const fromTokenAccount = await getTokenAccountOrCreateIfNotExists(
    lavarageProgram,
    lavarageProgram.provider.publicKey!,
    offer.account.collateralType,
    tokenProgram,
    optionalRPCResults?.tokenAccountConfirmCreatedAddresses
  );

  const toTokenAccount = await getTokenAccountOrCreateIfNotExists(
    lavarageProgram,
    positionAccount,
    offer.account.collateralType,
    tokenProgram,
    optionalRPCResults?.tokenAccountConfirmCreatedAddresses
  );

  const platformFeeRecipientAccount = platformFeeRecipient ? await getTokenAccountOrCreateIfNotExists(
    lavarageProgram,
    platformFeeRecipient,
    offer.account.collateralType,
    tokenProgram,
    optionalRPCResults?.tokenAccountConfirmCreatedAddresses
  ) : undefined;

  const tokenAccountCreationTx = new Transaction();

  if (fromTokenAccount.instruction) {
    tokenAccountCreationTx.add(fromTokenAccount.instruction);
  }

  if (toTokenAccount.instruction) {
    tokenAccountCreationTx.add(toTokenAccount.instruction);
  }

  if (platformFeeRecipientAccount?.instruction) {
    tokenAccountCreationTx.add(platformFeeRecipientAccount.instruction);
  }

  const instructionsJup = jupInstruction.instructions;

  const {
    setupInstructions,
    swapInstruction: swapInstructionPayload,
    addressLookupTableAddresses,
  } = instructionsJup;

  const deserializeInstruction = (instruction: any) => {
    return new TransactionInstruction({
      programId: new PublicKey(instruction.programId),

      keys: instruction.accounts.map((key: any) => ({
        pubkey: new PublicKey(key.pubkey),
        isSigner: key.isSigner,
        isWritable: key.isWritable,
      })),
      data: Buffer.from(instruction.data, "base64"),
    });
  };

  const getAddressLookupTableAccounts = async (
    keys: string[]
  ): Promise<AddressLookupTableAccount[]> => {
    const addressLookupTableAccountInfos = optionalRPCResults?.addressLookupTableAccounts ??
      await lavarageProgram.provider.connection.getMultipleAccountsInfo(
        keys.map((key) => new PublicKey(key))
      );

    return addressLookupTableAccountInfos.reduce((acc, accountInfo, index) => {
      const addressLookupTableAddress = keys[index];
      if (accountInfo) {
        const addressLookupTableAccount = new AddressLookupTableAccount({
          key: new PublicKey(addressLookupTableAddress),
          state: AddressLookupTableAccount.deserialize(
            Uint8Array.from(accountInfo.data)
          ),
        });
        acc.push(addressLookupTableAccount);
      }

      return acc;
    }, new Array<AddressLookupTableAccount>());
  };

  const addressLookupTableAccounts: AddressLookupTableAccount[] = [];

  addressLookupTableAccounts.push(
    ...(await getAddressLookupTableAccounts([
      "5LEAB3owNUSKvECm7vkr58tDtQpzbngQ2NYpc7qmRFdi",
      ...addressLookupTableAddresses,
    ]))
  );

  const blockhash =
    optionalRPCResults?.latestBlockhash ?? (await lavarageProgram.provider.connection.getLatestBlockhash("finalized")).blockhash;

  const useReferral = discountBps !== undefined && referralBps !== undefined;

  // Check if partner fee recipient vault needs to be initialized via referralVaultProgram
  let partnerFeeRecipientCreateIx: TransactionInstruction | undefined;
  let userVaultPda: PublicKey | undefined;
  if (partnerFeeRecipient && referralBps !== undefined && referralVaultProgram) {
    [userVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_vault"), new PublicKey(partnerFeeRecipient).toBuffer()],
      referralVaultProgram.programId
    );
    const vaultAccountInfo = await lavarageProgram.provider.connection.getAccountInfo(userVaultPda);
    if (!vaultAccountInfo) {
      // Initialize the vault using referralVaultProgram
      partnerFeeRecipientCreateIx = await referralVaultProgram.methods
        .initializeVault()
        .accountsStrict({
          userVault: userVaultPda,
          user: partnerFeeRecipient!,
          funder: lavarageProgram.provider.publicKey!,
          systemProgram: SystemProgram.programId,
        })
        .instruction();
    }
  }

  const tradingOpenBorrowInstruction = useReferral
    ? await lavarageProgram.methods
        .tradingOpenBorrowWithReferral(
          new BN((marginSOL.toNumber() * leverage).toFixed(0)),
          marginSOL,
          new BN(discountBps),
          new BN(referralBps)
        )
        .accountsStrict({
          nodeWallet: offer.account.nodeWallet,
          instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
          tradingPool: offer.publicKey,
          positionAccount,
          trader: lavarageProgram.provider.publicKey!,
          systemProgram: SystemProgram.programId,
          clock: SYSVAR_CLOCK_PUBKEY,
          randomAccountAsId: randomSeed.publicKey.toBase58(),
          feeReceipient: "6JfTobDvwuwZxZP6FR5JPmjdvQ4h4MovkEVH2FPsMSrF",
          positionTokenAccount: toTokenAccount.account!.address,
          collateralTokenProgram: tokenProgram,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          collateralMint: offer.account.collateralType,
        })
        .remainingAccounts(
          partnerFeeRecipient && partnerFeeMarkupAsPkey && userVaultPda
            ? [
              {
                pubkey: userVaultPda,
                isSigner: false,
                isWritable: true,
              }
            ]
            : []
        )
        .instruction()
    : await lavarageProgram.methods
        .tradingOpenBorrow(
          new BN((marginSOL.toNumber() * leverage).toFixed(0)),
          marginSOL
        )
        .accountsStrict({
          nodeWallet: offer.account.nodeWallet,
          instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
          tradingPool: offer.publicKey,
          positionAccount,
          trader: lavarageProgram.provider.publicKey!,
          systemProgram: SystemProgram.programId,
          clock: SYSVAR_CLOCK_PUBKEY,
          randomAccountAsId: randomSeed.publicKey.toBase58(),
          feeReceipient: "6JfTobDvwuwZxZP6FR5JPmjdvQ4h4MovkEVH2FPsMSrF",
          positionTokenAccount: toTokenAccount.account!.address,
          collateralTokenProgram: tokenProgram,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          collateralMint: offer.account.collateralType,
        })
        .remainingAccounts(
          partnerFeeRecipient && partnerFeeMarkupAsPkey
            ? [
              {
                pubkey: partnerFeeRecipient,
                isSigner: false,
                isWritable: true,
              },
              {
                pubkey: partnerFeeMarkupAsPkey,
                isSigner: false,
                isWritable: false,
              },
            ]
            : []
        )
        .instruction();

  const openAddCollateralInstruction = await lavarageProgram.methods
    .tradingOpenAddCollateral(offer.account.interestRate)
    .accountsStrict({
      tradingPool: offer.publicKey,
      trader: lavarageProgram.provider.publicKey!,
      mint: offer.account.collateralType,
      toTokenAccount: toTokenAccount.account!.address,
      systemProgram: SystemProgram.programId,
      positionAccount,
      randomAccountAsId: randomSeed.publicKey.toBase58(),
      tokenProgram: tokenProgram,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .instruction();

  const jupiterIxs = [
    ...setupInstructions.map(deserializeInstruction),
    deserializeInstruction(swapInstructionPayload),
  ];

  const computeFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: computeBudgetMicroLamports ?? 100000,
  });

  if (splitTransactions) {
    const setUpInstructions = [
      fromTokenAccount.instruction!,
      toTokenAccount.instruction!,
      partnerFeeRecipientCreateIx,
      ...setupInstructions.map(deserializeInstruction),
    ].filter(Boolean) as TransactionInstruction[];

    const allInstructions = [
      tradingOpenBorrowInstruction!,
      deserializeInstruction(swapInstructionPayload), ,
      openAddCollateralInstruction!,
      computeBudgetMicroLamports ? computeFeeIx : undefined,
    ].filter(Boolean) as TransactionInstruction[];

    const messageV01 = new TransactionMessage({
      payerKey: lavarageProgram.provider.publicKey!,
      recentBlockhash: blockhash,
      instructions: setUpInstructions,
    }).compileToV0Message(addressLookupTableAccounts);

    const tx2 = new VersionedTransaction(messageV01);

    const messageV0 = new TransactionMessage({
      payerKey: lavarageProgram.provider.publicKey!,
      recentBlockhash: blockhash,
      instructions: allInstructions,
    }).compileToV0Message(addressLookupTableAccounts);

    const tx = new VersionedTransaction(messageV0);

    return [tx2, tx];
  }

  const allInstructions = [
    fromTokenAccount.instruction!,
    toTokenAccount.instruction!,
    partnerFeeRecipientCreateIx,
    tradingOpenBorrowInstruction!,
    ...jupiterIxs,
    openAddCollateralInstruction!,
    computeBudgetMicroLamports ? computeFeeIx : undefined,
  ].filter(Boolean) as TransactionInstruction[];

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions: allInstructions,
  }).compileToV0Message(addressLookupTableAccounts);

  const tx = new VersionedTransaction(messageV0);

  return tx;
};

/**
 * Opens a leveraged trading position on Lavarage V2
 * 
 * This function executes a complete leveraged trade similar to V1, but with 
 * enhanced support for multiple quote tokens (not limited to SOL).
 * The process includes:
 * 1. Borrowing funds from the lending pool based on leverage
 * 2. Swapping tokens through Jupiter DEX
 * 3. Depositing the swapped tokens as collateral
 * 
 * @group Traders
 * @category Trading
 * 
 * @param lavarageProgram - The Lavarage V2 program instance
 * @param offer - The lending offer containing terms (interest rate, collateral type, node wallet)
 * @param jupInstruction - Jupiter swap instructions including setup and swap details
 * @param marginSOL - The user's margin amount in SOL (as BN)
 * @param leverage - The leverage multiplier (e.g., 2 for 2x leverage)
 * @param randomSeed - A keypair used to generate unique position account address
 * @param quoteToken - The quote token mint address (e.g., USDC, USDT, or SOL)
 * @param tokenProgram - The SPL token program ID for the collateral token
 * @param partnerFeeRecipient - Optional wallet to receive partner fees
 * @param partnerFeeMarkup - Optional partner fee amount in basis points
 * @param computeBudgetMicroLamports - Optional compute budget for priority fees
 * @param platformFeeRecipient - Optional wallet to receive platform fees (jup, okx)
 * @param splitTransactions - Optional boolean to split the transaction into multiple transactions (jito bundle)
 * @param discountBps - Optional discount basis points for the referral program
 * @param referralBps - Optional referral basis points for the referral program
 * @param optionalRPCResults - Optional RPC results to use for the transaction (speeds up the transaction building)
 * 
 * @returns A versioned transaction ready to be signed and sent
 * 
 * @example
 * ```typescript
 * // Open a 3x leveraged position with USDC as quote token
 * const marginSOL = new BN(1_000_000_000); // 1 SOL equivalent
 * const leverage = 3;
 * const randomSeed = Keypair.generate();
 * const usdcMint = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
 * 
 * const tx = await openTradeV2(
 *   lavarageProgram,
 *   offerAccount,
 *   jupiterInstructions,
 *   marginSOL,
 *   leverage,
 *   randomSeed,
 *   usdcMint,  // Quote token
 *   TOKEN_PROGRAM_ID
 * );
 * 
 * // Sign and send transaction
 * const signature = await sendAndConfirmTransaction(connection, tx, [wallet, randomSeed]);
 * ```
 * 
 * @remarks
 * - V2 supports multiple quote tokens while V1 only supports SOL
 * 
 * @see {@link openTradeV1} - The V1 version limited to SOL as quote token
 */

export const openTradeV2 = async (
  lavarageProgram: Program<LavarageV2>,
  offer: ProgramAccount<{
    nodeWallet: PublicKey;
    interestRate: number;
    collateralType: PublicKey;
  }>,
  jupInstruction: {
    instructions: {
      setupInstructions: Record<string, unknown>[];
      swapInstruction: Record<string, unknown>;
      addressLookupTableAddresses: string[];
    };
  },
  marginSOL: BN,
  leverage: number,
  randomSeed: Keypair,
  quoteToken: PublicKey,
  tokenProgram: PublicKey,
  partnerFeeRecipient?: PublicKey,
  partnerFeeMarkup?: number,
  computeBudgetMicroLamports?: number,
  platformFeeRecipient?: PublicKey,
  splitTransactions?: boolean,
  discountBps?: number,
  referralBps?: number,
  optionalRPCResults?: OptionalRPCResults,
) => {
  let partnerFeeMarkupAsPkey;
  const referralVaultProgram = new Program<UserVault>(userVaultIDL, REFFERAL_VAULT_PROGRAM_ID, lavarageProgram.provider);
  
  if (partnerFeeMarkup) {
    const feeBuffer = Buffer.alloc(8);
    feeBuffer.writeBigUInt64LE(BigInt(partnerFeeMarkup));
    const feeBuffer32 = Buffer.alloc(32);
    feeBuffer32.set(feeBuffer, 0);
    partnerFeeMarkupAsPkey = new PublicKey(feeBuffer32);
  }
  // assuming all token accounts are created prior
  const positionAccount = getPositionAccountPDA(
    lavarageProgram,
    offer,
    randomSeed.publicKey
  );

  const quoteMintAccount = optionalRPCResults?.quoteMintAccountInfo ??
    await lavarageProgram.provider.connection.getAccountInfo(quoteToken);
  const quoteTokenProgram = quoteMintAccount?.owner;

  const fromTokenAccount = await getTokenAccountOrCreateIfNotExists(
    lavarageProgram,
    lavarageProgram.provider.publicKey!,
    offer.account.collateralType,
    tokenProgram,
    optionalRPCResults?.tokenAccountConfirmCreatedAddresses
  );

  const toTokenAccount = await getTokenAccountOrCreateIfNotExists(
    lavarageProgram,
    positionAccount,
    offer.account.collateralType,
    tokenProgram,
    optionalRPCResults?.tokenAccountConfirmCreatedAddresses
  );

  const platformFeeRecipientAccount = platformFeeRecipient ? await getTokenAccountOrCreateIfNotExists(
    lavarageProgram,
    platformFeeRecipient,
    offer.account.collateralType,
    tokenProgram,
    optionalRPCResults?.tokenAccountConfirmCreatedAddresses
  ) : undefined;

  const tokenAccountCreationTx = new Transaction();

  if (fromTokenAccount.instruction) {
    tokenAccountCreationTx.add(fromTokenAccount.instruction);
  }

  if (toTokenAccount.instruction) {
    tokenAccountCreationTx.add(toTokenAccount.instruction);
  }

  if (platformFeeRecipientAccount?.instruction) {
    tokenAccountCreationTx.add(platformFeeRecipientAccount.instruction);
  }

  const instructionsJup = jupInstruction.instructions;

  const {
    setupInstructions,
    swapInstruction: swapInstructionPayload,
    addressLookupTableAddresses,
  } = instructionsJup;

  const deserializeInstruction = (instruction: any) => {
    return new TransactionInstruction({
      programId: new PublicKey(instruction.programId),

      keys: instruction.accounts.map((key: any) => ({
        pubkey: new PublicKey(key.pubkey),
        isSigner: key.isSigner,
        isWritable: key.isWritable,
      })),
      data: Buffer.from(instruction.data, "base64"),
    });
  };

  const getAddressLookupTableAccounts = async (
    keys: string[]
  ): Promise<AddressLookupTableAccount[]> => {
    const addressLookupTableAccountInfos =
      optionalRPCResults?.addressLookupTableAccounts ?? await lavarageProgram.provider.connection.getMultipleAccountsInfo(
        keys.map((key) => new PublicKey(key))
      );

    return addressLookupTableAccountInfos.reduce((acc, accountInfo, index) => {
      const addressLookupTableAddress = keys[index];
      if (accountInfo) {
        const addressLookupTableAccount = new AddressLookupTableAccount({
          key: new PublicKey(addressLookupTableAddress),
          state: AddressLookupTableAccount.deserialize(
            Uint8Array.from(accountInfo.data)
          ),
        });
        acc.push(addressLookupTableAccount);
      }

      return acc;
    }, new Array<AddressLookupTableAccount>());
  };

  const addressLookupTableAccounts: AddressLookupTableAccount[] = [];

  addressLookupTableAccounts.push(
    ...(await getAddressLookupTableAccounts([
      ...addressLookupTableAddresses,
      getQuoteCurrencySpecificAddressLookupTable(quoteToken.toBase58()),
      "5LEAB3owNUSKvECm7vkr58tDtQpzbngQ2NYpc7qmRFdi",
    ]))
  );

  const { blockhash } =
    await lavarageProgram.provider.connection.getLatestBlockhash("finalized");

  const useReferral = discountBps !== undefined && referralBps !== undefined;

  // Check if partner fee recipient vault and token account need to be created
  let partnerFeeRecipientVaultCreateIx: TransactionInstruction | undefined;
  let partnerFeeRecipientTokenAccountCreateIx: TransactionInstruction | undefined;
  let userVaultPda: PublicKey | undefined;

  const partnerDirectAta = partnerFeeRecipient ? getAssociatedTokenAddressSync(
    quoteToken,
    partnerFeeRecipient,
    true,
    quoteTokenProgram
  ) : undefined;
  
  if (partnerFeeRecipient && partnerFeeMarkupAsPkey && referralVaultProgram) {
    // Derive the userVault PDA
    [userVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_vault"), new PublicKey(partnerFeeRecipient).toBuffer()],
      referralVaultProgram.programId
    );
    
    // Get the vault's associated token account
    const vaultTokenAccount = getAssociatedTokenAddressSync(
      quoteToken,
      userVaultPda,
      true, // allowOwnerOffCurve for PDA
      quoteTokenProgram
    );
    
    // Check both accounts at the same time
    const [vaultAccountInfo, vaultTokenAccountInfo] = await lavarageProgram.provider.connection.getMultipleAccountsInfo([
      userVaultPda,
      vaultTokenAccount
    ]);
    
    // Create vault if it doesn't exist
    if (!vaultAccountInfo) {
      partnerFeeRecipientVaultCreateIx = await referralVaultProgram.methods
        .initializeVault()
        .accountsStrict({
          userVault: userVaultPda,
          user: partnerFeeRecipient!,
          funder: lavarageProgram.provider.publicKey!,
          systemProgram: SystemProgram.programId,
        })
        .instruction();
    }
    
    // Create token account if it doesn't exist
    if (!vaultTokenAccountInfo) {
      partnerFeeRecipientTokenAccountCreateIx = createAssociatedTokenAccountIdempotentInstruction(
        lavarageProgram.provider.publicKey!,
        vaultTokenAccount,
        userVaultPda,
        quoteToken,
        quoteTokenProgram,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
    }
  } else if (partnerFeeRecipient && partnerDirectAta) {
    const [partnerDirectAtaInfo] = await lavarageProgram.provider.connection.getMultipleAccountsInfo([
      partnerDirectAta
    ]);
    if (!partnerDirectAtaInfo) {
      partnerFeeRecipientTokenAccountCreateIx = createAssociatedTokenAccountIdempotentInstruction(
        lavarageProgram.provider.publicKey!,
        partnerDirectAta,
        partnerFeeRecipient!,
        quoteToken,
        quoteTokenProgram,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
    }
  }

  

  const tradingOpenBorrowInstruction = useReferral
    ? await lavarageProgram.methods
        .tradingOpenBorrowWithReferral(
          new BN((marginSOL.toNumber() * leverage).toFixed(0)),
          marginSOL,
          new BN(discountBps),
          new BN(referralBps)
        )
        .accountsStrict({
          nodeWallet: offer.account.nodeWallet,
          instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
          tradingPool: offer.publicKey,
          positionAccount,
          trader: lavarageProgram.provider.publicKey!,
          systemProgram: SystemProgram.programId,
          clock: SYSVAR_CLOCK_PUBKEY,
          randomAccountAsId: randomSeed.publicKey.toBase58(),
          feeTokenAccount: getAssociatedTokenAddressSync(
            quoteToken,
            new PublicKey("6JfTobDvwuwZxZP6FR5JPmjdvQ4h4MovkEVH2FPsMSrF"),
            true,
            quoteTokenProgram
          ),
          toTokenAccount: getAssociatedTokenAddressSync(
            quoteToken,
            lavarageProgram.provider.publicKey!,
            true,
            quoteTokenProgram
          ),
          tokenProgram: quoteTokenProgram!,
          fromTokenAccount: getAssociatedTokenAddressSync(
            quoteToken,
            offer.account.nodeWallet,
            true,
            quoteTokenProgram
          ),
          positionTokenAccount: toTokenAccount.account!.address,
          collateralTokenProgram: tokenProgram,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          collateralMint: offer.account.collateralType,
        })
        .remainingAccounts(
          partnerFeeRecipient && partnerFeeMarkupAsPkey && userVaultPda
            ? [
              {
                pubkey: getAssociatedTokenAddressSync(
                  quoteToken,
                  userVaultPda,
                  true, // allowOwnerOffCurve for PDA
                  quoteTokenProgram
                ),
                isSigner: false,
                isWritable: true,
              }
            ]
            : []
        )
        .instruction()
    : await lavarageProgram.methods
        .tradingOpenBorrow(
          new BN((marginSOL.toNumber() * leverage).toFixed(0)),
          marginSOL
        )
        .accountsStrict({
          nodeWallet: offer.account.nodeWallet,
          instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
          tradingPool: offer.publicKey,
          positionAccount,
          trader: lavarageProgram.provider.publicKey!,
          systemProgram: SystemProgram.programId,
          clock: SYSVAR_CLOCK_PUBKEY,
          randomAccountAsId: randomSeed.publicKey.toBase58(),
          feeTokenAccount: getAssociatedTokenAddressSync(
            quoteToken,
            new PublicKey("6JfTobDvwuwZxZP6FR5JPmjdvQ4h4MovkEVH2FPsMSrF"),
            true,
            quoteTokenProgram
          ),
          toTokenAccount: getAssociatedTokenAddressSync(
            quoteToken,
            lavarageProgram.provider.publicKey!,
            true,
            quoteTokenProgram
          ),
          tokenProgram: quoteTokenProgram!,
          fromTokenAccount: getAssociatedTokenAddressSync(
            quoteToken,
            offer.account.nodeWallet,
            true,
            quoteTokenProgram
          ),
          positionTokenAccount: toTokenAccount.account!.address,
          collateralTokenProgram: tokenProgram,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          collateralMint: offer.account.collateralType,
        })
        .remainingAccounts(
          partnerFeeRecipient && partnerFeeMarkupAsPkey && partnerDirectAta
            ? [
              {
                pubkey: partnerDirectAta,
                isSigner: false,
                isWritable: true,
              },
              {
                pubkey: partnerFeeMarkupAsPkey,
                isSigner: false,
                isWritable: false,
              },
            ]
            : []
        )
        .instruction();

  const openAddCollateralInstruction = await lavarageProgram.methods
    .tradingOpenAddCollateral(offer.account.interestRate < 255 ? offer.account.interestRate + 1 : 255)
    .accountsStrict({
      tradingPool: offer.publicKey,
      trader: lavarageProgram.provider.publicKey!,
      mint: offer.account.collateralType,
      toTokenAccount: toTokenAccount.account!.address,
      systemProgram: SystemProgram.programId,
      positionAccount,
      randomAccountAsId: randomSeed.publicKey.toBase58(),
      tokenProgram: tokenProgram,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .instruction();

  const jupiterIxs = [
    ...setupInstructions.map(deserializeInstruction),
    deserializeInstruction(swapInstructionPayload),
  ];

  const computeFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: computeBudgetMicroLamports ?? 100000,
  });

  if (splitTransactions) {
    const setUpInstructions = [
      fromTokenAccount.instruction!,
      toTokenAccount.instruction!,
      partnerFeeRecipientVaultCreateIx,
      partnerFeeRecipientTokenAccountCreateIx,
      ...setupInstructions.map(deserializeInstruction),
    ].filter(Boolean) as TransactionInstruction[];

    const allInstructions = [
      tradingOpenBorrowInstruction!,
      deserializeInstruction(swapInstructionPayload), ,
      openAddCollateralInstruction!,
      computeBudgetMicroLamports ? computeFeeIx : undefined,
    ].filter(Boolean) as TransactionInstruction[];

    const messageV01 = new TransactionMessage({
      payerKey: lavarageProgram.provider.publicKey!,
      recentBlockhash: blockhash,
      instructions: setUpInstructions,
    }).compileToV0Message(addressLookupTableAccounts);

    const tx2 = new VersionedTransaction(messageV01);

    const messageV0 = new TransactionMessage({
      payerKey: lavarageProgram.provider.publicKey!,
      recentBlockhash: blockhash,
      instructions: allInstructions,
    }).compileToV0Message(addressLookupTableAccounts);

    const tx = new VersionedTransaction(messageV0);

    return [tx2, tx];
  }

  const allInstructions = [
    fromTokenAccount.instruction!,
    toTokenAccount.instruction!,
    partnerFeeRecipientVaultCreateIx,
    partnerFeeRecipientTokenAccountCreateIx,
    tradingOpenBorrowInstruction!,
    ...jupiterIxs,
    openAddCollateralInstruction!,
    computeBudgetMicroLamports ? computeFeeIx : undefined,
  ].filter(Boolean) as TransactionInstruction[];

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions: allInstructions,
  }).compileToV0Message(addressLookupTableAccounts);

  const tx = new VersionedTransaction(messageV0);

  return tx;
};

/**
 * Creates a take-profit delegate for automated position closing
 * 
 * 
 * @group Traders
 * @category Automation
 * 
 * @param lavarageProgram - The Lavarage program instance (V1 or V2)
 * @param position - The position account to set take-profit for
 * @param tpPrice - The target price at which to take profit (as BN)
 * @param tpTolerence - Price tolerance/slippage allowed when executing (as BN)
 * @param prioFee - Priority fee in microlamports for transaction execution
 * @param quoteToken - The quote token mint address (e.g., USDC, SOL)
 * @param partnerFeeRecipient - Optional wallet to receive partner fees
 * 
 * @returns A versioned transaction to create the take-profit delegate
 * 
 * @example
 * ```typescript
 * // Set take-profit at $150 for a position
 * const position = await getPositionAccount(positionPubkey);
 * const tpPrice = new BN(150 * 1e6); // $150 with 6 decimals
 * const tolerance = new BN(1 * 1e6); // $1 tolerance
 * const prioFee = new BN(100000); // 0.1 SOL priority fee
 * 
 * const tx = await createTpDelegate(
 *   lavarageProgram,
 *   position,
 *   tpPrice,
 *   tolerance,
 *   prioFee,
 *   usdcMint
 * );
 * 
 * // Sign and send
 * const signature = await sendAndConfirmTransaction(connection, tx, [wallet]);
 * console.log('Take-profit delegate created:', signature);
 * ```
 * 
 * @see {@link modifyTpDelegate} - Modify take-profit settings
 * @see {@link removeTpDelegate} - Remove take-profit without replacement
 */

export const createTpDelegate = async (
  lavarageProgram: Program<Lavarage> | Program<LavarageV2>,
  position: ProgramAccount<{
    pool: PublicKey;
    seed: PublicKey;
    userPaid: BN;
    amount: BN;
  }>,
  tpPrice: BN,
  tpTolerence: BN,
  prioFee: BN,
  quoteToken: PublicKey,
  partnerFeeRecipient?: PublicKey
) => {
  const { blockhash } =
    await lavarageProgram.provider.connection.getLatestBlockhash("finalized");
  const ix = await lavarageProgram.methods
    .tradingCreateTpDelegate(
      tpPrice,
      tpTolerence,
      new PublicKey("6dA5GTDPWxnw3gvjoy3vYBDyY7iETxcTJzt8RqF9i9MV"),
      new BN(10000)
    )
    .accountsStrict({
      delegate: getPda(
        [Buffer.from("delegate"), position.publicKey.toBuffer()],
        lavarageProgram.programId
      ),
      originalOperator: lavarageProgram.provider.publicKey!,
      delegatedAccount: position.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .remainingAccounts(
      partnerFeeRecipient
        ? [
          {
            pubkey:
              quoteToken.toBase58() ==
                "So11111111111111111111111111111111111111112"
                ? partnerFeeRecipient
                : getAssociatedTokenAddressSync(
                  quoteToken,
                  partnerFeeRecipient,
                  false
                ),
            isSigner: false,
            isWritable: true,
          },
        ]
        : []
    )
    .instruction();

  const computeFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: prioFee.toNumber(),
  });

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions: [ix, computeFeeIx].filter(Boolean),
  }).compileToV0Message();

  return new VersionedTransaction(messageV0);
};

/**
 * Modifies take-profit setting for an existing position. 
 * 
 * 
 * @group Traders
 * @category Automation
 * 
 * @param lavarageProgram - The Lavarage program instance (V1 or V2)
 * @param position - The position account to modify take-profit for
 * @param tpPrice - The new target price for take-profit (as BN)
 * @param tpTolerence - The new price tolerance/slippage allowed (as BN)
 * @param prioFee - Priority fee in microlamports for transaction execution
 * @param quoteToken - The quote token mint address (e.g., USDC, SOL)
 * @param partnerFeeRecipient - Optional wallet to receive partner fees
 * 
 * @returns Transaction to update the take-profit settings. 
 * 
 * @example
 * ```typescript
 * const tx = await modifyTpDelegate(
 *   program,
 *   position,
 *   new BN(160 * 1e6),  // New target: $160
 *   new BN(2 * 1e6),     // Tolerance: $2
 *   new BN(100000),      // Priority fee
 *   usdcMint
 * );
 * ```
 * 
 * @see {@link createTpDelegate} - Initial creation of take-profit
 * @see {@link removeTpDelegate} - Remove take-profit without replacement
 */

export const modifyTpDelegate = async (
  lavarageProgram: Program<Lavarage> | Program<LavarageV2>,
  position: ProgramAccount<{
    pool: PublicKey;
    seed: PublicKey;
    userPaid: BN;
    amount: BN;
  }>,
  tpPrice: BN,
  tpTolerence: BN,
  prioFee: BN,
  quoteToken: PublicKey,
  partnerFeeRecipient?: PublicKey
) => {
  const { blockhash } =
    await lavarageProgram.provider.connection.getLatestBlockhash("finalized");
  const delegatePda = getPda(
    [Buffer.from("delegate"), position.publicKey.toBuffer()],
    lavarageProgram.programId
  );
  const removeIx = await lavarageProgram.methods
    .tradingRemoveTpDelegate()
    .accountsStrict({
      delegate: delegatePda,
      originalOperator: lavarageProgram.provider.publicKey!,
      delegatedAccount: position.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
  const ix = await lavarageProgram.methods
    .tradingCreateTpDelegate(
      tpPrice,
      tpTolerence,
      new PublicKey("6dA5GTDPWxnw3gvjoy3vYBDyY7iETxcTJzt8RqF9i9MV"),
      new BN(10000)
    )
    .accountsStrict({
      delegate: delegatePda,
      originalOperator: lavarageProgram.provider.publicKey!,
      delegatedAccount: position.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .remainingAccounts(
      partnerFeeRecipient
        ? [
          {
            pubkey:
              quoteToken.toBase58() ==
                "So11111111111111111111111111111111111111112"
                ? partnerFeeRecipient
                : getAssociatedTokenAddressSync(
                  quoteToken,
                  partnerFeeRecipient,
                  false
                ),
            isSigner: false,
            isWritable: true,
          },
        ]
        : []
    )
    .instruction();

  const computeFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: prioFee.toNumber(),
  });

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions: [removeIx, ix, computeFeeIx].filter(Boolean),
  }).compileToV0Message();

  return new VersionedTransaction(messageV0);
};

/**
 * Removes take-profit settings from a position
 * 
 * @group Traders
 * @category Automation
 * 
 * @param lavarageProgram - The Lavarage program instance (V1 or V2)
 * @param position - The position account to remove take-profit from
 * @param prioFee - Priority fee in microlamports for transaction execution
 * 
 * @returns Transaction to remove take-profit settings
 * 
 * @example
 * ```typescript
 * const tx = await removeTpDelegate(
 *   lavarageProgram,
 *   position,
 *   new BN(100000) // Priority fee
 * );
 * 
 * await sendAndConfirmTransaction(connection, tx, [wallet]);
 * ```
 *
 * @see {@link createTpDelegate} - Initial creation of take-profit
 * @see {@link modifyTpDelegate} - Modify existing take-profit settings
 */

export const removeTpDelegate = async (
  lavarageProgram: Program<Lavarage> | Program<LavarageV2>,
  position: ProgramAccount<{
    pool: PublicKey;
    seed: PublicKey;
    userPaid: BN;
    amount: BN;
  }>,
  prioFee: BN
) => {
  const { blockhash } =
    await lavarageProgram.provider.connection.getLatestBlockhash("finalized");
  const delegatePda = getPda(
    [Buffer.from("delegate"), position.publicKey.toBuffer()],
    lavarageProgram.programId
  );
  const removeIx = await lavarageProgram.methods
    .tradingRemoveTpDelegate()
    .accountsStrict({
      delegate: delegatePda,
      originalOperator: lavarageProgram.provider.publicKey!,
      delegatedAccount: position.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  const computeFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: prioFee.toNumber(),
  });

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions: [removeIx, computeFeeIx].filter(Boolean),
  }).compileToV0Message();

  return new VersionedTransaction(messageV0);
};
/**
 * Partially repays a position on Lavarage V1
 * 
 * @group Traders
 * @category Trading
 * 
 * @param lavarageProgram - The Lavarage V1 program instance
 * @param position - The position account to partially repay
 * @param repaymentBps - Repayment amount in basis points (10000 = 100%)
 * 
 * @returns Transaction for partial repayment
 * 
 * @example
 * ```typescript
 * // Repay 50% of the position
 * const tx = await partialRepayV1(
 *   lavarageProgram,
 *   position,
 *   5000  // 50% in basis points
 * );
 * 
 * await sendAndConfirmTransaction(connection, tx, [wallet]);
 * ```
 * 
 * @see {@link partialRepayV2} - The V2 version supporting multiple quote tokens
 */

export const partialRepayV1 = async (
  lavarageProgram: Program<Lavarage>,
  position: ProgramAccount<{
    pool: PublicKey;
    seed: PublicKey;
    userPaid: BN;
    amount: BN;
  }>,
  repaymentBps: number
) => {
  const { blockhash } =
    await lavarageProgram.provider.connection.getLatestBlockhash("finalized");
  const pool = await lavarageProgram.account.pool.fetch(position.account.pool);
  const positionAccountPDA = position.publicKey;
  const ix = await lavarageProgram.methods
    .tradingClosePartialRepaySol(new BN(repaymentBps))
    .accountsStrict({
      systemProgram: SystemProgram.programId,
      positionAccount: positionAccountPDA,
      tradingPool: position.account.pool,
      nodeWallet: pool.nodeWallet,
      trader: lavarageProgram.provider.publicKey!,
      clock: SYSVAR_CLOCK_PUBKEY,
      randomAccountAsId: position.account.seed,
      feeReceipient: "6JfTobDvwuwZxZP6FR5JPmjdvQ4h4MovkEVH2FPsMSrF",
    })
    .instruction();
  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions: [ix],
  }).compileToV0Message();
  return new VersionedTransaction(messageV0);
};

/**
 * Partially repays a position on Lavarage V2
 * 
 * @group Traders
 * @category Trading
 * 
 * @param lavarageProgram - The Lavarage V2 program instance
 * @param position - The position account to partially repay
 * @param repaymentBps - Repayment amount in basis points (10000 = 100%)
 * 
 * @returns Transaction for partial repayment
 * 
 * @example
 * ```typescript
 * // Repay 30% of the position
 * const tx = await partialRepayV2(
 *   lavarageProgram,
 *   position,
 *   3000  // 30% in basis points
 * );
 * 
 * await sendAndConfirmTransaction(connection, tx, [wallet]);
 * ```
 * 
 * @see {@link partialRepayV1} - The V1 version supporting SOL as quote token
 */
export const partialRepayV2 = async (
  lavarageProgram: Program<LavarageV2>,
  position: ProgramAccount<{
    pool: PublicKey;
    seed: PublicKey;
    userPaid: BN;
    amount: BN;
  }>,
  repaymentBps: number
) => {
  const { blockhash } =
    await lavarageProgram.provider.connection.getLatestBlockhash("finalized");
  const pool = await lavarageProgram.account.pool.fetch(position.account.pool);
  const positionAccountPDA = position.publicKey;
  const ix = await lavarageProgram.methods
    .tradingPartialRepaySol(new BN(repaymentBps))
    .accountsStrict({
      systemProgram: SystemProgram.programId,
      positionAccount: positionAccountPDA,
      tradingPool: position.account.pool,
      nodeWallet: pool.nodeWallet,
      trader: lavarageProgram.provider.publicKey!,
      clock: SYSVAR_CLOCK_PUBKEY,
      randomAccountAsId: position.account.seed,
      fromTokenAccount: getAssociatedTokenAddressSync(
        pool.qtType,
        lavarageProgram.provider.publicKey!
      ),
      toTokenAccount: getAssociatedTokenAddressSync(
        pool.qtType,
        pool.nodeWallet,
        true
      ),
      mint: pool.qtType,
      feeTokenAccount: getAssociatedTokenAddressSync(
        pool.qtType,
        new PublicKey("6JfTobDvwuwZxZP6FR5JPmjdvQ4h4MovkEVH2FPsMSrF")
      ),
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction();

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions: [ix],
  }).compileToV0Message();

  return new VersionedTransaction(messageV0);
};

/**
 * Closes a trading position on Lavarage V1
 * 
 * @group Traders
 * @category Trading
 * 
 * @param lavarageProgram - The Lavarage V1 program instance
 * @param position - The position account to close
 * @param offer - The offer/pool account associated with the position
 * @param jupInstruction - Jupiter swap instructions and quote for closing
 * @param partnerFeeRecipient - Optional wallet to receive partner fees
 * @param partnerFeeMarkup - Optional partner fee amount in basis points
 * @param computeBudgetMicroLamports - Optional compute budget for priority fees
 * @param platformFeeRecipient - Optional wallet to receive platform fees (jup, okx)
 * @param splitTransactions - Optional boolean to split the transaction into multiple transactions (jito bundle)
 * @param discountBps - Optional discount basis points for the referral program
 * @param referralBps - Optional referral basis points for the referral program
 * 
 * @returns Transaction to close the position
 * 
 * @example
 * ```typescript
 * const jupQuote = await getJupiterQuote(...);
 * const tx = await closeTradeV1(
 *   lavarageProgram,
 *   position,
 *   offer,
 *   jupQuote,
 *   partnerWallet, // optional
 *   100, // optional fee in bps
 *   150000 // optional priority fee
 * );
 * 
 * await sendAndConfirmTransaction(connection, tx, [wallet]);
 * ```
 * @see {@link openTradeV1} - The V1 version for opening positions
 * @see {@link partialRepayV1} - Partial repayments on V1 
 */
export const closeTradeV1 = async (
  lavarageProgram: Program<Lavarage>,
  position: ProgramAccount<{
    pool: PublicKey;
    seed: PublicKey;
    userPaid: BN;
    amount: BN;
  }>,
  offer: ProgramAccount<{
    nodeWallet: PublicKey;
    interestRate: number;
    collateralType: PublicKey;
  }>,
  jupInstruction: {
    instructions?: {
      setupInstructions: Record<string, unknown>[];
      swapInstruction: Record<string, unknown>;
      cleanupInstruction: Record<string, unknown>;
      addressLookupTableAddresses: string[];
      tokenLedgerInstruction?: Record<string, unknown>;
    };
    quoteResponse: any;
  },
  partnerFeeRecipient?: PublicKey,
  partnerFeeMarkup?: number,
  computeBudgetMicroLamports?: number,
  platformFeeRecipient?: PublicKey,
  splitTransactions?: boolean,
  discountBps?: number,
  referralBps?: number,
) => {
  let partnerFeeMarkupAsPkey;
  const referralVaultProgram = new Program<UserVault>(userVaultIDL, REFFERAL_VAULT_PROGRAM_ID, lavarageProgram.provider);
  
  if (partnerFeeMarkup) {
    const feeBuffer = Buffer.alloc(8);
    feeBuffer.writeBigUInt64LE(BigInt(partnerFeeMarkup));
    const feeBuffer32 = Buffer.alloc(32);
    feeBuffer32.set(feeBuffer, 0);
    partnerFeeMarkupAsPkey = new PublicKey(feeBuffer32);
  }
  if (position.account.pool.toBase58() != offer.publicKey.toBase58())
    throw "Mismatch offer";
  const pool = offer;
  const poolPubKey = offer.publicKey;

  const tokenAddressPubKey = new PublicKey(offer.account.collateralType);

  const mintAccount = await lavarageProgram.provider.connection.getAccountInfo(
    offer.account.collateralType
  );
  const tokenProgram = mintAccount?.owner;

  const positionAccountPDA = position.publicKey;

  const fromTokenAccount = await getTokenAccountOrCreateIfNotExists(
    lavarageProgram,
    positionAccountPDA,
    tokenAddressPubKey,
    tokenProgram
  );

  const toTokenAccount = await getTokenAccountOrCreateIfNotExists(
    lavarageProgram,
    lavarageProgram.provider.publicKey!,
    tokenAddressPubKey,
    tokenProgram
  );

  const platformFeeRecipientAccount = platformFeeRecipient ? await getTokenAccountOrCreateIfNotExists(
    lavarageProgram,
    platformFeeRecipient,
    offer.account.collateralType,
    tokenProgram
  ) : undefined;

  const jupiterSellIx = jupInstruction!.instructions;

  const deserializeInstruction = (instruction: any) => {
    return new TransactionInstruction({
      programId: new PublicKey(instruction.programId),

      keys: instruction.accounts.map((key: any) => ({
        pubkey: new PublicKey(key.pubkey),
        isSigner: key.isSigner,
        isWritable: key.isWritable,
      })),
      data: Buffer.from(instruction.data, "base64"),
    });
  };

  const getAddressLookupTableAccounts = async (
    keys: string[]
  ): Promise<AddressLookupTableAccount[]> => {
    const addressLookupTableAccountInfos =
      await lavarageProgram.provider.connection.getMultipleAccountsInfo(
        keys.map((key) => new PublicKey(key))
      );

    return addressLookupTableAccountInfos.reduce((acc, accountInfo, index) => {
      const addressLookupTableAddress = keys[index];
      if (accountInfo) {
        const addressLookupTableAccount = new AddressLookupTableAccount({
          key: new PublicKey(addressLookupTableAddress),
          state: AddressLookupTableAccount.deserialize(
            Uint8Array.from(accountInfo.data)
          ),
        });
        acc.push(addressLookupTableAccount);
      }

      return acc;
    }, new Array<AddressLookupTableAccount>());
  };

  const addressLookupTableAccounts: AddressLookupTableAccount[] = [];

  const { blockhash } =
    await lavarageProgram.provider.connection.getLatestBlockhash("finalized");

  const useReferral = discountBps !== undefined && referralBps !== undefined;

  // Check if partner fee recipient vault needs to be initialized via referralVaultProgram
  let partnerFeeRecipientCreateIx: TransactionInstruction | undefined;
  let userVaultPda: PublicKey | undefined;
  if (partnerFeeRecipient && referralBps !== undefined && referralVaultProgram) {
    [userVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_vault"), new PublicKey(partnerFeeRecipient).toBuffer()],
      referralVaultProgram.programId
    );
    const vaultAccountInfo = await lavarageProgram.provider.connection.getAccountInfo(userVaultPda);
    if (!vaultAccountInfo) {
      // Initialize the vault using referralVaultProgram
      partnerFeeRecipientCreateIx = await referralVaultProgram.methods
        .initializeVault()
        .accountsStrict({
          userVault: userVaultPda,
          user: partnerFeeRecipient!,
          funder: lavarageProgram.provider.publicKey!,
          systemProgram: SystemProgram.programId,
        })
        .instruction();
    }
  }

  const closePositionIx = await lavarageProgram.methods
    .tradingCloseBorrowCollateral()
    .accountsStrict({
      tradingPool: poolPubKey,
      instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
      mint: offer.account.collateralType,
      fromTokenAccount: fromTokenAccount.account!.address,
      toTokenAccount: toTokenAccount.account!.address,
      positionAccount: positionAccountPDA,
      clock: SYSVAR_CLOCK_PUBKEY,
      systemProgram: SystemProgram.programId,
      trader: lavarageProgram.provider.publicKey!,
      tokenProgram: tokenProgram!,
      randomAccountAsId: position.account.seed,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .instruction();

  let repaySolIx: TransactionInstruction | null = null;
  let jupiterIxs: TransactionInstruction[] = [];
  if (jupInstruction.instructions == undefined) {
    repaySolIx = useReferral
      ? await lavarageProgram.methods
          .tradingCloseRepaySolWithReferral(
            new BN(jupInstruction.quoteResponse.outAmount),
            new BN(9997),
            new BN(discountBps),
            new BN(referralBps)
          )
          .accountsStrict({
            nodeWallet: pool.account.nodeWallet,
            positionAccount: positionAccountPDA,
            tradingPool: poolPubKey,
            trader: lavarageProgram.provider.publicKey!,
            systemProgram: SystemProgram.programId,
            clock: SYSVAR_CLOCK_PUBKEY,
            randomAccountAsId: position.account.seed,
            feeReceipient: "6JfTobDvwuwZxZP6FR5JPmjdvQ4h4MovkEVH2FPsMSrF",
          })
          .remainingAccounts(
            partnerFeeRecipient && partnerFeeMarkupAsPkey && userVaultPda
              ? [
                {
                  pubkey: userVaultPda,
                  isSigner: false,
                  isWritable: true,
                }
              ]
              : []
          )
          .instruction()
      : await lavarageProgram.methods
          .tradingCloseRepaySol(
            new BN(jupInstruction.quoteResponse.outAmount),
            new BN(9997)
          )
          .accountsStrict({
            nodeWallet: pool.account.nodeWallet,
            positionAccount: positionAccountPDA,
            tradingPool: poolPubKey,
            trader: lavarageProgram.provider.publicKey!,
            systemProgram: SystemProgram.programId,
            clock: SYSVAR_CLOCK_PUBKEY,
            randomAccountAsId: position.account.seed,
            feeReceipient: "6JfTobDvwuwZxZP6FR5JPmjdvQ4h4MovkEVH2FPsMSrF",
          })
          .remainingAccounts(
            partnerFeeRecipient && partnerFeeMarkupAsPkey
              ? [
                {
                  pubkey: partnerFeeRecipient,
                  isSigner: false,
                  isWritable: true,
                },
                {
                  pubkey: partnerFeeMarkupAsPkey,
                  isSigner: false,
                  isWritable: false,
                },
              ]
              : []
          )
          .instruction();
  } else {
    repaySolIx = useReferral
      ? await lavarageProgram.methods
          .tradingCloseRepaySolWithReferral(
            new BN(jupInstruction.quoteResponse.outAmount),
            new BN(9998),
            new BN(discountBps),
            new BN(referralBps)
          )
          .accountsStrict({
            nodeWallet: pool.account.nodeWallet,
            positionAccount: positionAccountPDA,
            tradingPool: poolPubKey,
            trader: lavarageProgram.provider.publicKey!,
            systemProgram: SystemProgram.programId,
            clock: SYSVAR_CLOCK_PUBKEY,
            randomAccountAsId: position.account.seed,
            feeReceipient: "6JfTobDvwuwZxZP6FR5JPmjdvQ4h4MovkEVH2FPsMSrF",
          })
          .remainingAccounts(
            partnerFeeRecipient && partnerFeeMarkupAsPkey && userVaultPda
              ? [
                {
                  pubkey: userVaultPda,
                  isSigner: false,
                  isWritable: true,
                }
              ]
              : []
          )
          .instruction()
      : await lavarageProgram.methods
          .tradingCloseRepaySol(
            new BN(jupInstruction.quoteResponse.outAmount),
            new BN(9998)
          )
          .accountsStrict({
            nodeWallet: pool.account.nodeWallet,
            positionAccount: positionAccountPDA,
            tradingPool: poolPubKey,
            trader: lavarageProgram.provider.publicKey!,
            systemProgram: SystemProgram.programId,
            clock: SYSVAR_CLOCK_PUBKEY,
            randomAccountAsId: position.account.seed,
            feeReceipient: "6JfTobDvwuwZxZP6FR5JPmjdvQ4h4MovkEVH2FPsMSrF",
          })
          .remainingAccounts(
            partnerFeeRecipient && partnerFeeMarkupAsPkey
              ? [
                {
                  pubkey: partnerFeeRecipient,
                  isSigner: false,
                  isWritable: true,
                },
                {
                  pubkey: partnerFeeMarkupAsPkey,
                  isSigner: false,
                  isWritable: false,
                },
              ]
              : []
          )
          .instruction();

    const {
      setupInstructions,
      swapInstruction: swapInstructionPayload,
      cleanupInstruction,
      addressLookupTableAddresses,
    } = jupiterSellIx!;
    jupiterIxs = [
      ...setupInstructions.map(deserializeInstruction),
      deserializeInstruction(swapInstructionPayload),
      deserializeInstruction(cleanupInstruction),
    ].filter((i) => !!i);
    addressLookupTableAccounts.push(
      ...(await getAddressLookupTableAccounts([
        "5LEAB3owNUSKvECm7vkr58tDtQpzbngQ2NYpc7qmRFdi",
        ...addressLookupTableAddresses,
      ]))
    );
  }
  const profit = new BN(jupInstruction.quoteResponse.outAmount)
    .sub(position.account.amount)
    .sub(position.account.userPaid);

  let createAssociatedTokenAccountInstruction =
    createAssociatedTokenAccountIdempotentInstruction(
      lavarageProgram.provider.publicKey!,
      toTokenAccount.account!.address,
      lavarageProgram.provider.publicKey!,
      offer.account.collateralType,
      tokenProgram!
    );

  const computeFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: computeBudgetMicroLamports ?? 100000,
  });

  if (splitTransactions) {
    const setUpInstructions = [
      partnerFeeRecipientCreateIx,
      jupInstruction.instructions && platformFeeRecipientAccount?.instruction ? platformFeeRecipientAccount.instruction : null,
    ].filter((i) => !!i);

    const allInstructions = [
      jupInstruction.instructions?.tokenLedgerInstruction
        ? deserializeInstruction(
          jupInstruction.instructions.tokenLedgerInstruction
        )
        : null,
      closePositionIx,
      ...jupiterIxs,
      repaySolIx,
      computeBudgetMicroLamports ? computeFeeIx : undefined,
    ].filter((i) => !!i);

    const messageV01 = new TransactionMessage({
      payerKey: lavarageProgram.provider.publicKey!,
      recentBlockhash: blockhash,
      instructions: setUpInstructions,
    }).compileToV0Message(addressLookupTableAccounts);

    const tx = new VersionedTransaction(messageV01);

    const messageV02 = new TransactionMessage({
      payerKey: lavarageProgram.provider.publicKey!,
      recentBlockhash: blockhash,
      instructions: allInstructions,
    }).compileToV0Message(addressLookupTableAccounts);

    const tx2 = new VersionedTransaction(messageV02);

    return [tx, tx2];
  }

  const allInstructions = [
    partnerFeeRecipientCreateIx,
    jupInstruction.instructions && platformFeeRecipientAccount?.instruction ? platformFeeRecipientAccount.instruction : null,
    jupInstruction.instructions?.tokenLedgerInstruction
      ? deserializeInstruction(
        jupInstruction.instructions.tokenLedgerInstruction
      )
      : null,
    closePositionIx,
    ...jupiterIxs,
    repaySolIx,
    computeBudgetMicroLamports ? computeFeeIx : undefined,
  ].filter((i) => !!i);

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions: allInstructions,
  }).compileToV0Message(addressLookupTableAccounts);

  const tx = new VersionedTransaction(messageV0);

  return tx;
};

/**
 * Closes a trading position on Lavarage V2
 * 
 * @group Traders
 * @category Trading
 * 
 * @param lavarageProgram - The Lavarage V2 program instance
 * @param position - The position account to close
 * @param offer - The offer/pool account associated with the position
 * @param jupInstruction - Jupiter swap instructions and quote for closing
 * @param quoteToken - The quote token mint address for this position
 * @param partnerFeeRecipient - Optional wallet to receive partner fees
 * @param partnerFeeMarkup - Optional partner fee amount in basis points
 * @param computeBudgetMicroLamports - Optional compute budget for priority fees
* @param platformFeeRecipient - Optional wallet to receive platform fees (jup, okx)
 * @param splitTransactions - Optional boolean to split the transaction into multiple transactions (jito bundle)
 * @param discountBps - Optional discount basis points for the referral program
 * @param referralBps - Optional referral basis points for the referral program
 * 
 * @returns Transaction to close the position
 * 
 * @example
 * ```typescript
 * const jupQuote = await getJupiterQuote(...);
 * const tx = await closeTradeV2(
 *   lavarageProgram,
 *   position,
 *   offer,
 *   jupQuote,
 *   usdcMint, // quote token
 *   partnerWallet, // optional
 *   100, // optional fee in bps
 *   150000 // optional priority fee
 * );
 * 
 * await sendAndConfirmTransaction(connection, tx, [wallet]);
 * ```
 * @see {@link openTradeV2} - The V2 version for opening positions
 * @see {@link partialRepayV2} - Partial repay a V2 position 
 */
export const closeTradeV2 = async (
  lavarageProgram: Program<LavarageV2>,
  position: ProgramAccount<{
    pool: PublicKey;
    seed: PublicKey;
    userPaid: BN;
    amount: BN;
  }>,
  offer: ProgramAccount<{
    nodeWallet: PublicKey;
    interestRate: number;
    collateralType: PublicKey;
  }>,
  jupInstruction: {
    instructions?: {
      setupInstructions: Record<string, unknown>[];
      swapInstruction: Record<string, unknown>;
      cleanupInstruction: Record<string, unknown>;
      addressLookupTableAddresses: string[];
      tokenLedgerInstruction?: Record<string, unknown>;
    };
    quoteResponse: any;
  },
  quoteToken: PublicKey,
  partnerFeeRecipient?: PublicKey,
  partnerFeeMarkup?: number,
  computeBudgetMicroLamports?: number,
  platformFeeRecipient?: PublicKey,
  splitTransactions?: boolean,
  discountBps?: number,
  referralBps?: number,
) => {
  let partnerFeeMarkupAsPkey;
  const referralVaultProgram = new Program<UserVault>(userVaultIDL, REFFERAL_VAULT_PROGRAM_ID, lavarageProgram.provider);
  
  if (partnerFeeMarkup) {
    const feeBuffer = Buffer.alloc(8);
    feeBuffer.writeBigUInt64LE(BigInt(partnerFeeMarkup));
    const feeBuffer32 = Buffer.alloc(32);
    feeBuffer32.set(feeBuffer, 0);
    partnerFeeMarkupAsPkey = new PublicKey(feeBuffer32);
  }
  if (position.account.pool.toBase58() != offer.publicKey.toBase58())
    throw "Mismatch offer";
  const pool = offer;
  const poolPubKey = offer.publicKey;

  const tokenAddressPubKey = new PublicKey(offer.account.collateralType);

  const mintAccount = await lavarageProgram.provider.connection.getAccountInfo(
    offer.account.collateralType
  );
  const tokenProgram = mintAccount?.owner;

  const quoteMintAccount =
    await lavarageProgram.provider.connection.getAccountInfo(quoteToken);
  const quoteTokenProgram = quoteMintAccount?.owner;

  const positionAccountPDA = position.publicKey;

  const fromTokenAccount = await getTokenAccountOrCreateIfNotExists(
    lavarageProgram,
    positionAccountPDA,
    tokenAddressPubKey,
    tokenProgram
  );

  const toTokenAccount = await getTokenAccountOrCreateIfNotExists(
    lavarageProgram,
    lavarageProgram.provider.publicKey!,
    tokenAddressPubKey,
    tokenProgram
  );

  const platformFeeRecipientAccount = platformFeeRecipient ? await getTokenAccountOrCreateIfNotExists(
    lavarageProgram,
    platformFeeRecipient,
    offer.account.collateralType,
    tokenProgram
  ) : undefined;

  const jupiterSellIx = jupInstruction!.instructions;

  const deserializeInstruction = (instruction: any) => {
    return new TransactionInstruction({
      programId: new PublicKey(instruction.programId),

      keys: instruction.accounts.map((key: any) => ({
        pubkey: new PublicKey(key.pubkey),
        isSigner: key.isSigner,
        isWritable: key.isWritable,
      })),
      data: Buffer.from(instruction.data, "base64"),
    });
  };

  const getAddressLookupTableAccounts = async (
    keys: string[]
  ): Promise<AddressLookupTableAccount[]> => {
    const addressLookupTableAccountInfos =
      await lavarageProgram.provider.connection.getMultipleAccountsInfo(
        keys.map((key) => new PublicKey(key))
      );

    return addressLookupTableAccountInfos.reduce((acc, accountInfo, index) => {
      const addressLookupTableAddress = keys[index];
      if (accountInfo) {
        const addressLookupTableAccount = new AddressLookupTableAccount({
          key: new PublicKey(addressLookupTableAddress),
          state: AddressLookupTableAccount.deserialize(
            Uint8Array.from(accountInfo.data)
          ),
        });
        acc.push(addressLookupTableAccount);
      }

      return acc;
    }, new Array<AddressLookupTableAccount>());
  };

  const addressLookupTableAccounts: AddressLookupTableAccount[] = [];

  const { blockhash } =
    await lavarageProgram.provider.connection.getLatestBlockhash("finalized");

  const useReferral = discountBps !== undefined && referralBps !== undefined;

  // Check if partner fee recipient vault and token account need to be created
  let partnerFeeRecipientVaultCreateIx: TransactionInstruction | undefined;
  let partnerFeeRecipientTokenAccountCreateIx: TransactionInstruction | undefined;
  let userVaultPda: PublicKey | undefined;
  
  if (partnerFeeRecipient && partnerFeeMarkupAsPkey && referralVaultProgram) {
    // Derive the userVault PDA
    [userVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_vault"), new PublicKey(partnerFeeRecipient).toBuffer()],
      referralVaultProgram.programId
    );
    
    // Get the vault's associated token account
    const vaultTokenAccount = getAssociatedTokenAddressSync(
      quoteToken,
      userVaultPda,
      true, // allowOwnerOffCurve for PDA
      quoteTokenProgram
    );
    
    // Check both accounts at the same time
    const [vaultAccountInfo, vaultTokenAccountInfo] = await lavarageProgram.provider.connection.getMultipleAccountsInfo([
      userVaultPda,
      vaultTokenAccount
    ]);
    
    // Create vault if it doesn't exist
    if (!vaultAccountInfo) {
      partnerFeeRecipientVaultCreateIx = await referralVaultProgram.methods
        .initializeVault()
        .accountsStrict({
          userVault: userVaultPda,
          user: partnerFeeRecipient!,
          funder: lavarageProgram.provider.publicKey!,
          systemProgram: SystemProgram.programId,
        })
        .instruction();
    }
    
    // Create token account if it doesn't exist
    if (!vaultTokenAccountInfo) {
      partnerFeeRecipientTokenAccountCreateIx = createAssociatedTokenAccountIdempotentInstruction(
        lavarageProgram.provider.publicKey!,
        vaultTokenAccount,
        userVaultPda,
        quoteToken,
        quoteTokenProgram,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );
    }
  }

  const closePositionIx = await lavarageProgram.methods
    .tradingCloseBorrowCollateral()
    .accountsStrict({
      tradingPool: poolPubKey,
      instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
      mint: offer.account.collateralType,
      fromTokenAccount: fromTokenAccount.account!.address,
      toTokenAccount: toTokenAccount.account!.address,
      positionAccount: positionAccountPDA,
      clock: SYSVAR_CLOCK_PUBKEY,
      systemProgram: SystemProgram.programId,
      trader: lavarageProgram.provider.publicKey!,
      tokenProgram: tokenProgram!,
      randomAccountAsId: position.account.seed,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    })
    .instruction();

  let repaySolIx: TransactionInstruction | null = null;
  let jupiterIxs: TransactionInstruction[] = [];
  if (jupInstruction.instructions == undefined) {
    repaySolIx = useReferral
      ? await lavarageProgram.methods
          .tradingCloseRepaySolWithReferral(
            new BN(jupInstruction.quoteResponse.outAmount),
            new BN(9997),
            new BN(discountBps),
            new BN(referralBps)
          )
          .accountsStrict({
            nodeWallet: pool.account.nodeWallet,
            positionAccount: positionAccountPDA,
            tradingPool: poolPubKey,
            trader: lavarageProgram.provider.publicKey!,
            systemProgram: SystemProgram.programId,
            clock: SYSVAR_CLOCK_PUBKEY,
            randomAccountAsId: position.account.seed,
            feeTokenAccount: getAssociatedTokenAddressSync(
              quoteToken,
              new PublicKey("6JfTobDvwuwZxZP6FR5JPmjdvQ4h4MovkEVH2FPsMSrF"),
              false,
              quoteTokenProgram
            ),
            fromTokenAccount: getAssociatedTokenAddressSync(
              quoteToken,
              lavarageProgram.provider.publicKey!,
              false,
              quoteTokenProgram
            ),
            tokenProgram: quoteTokenProgram!,
            toTokenAccount: getAssociatedTokenAddressSync(
              quoteToken,
              pool.account.nodeWallet,
              true,
              quoteTokenProgram
            ),
            mint: quoteToken,
          })
          .remainingAccounts(
            partnerFeeRecipient && partnerFeeMarkupAsPkey && userVaultPda
              ? [
                {
                  pubkey: getAssociatedTokenAddressSync(
                    quoteToken,
                    userVaultPda,
                    true, // allowOwnerOffCurve for PDA
                    quoteTokenProgram
                  ),
                  isSigner: false,
                  isWritable: true,
                }
              ]
              : []
          )
          .instruction()
      : await lavarageProgram.methods
          .tradingCloseRepaySol(
            new BN(jupInstruction.quoteResponse.outAmount),
            new BN(9997)
          )
          .accountsStrict({
            nodeWallet: pool.account.nodeWallet,
            positionAccount: positionAccountPDA,
            tradingPool: poolPubKey,
            trader: lavarageProgram.provider.publicKey!,
            systemProgram: SystemProgram.programId,
            clock: SYSVAR_CLOCK_PUBKEY,
            randomAccountAsId: position.account.seed,
            feeTokenAccount: getAssociatedTokenAddressSync(
              quoteToken,
              new PublicKey("6JfTobDvwuwZxZP6FR5JPmjdvQ4h4MovkEVH2FPsMSrF"),
              false,
              quoteTokenProgram
            ),
            fromTokenAccount: getAssociatedTokenAddressSync(
              quoteToken,
              lavarageProgram.provider.publicKey!,
              false,
              quoteTokenProgram
            ),
            tokenProgram: quoteTokenProgram!,
            toTokenAccount: getAssociatedTokenAddressSync(
              quoteToken,
              pool.account.nodeWallet,
              true,
              quoteTokenProgram
            ),
            mint: quoteToken,
          })
          .remainingAccounts(
            partnerFeeRecipient && partnerFeeMarkupAsPkey
              ? [
                {
                  pubkey: getAssociatedTokenAddressSync(
                    quoteToken,
                    partnerFeeRecipient,
                    false,
                    quoteTokenProgram
                  ),
                  isSigner: false,
                  isWritable: true,
                },
                {
                  pubkey: partnerFeeMarkupAsPkey,
                  isSigner: false,
                  isWritable: false,
                },
              ]
              : []
          )
          .instruction();
  } else {
    repaySolIx = useReferral
      ? await lavarageProgram.methods
          .tradingCloseRepaySolWithReferral(
            new BN(jupInstruction.quoteResponse.outAmount),
            new BN(9998),
            new BN(discountBps),
            new BN(referralBps)
          )
          .accountsStrict({
            nodeWallet: pool.account.nodeWallet,
            positionAccount: positionAccountPDA,
            tradingPool: poolPubKey,
            trader: lavarageProgram.provider.publicKey!,
            systemProgram: SystemProgram.programId,
            clock: SYSVAR_CLOCK_PUBKEY,
            randomAccountAsId: position.account.seed,
            feeTokenAccount: getAssociatedTokenAddressSync(
              quoteToken,
              new PublicKey("6JfTobDvwuwZxZP6FR5JPmjdvQ4h4MovkEVH2FPsMSrF"),
              false,
              quoteTokenProgram
            ),
            fromTokenAccount: getAssociatedTokenAddressSync(
              quoteToken,
              lavarageProgram.provider.publicKey!,
              false,
              quoteTokenProgram
            ),
            tokenProgram: quoteTokenProgram!,
            toTokenAccount: getAssociatedTokenAddressSync(
              quoteToken,
              pool.account.nodeWallet,
              true,
              quoteTokenProgram
            ),
            mint: quoteToken,
          })
          .remainingAccounts(
            partnerFeeRecipient && partnerFeeMarkupAsPkey && userVaultPda
              ? [
                {
                  pubkey: getAssociatedTokenAddressSync(
                    quoteToken,
                    userVaultPda,
                    true, // allowOwnerOffCurve for PDA
                    quoteTokenProgram
                  ),
                  isSigner: false,
                  isWritable: true,
                }
              ]
              : []
          )
          .instruction()
      : await lavarageProgram.methods
          .tradingCloseRepaySol(
            new BN(jupInstruction.quoteResponse.outAmount),
            new BN(9998)
          )
          .accountsStrict({
            nodeWallet: pool.account.nodeWallet,
            positionAccount: positionAccountPDA,
            tradingPool: poolPubKey,
            trader: lavarageProgram.provider.publicKey!,
            systemProgram: SystemProgram.programId,
            clock: SYSVAR_CLOCK_PUBKEY,
            randomAccountAsId: position.account.seed,
            feeTokenAccount: getAssociatedTokenAddressSync(
              quoteToken,
              new PublicKey("6JfTobDvwuwZxZP6FR5JPmjdvQ4h4MovkEVH2FPsMSrF"),
              false,
              quoteTokenProgram
            ),
            fromTokenAccount: getAssociatedTokenAddressSync(
              quoteToken,
              lavarageProgram.provider.publicKey!,
              false,
              quoteTokenProgram
            ),
            tokenProgram: quoteTokenProgram!,
            toTokenAccount: getAssociatedTokenAddressSync(
              quoteToken,
              pool.account.nodeWallet,
              true,
              quoteTokenProgram
            ),
            mint: quoteToken,
          })
          .remainingAccounts(
            partnerFeeRecipient && partnerFeeMarkupAsPkey
              ? [
                {
                  pubkey: getAssociatedTokenAddressSync(
                    quoteToken,
                    partnerFeeRecipient,
                    false,
                    quoteTokenProgram
                  ),
                  isSigner: false,
                  isWritable: true,
                },
                {
                  pubkey: partnerFeeMarkupAsPkey,
                  isSigner: false,
                  isWritable: false,
                },
              ]
              : []
          )
          .instruction();
    const {
      setupInstructions,
      swapInstruction: swapInstructionPayload,
      cleanupInstruction,
      addressLookupTableAddresses,
    } = jupiterSellIx!;
    jupiterIxs = [
      ...setupInstructions.filter((i) => !!i).map(deserializeInstruction),
      swapInstructionPayload
        ? deserializeInstruction(swapInstructionPayload)
        : null,
      cleanupInstruction ? deserializeInstruction(cleanupInstruction) : null,
    ].filter((i) => !!i);
    addressLookupTableAccounts.push(
      ...(await getAddressLookupTableAccounts([
        ...addressLookupTableAddresses,
        getQuoteCurrencySpecificAddressLookupTable(quoteToken.toBase58()),
        "5LEAB3owNUSKvECm7vkr58tDtQpzbngQ2NYpc7qmRFdi",
      ]))
    );
  }
  const profit = new BN(jupInstruction.quoteResponse.outAmount)
    .sub(position.account.amount)
    .sub(position.account.userPaid);

  let createAssociatedTokenAccountInstruction =
    createAssociatedTokenAccountIdempotentInstruction(
      lavarageProgram.provider.publicKey!,
      toTokenAccount.account!.address,
      lavarageProgram.provider.publicKey!,
      offer.account.collateralType,
      tokenProgram!
    );

  const computeFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: computeBudgetMicroLamports ?? 100000,
  });

  if (splitTransactions) {
    const setUpInstructions = [
      partnerFeeRecipientVaultCreateIx,
      partnerFeeRecipientTokenAccountCreateIx,
      jupInstruction.instructions && platformFeeRecipientAccount?.instruction ? platformFeeRecipientAccount.instruction : null,
      createAssociatedTokenAccountInstruction,
    ].filter((i) => !!i);

    const allInstructions = [
      jupInstruction.instructions?.tokenLedgerInstruction
        ? deserializeInstruction(
          jupInstruction.instructions.tokenLedgerInstruction
        )
        : null,
      closePositionIx,
      ...jupiterIxs,
      repaySolIx,
      computeBudgetMicroLamports ? computeFeeIx : undefined,
    ].filter((i) => !!i);

    const messageV01 = new TransactionMessage({
      payerKey: lavarageProgram.provider.publicKey!,
      recentBlockhash: blockhash,
      instructions: setUpInstructions,
    }).compileToV0Message(addressLookupTableAccounts);

    const tx = new VersionedTransaction(messageV01);

    const messageV02 = new TransactionMessage({
      payerKey: lavarageProgram.provider.publicKey!,
      recentBlockhash: blockhash,
      instructions: allInstructions,
    }).compileToV0Message(addressLookupTableAccounts);

    const tx2 = new VersionedTransaction(messageV02);

    return [tx, tx2];
  }

  const allInstructions = [
    partnerFeeRecipientVaultCreateIx,
    partnerFeeRecipientTokenAccountCreateIx,
    jupInstruction.instructions && platformFeeRecipientAccount?.instruction ? platformFeeRecipientAccount.instruction : null,
    createAssociatedTokenAccountInstruction,
    jupInstruction.instructions?.tokenLedgerInstruction
      ? deserializeInstruction(
        jupInstruction.instructions.tokenLedgerInstruction
      )
      : null,
    closePositionIx,
    ...jupiterIxs,
    repaySolIx,
    computeBudgetMicroLamports ? computeFeeIx : undefined,
  ].filter((i) => !!i);

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions: allInstructions,
  }).compileToV0Message(addressLookupTableAccounts);

  const tx = new VersionedTransaction(messageV0);

  return tx;
};

/**
 * Retrieves delegate accounts for automated position management
 * 
 * @group Traders
 * @category Queries
 * 
 * @param lavarageProgram - The Lavarage program instance (V1 or V2)
 * @param userPubKey - Optional user public key to filter delegates
 * 
 * @returns Array of delegate accounts with parsed price data
 * 
 * @example
 * ```typescript
 * // Get all delegates for a specific user
 * const userDelegates = await getDelegateAccounts(
 *   lavarageProgram,
 *   userPublicKey
 * );
 * 
 * // Get all delegates (no filter)
 * const allDelegates = await getDelegateAccounts(lavarageProgram);
 * 
 * // Access parsed data
 * userDelegates.forEach(delegate => {
 *   console.log('TP Price:', delegate.parsed.tpPrice.toString());
 *   console.log('Threshold:', delegate.parsed.tpThreshold.toString());
 * });
 * ```
 * @see {@link createTpDelegate} - Create a new take-profit delegate
 * @see {@link modifyTpDelegate} - Modify existing take-profit settings
 * @see {@link removeTpDelegate} - Remove take-profit settings
 */
export const getDelegateAccounts = async (
  lavarageProgram: Program<Lavarage> | Program<LavarageV2>,
  userPubKey?: PublicKey
) => {
  const delegateAccounts = await lavarageProgram.account.delegate.all(
    userPubKey
      ? [
        {
          memcmp: {
            offset: 104,
            bytes: userPubKey.toBase58(),
          },
        },
      ]
      : undefined
  );
  return delegateAccounts.map((d) => ({
    ...d,
    parsed: {
      tpPrice: new BN(d.account.field1),
      tpThreshold: new BN(d.account.field2),
    },
  }));
};

const getQuoteCurrencySpecificAddressLookupTable = (quoteCurrency: string) => {
  switch (quoteCurrency) {
    case "J9BcrQfX4p9D1bvLzRNCbMDv8f44a9LFdeqNE4Yk2WMD":
      return "2EdNtwVhyjkEgkKDC7GShfSSczZYMKLuJraeoJzG4E4R";
    case "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v":
      return "CxLE1LRaZg2eYygzFfVRhgmSACsvqzyhySDrMHq3QSab";
    default:
      return "2EdNtwVhyjkEgkKDC7GShfSSczZYMKLuJraeoJzG4E4R";
  }
};

/**
 * Splits a position into two separate positions on Lavarage V2
 * 
 * @group Traders
 * @category PositionManagement
 * 
 * @param lavarageProgram - The Lavarage V2 or V1 program instance
 * @param position - The original position to split
 * @param offer - The offer/pool account associated with the position
 * @param quoteToken - The quote token mint address
 * @param propotionBps - Split ratio in basis points (5000 = 50/50 split)
 * @param computeBudgetMicroLamports - Optional compute budget for priority fees
 * 
 * @returns Object containing transaction and new position addresses
 * 
 * @example
 * ```typescript
 * // Split position 70/30
 * const result = await splitPositionV2(
 *   lavarageProgram,
 *   position,
 *   offer,
 *   usdcMint,
 *   7000  // 70% to first position, 30% to second
 * );
 * 
 * const tx = result.transaction;
 * await sendAndConfirmTransaction(connection, tx, [wallet]);
 * 
 * console.log('New positions:', result.newPositionAddresses);
 * ```
 * @see {@link mergePositionV2} - Merge two positions into one
 */
export const splitPositionV2 = async (
  lavarageProgram: Program<LavarageV2> | Program<Lavarage>,
  position: ProgramAccount<{
    pool: PublicKey;
    seed: PublicKey;
    userPaid: BN;
    amount: BN;
  }>,
  offer: ProgramAccount<{
    nodeWallet: PublicKey;
    interestRate: number;
    collateralType: PublicKey;
  }>,
  quoteToken: PublicKey,
  propotionBps: number,
  computeBudgetMicroLamports?: number
) => {
  const positionAccountPDA = position.publicKey;

  const newPosition1Seed = Keypair.generate().publicKey;
  const newPosition2Seed = Keypair.generate().publicKey;

  const newPosition1AccountPDA = getPositionAccountPDA(
    lavarageProgram,
    offer,
    newPosition1Seed
  );
  const newPosition2AccountPDA = getPositionAccountPDA(
    lavarageProgram,
    offer,
    newPosition2Seed
  );

  const mintAccount = await lavarageProgram.provider.connection.getAccountInfo(
    offer.account.collateralType
  );
  const tokenProgram = mintAccount?.owner;

  const newPosition1TokenAccount = getAssociatedTokenAddressSync(
    offer.account.collateralType,
    newPosition1AccountPDA,
    true,
    tokenProgram
  );
  const newPosition2TokenAccount = getAssociatedTokenAddressSync(
    offer.account.collateralType,
    newPosition2AccountPDA,
    true,
    tokenProgram
  );

  const createNewPosition1TokenAccountIx =
    createAssociatedTokenAccountInstruction(
      lavarageProgram.provider.publicKey!,
      newPosition1TokenAccount,
      newPosition1AccountPDA,
      offer.account.collateralType,
      tokenProgram!
    );

  const createNewPosition2TokenAccountIx =
    createAssociatedTokenAccountInstruction(
      lavarageProgram.provider.publicKey!,
      newPosition2TokenAccount,
      newPosition2AccountPDA,
      offer.account.collateralType,
      tokenProgram!
    );

  const ix = await lavarageProgram.methods
    .tradingManagementSplitPosition(
      new BN(propotionBps),
      newPosition1Seed,
      newPosition2Seed
    )
    .accountsStrict({
      originalPosition: positionAccountPDA,
      newPositionOne: newPosition1AccountPDA,
      newPositionTwo: newPosition2AccountPDA,
      trader: lavarageProgram.provider.publicKey!,
      systemProgram: SystemProgram.programId,
      mint: offer.account.collateralType,
      tokenProgram: tokenProgram!,
      originalPositionTokenAccount: getAssociatedTokenAddressSync(
        offer.account.collateralType,
        positionAccountPDA,
        true,
        tokenProgram
      ),
      newPositionTokenAccountOne: newPosition1TokenAccount,
      newPositionTokenAccountTwo: newPosition2TokenAccount,
    })
    .instruction();

  const computeBudgetIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: computeBudgetMicroLamports ?? 100000,
  });

  const allInstructions = [
    createNewPosition1TokenAccountIx,
    createNewPosition2TokenAccountIx,
    ix,
    computeBudgetIx,
  ].filter((i) => !!i);

  const { blockhash } =
    await lavarageProgram.provider.connection.getLatestBlockhash("finalized");

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions: allInstructions,
  }).compileToV0Message();

  const tx = new VersionedTransaction(messageV0);

  return {
    transaction: tx,
    newPositionAddresses: [
      newPosition1AccountPDA.toBase58(),
      newPosition2AccountPDA.toBase58(),
    ],
    newPositionSeeds: [
      newPosition1Seed.toBase58(),
      newPosition2Seed.toBase58(),
    ],
  };
};

/**
 * Merges two positions into a single position on Lavarage V2
 * 
 * @group Traders
 * @category PositionManagement
 * 
 * @param lavarageProgram - The Lavarage V2 program instance
 * @param position1 - The first position to merge
 * @param position2 - The second position to merge
 * @param offer - The offer/pool account (must be same for both positions)
 * @param quoteToken - The quote token mint address
 * @param computeBudgetMicroLamports - Optional compute budget for priority fees
 * 
 * @returns Transaction to merge the positions
 * 
 * @example
 * ```typescript
 * // Merge two positions into one
 * const tx = await mergePositionV2(
 *   lavarageProgram,
 *   position1,
 *   position2,
 *   offer,
 *   usdcMint
 * );
 * 
 * await sendAndConfirmTransaction(connection, tx, [wallet]);
 * ```
 * 
 * @see {@link splitPositionV2} - Split a position into two
 */
export const mergePositionV2 = async (
  lavarageProgram: Program<LavarageV2>,
  position1: ProgramAccount<{
    pool: PublicKey;
    seed: PublicKey;
    userPaid: BN;
    amount: BN;
  }>,
  position2: ProgramAccount<{
    pool: PublicKey;
    seed: PublicKey;
    userPaid: BN;
    amount: BN;
  }>,
  offer: ProgramAccount<{
    nodeWallet: PublicKey;
    interestRate: number;
    collateralType: PublicKey;
  }>,
  quoteToken: PublicKey,
  computeBudgetMicroLamports?: number
) => {
  const positionAccountPDA1 = position1.publicKey;
  const positionAccountPDA2 = position2.publicKey;

  const newPositionSeed = Keypair.generate().publicKey;

  const newPositionAccountPDA = getPositionAccountPDA(
    lavarageProgram,
    offer,
    newPositionSeed
  );

  const mintAccount = await lavarageProgram.provider.connection.getAccountInfo(
    offer.account.collateralType
  );
  const tokenProgram = mintAccount?.owner;

  const newPositionTokenAccount = getAssociatedTokenAddressSync(
    offer.account.collateralType,
    newPositionAccountPDA,
    true,
    tokenProgram
  );

  const createNewPositionTokenAccountIx =
    createAssociatedTokenAccountInstruction(
      lavarageProgram.provider.publicKey!,
      newPositionTokenAccount,
      newPositionAccountPDA,
      offer.account.collateralType,
      tokenProgram!
    );

  const ix = await lavarageProgram.methods
    .tradingManagementMergePositions(newPositionSeed)
    .accountsStrict({
      mergedPosition: newPositionAccountPDA,
      positionOne: positionAccountPDA1,
      positionTwo: positionAccountPDA2,
      trader: lavarageProgram.provider.publicKey!,
      systemProgram: SystemProgram.programId,
      mint: offer.account.collateralType,
      tokenProgram: tokenProgram!,
      positionOneTokenAccount: getAssociatedTokenAddressSync(
        offer.account.collateralType,
        positionAccountPDA1,
        true,
        tokenProgram
      ),
      positionTwoTokenAccount: getAssociatedTokenAddressSync(
        offer.account.collateralType,
        positionAccountPDA2,
        true,
        tokenProgram
      ),
      mergedPositionTokenAccount: newPositionTokenAccount,
    })
    .instruction();

  const computeBudgetIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: computeBudgetMicroLamports ?? 100000,
  });

  const allInstructions = [
    createNewPositionTokenAccountIx,
    ix,
    computeBudgetIx,
  ].filter((i) => !!i);

  const { blockhash } =
    await lavarageProgram.provider.connection.getLatestBlockhash("finalized");

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions: allInstructions,
  }).compileToV0Message();

  const tx = new VersionedTransaction(messageV0);

  return tx;
};

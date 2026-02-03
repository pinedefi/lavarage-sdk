import { BN, Program } from "@coral-xyz/anchor";
import { Lavarage as LavarageSOL } from "./idl/lavarageSOL";
import { Lavarage as LavarageUSDC } from "./idl/lavarageUSDC";
import {
  ComputeBudgetProgram,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
  getMint,
} from "@solana/spl-token";
import { getPda } from "./index";

/**
 * Derives a node wallet PDA for lending operations
 * 
 * @group Lending
 * @category Utilities
 * 
 * @param operatorPublicKey - The operator's public key
 * @param mintPublicKey - The token mint public key
 * @param programId - The Lavarage program ID
 * 
 * @returns The derived node wallet PDA
 * 
 * @example
 * ```typescript
 * const nodeWallet = getNodeWalletPDA(
 *   operatorPublicKey,
 *   usdcMint,
 *   programId
 * );
 * ```
 */
export function getNodeWalletPDA(
  operatorPublicKey: PublicKey,
  mintPublicKey: PublicKey,
  programId: PublicKey
): PublicKey {
  return getPda(
    [
      Buffer.from("node_wallet"),
      operatorPublicKey.toBuffer(),
      mintPublicKey.toBuffer(),
    ],
    programId
  );
}

/**
 * Derives a trading pool PDA for lending operations
 * 
 * @group Lending
 * @category Utilities
 * 
 * @param poolOwnerPublicKey - The pool owner's public key
 * @param tokenPublicKey - The token mint public key
 * @param programId - The Lavarage program ID
 * 
 * @returns The derived trading pool PDA
 * 
 * @example
 * ```typescript
 * const poolPDA = getTradingPoolPDA(
 *   poolOwnerPublicKey,
 *   usdcMint,
 *   programId
 * );
 * ```
 */
export function getTradingPoolPDA(
  poolOwnerPublicKey: PublicKey,
  tokenPublicKey: PublicKey,
  programId: PublicKey
): PublicKey {
  return getPda(
    [
      Buffer.from("trading_pool"),
      poolOwnerPublicKey.toBuffer(),
      tokenPublicKey.toBuffer(),
    ],
    programId
  );
}

export function getWithdrawalAccessListPDA(
  programId: PublicKey
): PublicKey {
  return getPda(
    [
      Buffer.from("withdrawal_access_list"),
    ],
    programId
  );
}

async function createNodeWallet(
  lavarageProgram: Program<LavarageSOL> | Program<LavarageUSDC>,
  params: {
    operator: PublicKey;
    mint?: string; // Required for V2, optional for V1
    liquidationLtv?: number; // Required for V2, optional for V1
  }
): Promise<{
  instructions: TransactionInstruction[];
  nodeWallet: Keypair | undefined;
  nodeWalletAccount: PublicKey;
}> {
  const { blockhash } =
    await lavarageProgram.provider.connection.getLatestBlockhash("finalized");

  let instructions: TransactionInstruction[] = [];
  let nodeWallet;

  // Check if this is V2 program (has mint and liquidationLtv parameters)
  if (params.mint !== undefined && params.liquidationLtv !== undefined) {
    nodeWallet = getNodeWalletPDA(
      new PublicKey(params.operator),
      new PublicKey(params.mint),
      lavarageProgram.programId
    );
    // V2 version
    instructions.push(await (lavarageProgram as Program<LavarageUSDC>).methods
      .lpOperatorCreateNodeWallet(params.liquidationLtv)
      .accounts({
        operator: new PublicKey(params.operator),
        mint: new PublicKey(params.mint),
      })
      .instruction());
  } else {
    const seed = params.operator.toBase58().slice(0, 32);

    const auxAccountPubkey = await PublicKey.createWithSeed(
      params.operator,
      seed,
      lavarageProgram.programId
    );

    nodeWallet = auxAccountPubkey;

    instructions.push(SystemProgram.createAccountWithSeed({
      fromPubkey: params.operator,
      basePubkey: params.operator,
      seed,
      newAccountPubkey: auxAccountPubkey,
      lamports: 1300000,
      space: 58,
      programId: lavarageProgram.programId,
    }));// Some code
    
    // V1 version
    instructions.push(await (lavarageProgram as Program<LavarageSOL>).methods
      .lpOperatorCreateNodeWallet()
      .accounts({
        nodeWallet: auxAccountPubkey,
        operator: new PublicKey(params.operator),
      })
      .instruction());
  }

  return {
    instructions ,
    nodeWallet: nodeWallet instanceof Keypair ? nodeWallet : undefined,
    nodeWalletAccount:
      nodeWallet instanceof Keypair ? nodeWallet.publicKey : nodeWallet,
  };
}

/**
 * Deposits funds into a node wallet for lending operations
 * 
 * @group Lending
 * @category Operations
 * 
 * @param lavarageProgram - The Lavarage V1 program instance
 * @param params - Deposit parameters
 * @param params.nodeWallet - The node wallet PDA to deposit into
 * @param params.mint - Token mint address (optional for V1 SOL deposits)
 * @param params.funder - The account providing the funds
 * @param params.amount - Amount to deposit (in lamports for SOL or token units)
 * @param params.computeBudgetMicroLamports - Optional compute budget for priority fees
 * 
 * @returns Transaction to deposit funds
 * 
 * @example
 * ```typescript
 * // Deposit SOL
 * const tx = await depositFunds(lavarageProgram, {
 *   nodeWallet: nodeWalletPDA,
 *   funder: lenderPublicKey,
 *   amount: 1000000000 // 1 SOL
 * });
 * 
 * // Deposit USDC
 * const tx = await depositFunds(lavarageProgram, {
 *   nodeWallet: nodeWalletPDA,
 *   mint: usdcMint.toString(),
 *   funder: lenderPublicKey,
 *   amount: 1000000 // 1 USDC (6 decimals)
 * });
 * ```
 * 
 * @see {@link withdrawFundsV1} - Withdraw funds from a node wallet
 * @see {@link withdrawFunds} - Unified withdraw function for both V1 and V2
 */
export async function depositFunds(
  lavarageProgram: Program<LavarageSOL>,
  params: {
    nodeWallet: PublicKey;
    mint?: string; // Required for V2, optional for V1
    funder: PublicKey;
    amount: number;
    computeBudgetMicroLamports?: number;
  }
): Promise<VersionedTransaction> {
  const { blockhash } =
    await lavarageProgram.provider.connection.getLatestBlockhash("finalized");

  let instruction, createTokenAccountIx;
  if (params.mint === undefined) {
    const computeFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: params.computeBudgetMicroLamports ?? 150000,
    });
    instruction = await lavarageProgram.methods
      .lpOperatorFundNodeWallet(new BN(params.amount))
      .accounts({
        nodeWallet: params.nodeWallet,
        funder: params.funder,
      })
      .instruction();
  } else {
    const mintPubkey = new PublicKey(params.mint);
    const mintOwner = await lavarageProgram.provider.connection.getAccountInfo(
      mintPubkey
    );
    const mintAccount = await getMint(
      lavarageProgram.provider.connection,
      mintPubkey,
      "confirmed",
      mintOwner?.owner
    );
    const computeFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: params.computeBudgetMicroLamports ?? 150000,
    });
    const destinationTokenAccount = getAssociatedTokenAddressSync(
      mintPubkey,
      new PublicKey(params.nodeWallet),
      true,
      mintOwner?.owner
    )
    createTokenAccountIx = createAssociatedTokenAccountIdempotentInstruction(
      lavarageProgram.provider.publicKey!,
      destinationTokenAccount,
      params.nodeWallet,
      new PublicKey(params.mint),
      mintOwner?.owner
    );
    instruction = createTransferCheckedInstruction(
      getAssociatedTokenAddressSync(
        mintPubkey,
        new PublicKey(params.funder),
        true,
        mintOwner?.owner
      ),
      new PublicKey(params.mint),
      destinationTokenAccount,
      lavarageProgram.provider.publicKey!,
      params.amount,
      mintAccount.decimals,
      [],
      mintOwner?.owner
    );
  }

  const computeFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: params.computeBudgetMicroLamports ?? 150000,
  });

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions: [createTokenAccountIx, instruction, computeFeeIx].filter(Boolean) as TransactionInstruction[],
  }).compileToV0Message();

  return new VersionedTransaction(messageV0);
}

/**
 * Withdraws funds from a node wallet on Lavarage V1
 * 
 * @group Lending
 * @category Operations
 * 
 * @param lavarageProgram - The Lavarage V1 program instance
 * @param params - Withdrawal parameters
 * @param params.nodeWallet - The node wallet PDA to withdraw from
 * @param params.funder - The account receiving the withdrawn funds
 * @param params.amount - Amount to withdraw in lamports
 * @param params.computeBudgetMicroLamports - Optional compute budget for priority fees
 * 
 * @returns Transaction to withdraw funds
 * 
 * @example
 * ```typescript
 * const tx = await withdrawFundsV1(lavarageProgram, {
 *   nodeWallet: nodeWalletPDA,
 *   funder: lenderPublicKey,
 *   amount: 1000000000 // 1 SOL
 * });
 * 
 * await sendAndConfirmTransaction(connection, tx, [wallet]);
 * ```
 * @see {@link depositFunds} - Deposit funds into a node wallet
 * @see {@link withdrawFunds} - Unified withdraw function for both V1 and V2
 */
export async function withdrawFundsV1(
  lavarageProgram: Program<LavarageSOL>,
  params: {
    nodeWallet: PublicKey;
    funder: PublicKey;
    amount: number;
    computeBudgetMicroLamports?: number;
  }
): Promise<VersionedTransaction> {
  const { blockhash } =
    await lavarageProgram.provider.connection.getLatestBlockhash("finalized");

  const withdrawalAccessList = getWithdrawalAccessListPDA(lavarageProgram.programId);

  const instruction = await lavarageProgram.methods
    .lpOperatorWithdrawFromNodeWallet(new BN(params.amount))
    .accountsStrict({
      nodeWallet: params.nodeWallet,
      funder: params.funder,
      systemProgram: SystemProgram.programId,
      withdrawalAccessList: withdrawalAccessList,
    })
    .instruction();

  const computeFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: params.computeBudgetMicroLamports ?? 150000,
  });

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions: [instruction, computeFeeIx],
  }).compileToV0Message();

  return new VersionedTransaction(messageV0);
}

/**
 * Withdraws funds from a node wallet on Lavarage V2
 * 
 * @group Lending
 * @category Operations
 * 
 * @param lavarageProgram - The Lavarage V2 program instance
 * @param params - Withdrawal parameters
 * @param params.nodeWallet - The node wallet PDA to withdraw from
 * @param params.funder - The account receiving the withdrawn funds
 * @param params.mint - Token mint address
 * @param params.amount - Amount to withdraw in token units
 * @param params.fromTokenAccount - Optional source token account (auto-derived if not provided)
 * @param params.toTokenAccount - Optional destination token account (auto-derived if not provided)
 * @param params.computeBudgetMicroLamports - Optional compute budget for priority fees
 * 
 * @returns Transaction to withdraw funds
 * 
 * @example
 * ```typescript
 * // Withdraw USDC
 * const tx = await withdrawFundsV2(lavarageProgram, {
 *   nodeWallet: nodeWalletPDA,
 *   funder: lenderPublicKey,
 *   mint: usdcMint.toString(),
 *   amount: 1000000 // 1 USDC (6 decimals)
 * });
 * 
 * await sendAndConfirmTransaction(connection, tx, [wallet]);
 * ```
 * @see {@link depositFunds} - Deposit funds into a node wallet
 * @see {@link withdrawFunds} - Unified withdraw function for both V1 and V2
 */
export async function withdrawFundsV2(
  lavarageProgram: Program<LavarageUSDC>,
  params: {
    nodeWallet: PublicKey;
    funder: PublicKey;
    mint: string;
    amount: number;
    fromTokenAccount?: PublicKey; // Optional, will be derived if not provided
    toTokenAccount?: PublicKey; // Optional, will be derived if not provided
    computeBudgetMicroLamports?: number;
  }
): Promise<VersionedTransaction> {
  const { blockhash } =
    await lavarageProgram.provider.connection.getLatestBlockhash("finalized");

  const mintPubkey = new PublicKey(params.mint);

  // Derive token accounts if not provided
  const fromTokenAccount =
    params.fromTokenAccount ||
    getAssociatedTokenAddressSync(mintPubkey, params.nodeWallet, true);
  const toTokenAccount =
    params.toTokenAccount ||
    getAssociatedTokenAddressSync(mintPubkey, params.funder);
  const withdrawalAccessList = getWithdrawalAccessListPDA(lavarageProgram.programId);

  const instruction = await lavarageProgram.methods
    .lpOperatorWithdrawFromNodeWallet(new BN(params.amount))
    .accountsStrict({
      nodeWallet: params.nodeWallet,
      funder: params.funder,
      systemProgram: SystemProgram.programId,
      mint: mintPubkey,
      fromTokenAccount,
      toTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      withdrawalAccessList: withdrawalAccessList,
    })
    .instruction();

  const computeFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: params.computeBudgetMicroLamports ?? 150000,
  });

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions: [instruction, computeFeeIx],
  }).compileToV0Message();

  return new VersionedTransaction(messageV0);
}
/**
 * Withdraws funds from a node wallet (supports both V1 and V2)
 * 
 * @group Lending
 * @category Operations
 * 
 * @param lavarageProgram - The Lavarage program instance (V1 or V2)
 * @param params - Withdrawal parameters
 * @param params.nodeWallet - The node wallet PDA to withdraw from
 * @param params.funder - The account receiving the withdrawn funds
 * @param params.amount - Amount to withdraw
 * @param params.mint - Token mint address (required for V2, omit for V1 SOL withdrawal)
 * @param params.fromTokenAccount - Optional source token account (V2 only)
 * @param params.toTokenAccount - Optional destination token account (V2 only)
 * @param params.computeBudgetMicroLamports - Optional compute budget for priority fees
 * 
 * @returns Transaction to withdraw funds
 * 
 * @example
 * ```typescript
 * // V1: Withdraw SOL
 * const tx = await withdrawFunds(lavarageProgram, {
 *   nodeWallet: nodeWalletPDA,
 *   funder: lenderPublicKey,
 *   amount: 1000000000 // 1 SOL
 * });
 * 
 * // V2: Withdraw USDC
 * const tx = await withdrawFunds(lavarageProgram, {
 *   nodeWallet: nodeWalletPDA,
 *   funder: lenderPublicKey,
 *   mint: usdcMint.toString(),
 *   amount: 1000000 // 1 USDC
 * });
 * ```
 * @see {@link depositFunds} - Deposit funds into a node wallet
 * @see {@link withdrawFundsV1} - V1 specific implementation
 * @see {@link withdrawFundsV2} - V2 specific implementation
 */
// Unified withdraw function that works with both V1 and V2
export async function withdrawFunds(
  lavarageProgram: Program<LavarageSOL> | Program<LavarageUSDC>,
  params: {
    nodeWallet: PublicKey;
    funder: PublicKey;
    amount: number;
    mint?: string; // Required for V2, optional for V1
    fromTokenAccount?: PublicKey; // Only used for V2
    toTokenAccount?: PublicKey; // Only used for V2
    computeBudgetMicroLamports?: number;
  }
): Promise<VersionedTransaction> {
  // Check if mint is provided to determine if this is V2
  if (params.mint) {
    return withdrawFundsV2(lavarageProgram as Program<LavarageUSDC>, {
      nodeWallet: params.nodeWallet,
      funder: params.funder,
      mint: params.mint,
      amount: params.amount,
      fromTokenAccount: params.fromTokenAccount,
      toTokenAccount: params.toTokenAccount,
      computeBudgetMicroLamports: params.computeBudgetMicroLamports,
    });
  } else {
    return withdrawFundsV1(lavarageProgram as Program<LavarageSOL>, {
      nodeWallet: params.nodeWallet,
      funder: params.funder,
      amount: params.amount,
      computeBudgetMicroLamports: params.computeBudgetMicroLamports,
    });
  }
}

/**
 * Creates a lending offer/pool on Lavarage
 * 
 * @group Lending
 * @category Operations
 * 
 * @param lavarageProgram - The Lavarage program instance (V1 or V2)
 * @param params - Offer creation parameters
 * @param params.tradingPool - The trading pool PDA
 * @param params.poolOwner - The pool owner's public key
 * @param params.mint - The collateral token mint address
 * @param params.quoteMint - The quote token mint address
 * @param params.interestRate - Interest rate for the pool
 * @param params.maxExposure - Maximum exposure limit
 * @param params.computeBudgetMicroLamports - Optional compute budget for priority fees
 * 
 * @returns Transaction to create the offer
 * 
 * @example
 * ```typescript
 * const tx = await createOffer(lavarageProgram, {
 *   tradingPool: poolPDA,
 *   poolOwner: lenderPublicKey,
 *   mint: collateralMint.toString(),
 *   quoteMint: usdcMint.toString(),
 *   interestRate: 500, // 5%
 *   maxExposure: 1000000
 * });
 * 
 * await sendAndConfirmTransaction(connection, tx, [wallet]);
 * ```
 */
export async function createOffer(
  lavarageProgram: Program<LavarageSOL> | Program<LavarageUSDC>,
  params: {
    tradingPool: PublicKey;
    poolOwner: PublicKey;
    // the collateral mint
    mint: string;
    // the quote mint
    quoteMint: string;
    interestRate: number;
    maxExposure: number;
    computeBudgetMicroLamports?: number;
    openLtv?: number;
  }
): Promise<VersionedTransaction> {
  
  let nodeWalletAccount, nodeWalletSigner, createNodeWalletInstruction: TransactionInstruction[] =[], nodeWalletPubKey;

  if (params.quoteMint === "So11111111111111111111111111111111111111112") {
    const nodeWallets = await lavarageProgram.account.nodeWallet.all();
    nodeWalletAccount = nodeWallets.find((wallet) =>
      wallet.account.nodeOperator.equals(new PublicKey(params.poolOwner)),
    );
  } else {
    const nodeWalletPda = getNodeWalletPDA(
      new PublicKey(params.poolOwner),
      new PublicKey(params.quoteMint),
      lavarageProgram.programId
    );
    const nodeWalletAccountInfo = await lavarageProgram.provider.connection.getAccountInfo(nodeWalletPda);
    if (nodeWalletAccountInfo) {
      nodeWalletAccount = {
        publicKey: nodeWalletPda,
      };
    }
  }

  if (!nodeWalletAccount?.account) {
    // Determine if this is V2 based on mint (SOL = V1, others = V2)
    const isSOL = params.quoteMint === "So11111111111111111111111111111111111111112";

    const {
      instructions,
      nodeWallet,
      nodeWalletAccount: nodeWalletPublicKey,
    } = await createNodeWallet(lavarageProgram, {
      operator: new PublicKey(params.poolOwner.toBase58()),
      mint: isSOL ? undefined : params.quoteMint, // Only pass mint for V2 (non-SOL)
      liquidationLtv: isSOL ? undefined : 90, // Only pass liquidationLtv for V2 (non-SOL)
    });
    nodeWalletSigner = nodeWallet;
    createNodeWalletInstruction = instructions;
    nodeWalletPubKey = nodeWalletPublicKey;
  } else {
    nodeWalletPubKey = nodeWalletAccount.publicKey;
  }

  const { blockhash } =
    await lavarageProgram.provider.connection.getLatestBlockhash("finalized");

  // Both V1 and V2 lpOperatorCreateTradingPool require mint parameter
  const instruction = await lavarageProgram.methods
    .lpOperatorCreateTradingPool(params.interestRate)
    .accounts({
      operator: params.poolOwner,
      nodeWallet: nodeWalletPubKey,
      mint: new PublicKey(params.mint), // Always required for both V1 and V2
    })
    .instruction();

  const updateMaxExposureInstruction = await lavarageProgram.methods
    .lpOperatorUpdateMaxExposure(new BN(params.maxExposure))
    .accounts({
      tradingPool: params.tradingPool,
      nodeWallet: nodeWalletPubKey,
      operator: params.poolOwner,
    })
    .instruction();

  const computeFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: params.computeBudgetMicroLamports ?? 150000,
  });

  const transferInstruction = SystemProgram.transfer({
    fromPubkey: lavarageProgram.provider.publicKey!,
    toPubkey: new PublicKey("BMME51pfWdBfakTEMuQbNP4NG3wCY4Fo47dKatThhXGQ"),
    lamports: 0.3 * LAMPORTS_PER_SOL
  });

  const updateMaxBorrowInstruction = await lavarageProgram.methods
    .lpOperatorUpdateOpenLtv(new BN(params.openLtv ?? 0))
    .accounts({
      tradingPool: params.tradingPool,
      nodeWallet: nodeWalletPubKey,
      operator: params.poolOwner,
    })
    .instruction();

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions: [
      ...createNodeWalletInstruction,
      instruction,
      updateMaxExposureInstruction,
      params.openLtv ? updateMaxBorrowInstruction : undefined,
      computeFeeIx,
    ].filter(Boolean) as TransactionInstruction[],
  }).compileToV0Message();

  return new VersionedTransaction(messageV0);
}

/**
 * Updates the maximum exposure limit for a trading pool
 * 
 * @group Lending
 * @category Operations
 * 
 * @param lavarageProgram - The Lavarage program instance (V1 or V2)
 * @param params - Update parameters
 * @param params.tradingPool - The trading pool PDA
 * @param params.nodeWallet - The node wallet address
 * @param params.poolOwner - The pool owner's public key
 * @param params.maxExposure - New maximum exposure limit
 * @param params.computeBudgetMicroLamports - Optional compute budget for priority fees
 * 
 * @returns Transaction to update max exposure
 * 
 * @example
 * ```typescript
 * const tx = await updateMaxExposure(lavarageProgram, {
 *   tradingPool: poolPDA,
 *   nodeWallet: nodeWalletAddress,
 *   poolOwner: lenderPublicKey,
 *   maxExposure: 2000000 // New limit
 * });
 * 
 * await sendAndConfirmTransaction(connection, tx, [wallet]);
 * ```
 */
export async function updateMaxExposure(
  lavarageProgram: Program<LavarageSOL> | Program<LavarageUSDC>,
  params: {
    tradingPool: PublicKey;
    nodeWallet: string;
    poolOwner: PublicKey;
    maxExposure: number;
    computeBudgetMicroLamports?: number;
  }
): Promise<VersionedTransaction> {
  const { blockhash } =
    await lavarageProgram.provider.connection.getLatestBlockhash("finalized");

  const instruction = await lavarageProgram.methods
    .lpOperatorUpdateMaxExposure(new BN(params.maxExposure))
    .accounts({
      tradingPool: params.tradingPool,
      nodeWallet: new PublicKey(params.nodeWallet),
      operator: params.poolOwner,
    })
    .instruction();

  const computeFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: params.computeBudgetMicroLamports ?? 150000,
  });

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions: [instruction, computeFeeIx],
  }).compileToV0Message();

  return new VersionedTransaction(messageV0);
}

/**
 * Updates the interest rate for a trading pool
 * 
 * @group Lending
 * @category Operations
 * 
 * @param lavarageProgram - The Lavarage program instance (V1 or V2)
 * @param params - Update parameters
 * @param params.tradingPool - The trading pool PDA
 * @param params.nodeWallet - The node wallet address
 * @param params.poolOwner - The pool owner's public key
 * @param params.interestRate - New interest rate
 * @param params.computeBudgetMicroLamports - Optional compute budget for priority fees
 * 
 * @returns Transaction to update interest rate
 * 
 * @example
 * ```typescript
 * const tx = await updateInterestRate(lavarageProgram, {
 *   tradingPool: poolPDA,
 *   nodeWallet: nodeWalletAddress,
 *   poolOwner: lenderPublicKey,
 *   interestRate: 750 // 7.5%
 * });
 * 
 * await sendAndConfirmTransaction(connection, tx, [wallet]);
 * ```
 */
export async function updateInterestRate(
  lavarageProgram: Program<LavarageSOL> | Program<LavarageUSDC>,
  params: {
    tradingPool: PublicKey;
    nodeWallet: string;
    poolOwner: PublicKey;
    interestRate: number;
    computeBudgetMicroLamports?: number;
  }
): Promise<VersionedTransaction> {
  const { blockhash } =
    await lavarageProgram.provider.connection.getLatestBlockhash("finalized");

  const instruction = await lavarageProgram.methods
    .lpOperatorUpdateInterestRate(params.interestRate)
    .accounts({
      tradingPool: params.tradingPool,
      nodeWallet: new PublicKey(params.nodeWallet),
      operator: params.poolOwner,
    })
    .instruction();

  const computeFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: params.computeBudgetMicroLamports ?? 150000,
  });

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions: [instruction, computeFeeIx],
  }).compileToV0Message();

  return new VersionedTransaction(messageV0);
}

/**
 * Updates multiple parameters of a trading pool in a single transaction
 * 
 * @group Lending
 * @category Operations
 * 
 * @param lavarageProgram - The Lavarage program instance (V1 or V2)
 * @param params - Update parameters
 * @param params.tradingPool - The trading pool PDA
 * @param params.poolOwner - The pool owner's public key
 * @param params.nodeWallet - The node wallet address
 * @param params.mint - The token mint address
 * @param params.interestRate - New interest rate
 * @param params.maxExposure - New maximum exposure limit
 * @param params.computeBudgetMicroLamports - Optional compute budget for priority fees
 * 
 * @returns Transaction to update pool parameters
 * 
 * @example
 * ```typescript
 * const tx = await updateOffer(lavarageProgram, {
 *   tradingPool: poolPDA,
 *   poolOwner: lenderPublicKey,
 *   nodeWallet: nodeWalletAddress,
 *   mint: collateralMint.toString(),
 *   interestRate: 600, // 6%
 *   maxExposure: 3000000
 * });
 * 
 * await sendAndConfirmTransaction(connection, tx, [wallet]);
 * ```
 * 
 * @see {@link updateInterestRate} - Update only interest rate
 * @see {@link updateMaxExposure} - Update only max exposure
 */
export async function updateOffer(
  lavarageProgram: Program<LavarageSOL> | Program<LavarageUSDC>,
  params: {
    tradingPool: PublicKey;
    poolOwner: PublicKey;
    nodeWallet: string;
    mint: string;
    interestRate: number;
    maxExposure: number;
    computeBudgetMicroLamports?: number;
    //includeCreatePool?: boolean; // Optional flag to include pool creation
  }
): Promise<VersionedTransaction> {
  const { blockhash } =
    await lavarageProgram.provider.connection.getLatestBlockhash("finalized");

  const instructions = [];

  // // Optionally include pool creation instruction
  // if (params.includeCreatePool) {
  //   const createPoolInstruction = await lavarageProgram.methods
  //     .lpOperatorCreateTradingPool(new BN(params.interestRate))
  //     .accounts({
  //       tradingPool: params.tradingPool,
  //       operator: params.poolOwner,
  //       nodeWallet: new PublicKey(params.nodeWallet),
  //       mint: new PublicKey(params.mint),
  //       systemProgram: SystemProgram.programId,
  //     })
  //     .instruction();

  //   instructions.push(createPoolInstruction);
  // }

  // Update max exposure instruction
  const updateMaxExposureInstruction = await lavarageProgram.methods
    .lpOperatorUpdateMaxExposure(new BN(params.maxExposure))
    .accounts({
      tradingPool: params.tradingPool,
      nodeWallet: new PublicKey(params.nodeWallet),
      operator: params.poolOwner,
    })
    .instruction();

  // Update interest rate instruction
  const updateInterestRateInstruction = await lavarageProgram.methods
    .lpOperatorUpdateInterestRate(params.interestRate)
    .accounts({
      tradingPool: params.tradingPool,
      nodeWallet: new PublicKey(params.nodeWallet),
      operator: params.poolOwner,
    })
    .instruction();

  const computeFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: params.computeBudgetMicroLamports ?? 150000,
  });

  instructions.push(
    updateMaxExposureInstruction,
    updateInterestRateInstruction,
    computeFeeIx
  );

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message();

  return new VersionedTransaction(messageV0);
}

/**
 * Updates the maximum borrow limit for a trading pool
 * 
 * @group Lending
 * @category Operations
 * 
 * @param lavarageProgram - The Lavarage program instance (V1 or V2)
 * @param params - Update parameters
 * @param params.tradingPool - The trading pool PDA
 * @param params.nodeWallet - The node wallet address
 * @param params.oracle - The oracle public key authorized to update
 * @param params.maxBorrow - New maximum borrow limit
 * @param params.computeBudgetMicroLamports - Optional compute budget for priority fees
 * 
 * @returns Transaction to update max borrow limit
 * 
 * @example
 * ```typescript
 * const tx = await updateMaxBorrow(lavarageProgram, {
 *   tradingPool: poolPDA,
 *   nodeWallet: nodeWalletAddress,
 *   oracle: oraclePublicKey,
 *   maxBorrow: 5000000
 * });
 * 
 * await sendAndConfirmTransaction(connection, tx, [wallet]);
 * ```
 */
export async function updateMaxBorrow(
  lavarageProgram: Program<LavarageSOL> | Program<LavarageUSDC>,
  params: {
    tradingPool: PublicKey;
    nodeWallet: string;
    oracle: PublicKey;
    openLtv: number;
    computeBudgetMicroLamports?: number;
  }
): Promise<VersionedTransaction> {
  const { blockhash } =
    await lavarageProgram.provider.connection.getLatestBlockhash("finalized");

  const instruction = await lavarageProgram.methods
    .lpOperatorUpdateOpenLtv(new BN(params.openLtv))
    .accounts({
      tradingPool: params.tradingPool,
      nodeWallet: new PublicKey(params.nodeWallet),
      operator: params.oracle,
    })
    .instruction();

  const computeFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: params.computeBudgetMicroLamports ?? 150000,
  });

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions: [instruction, computeFeeIx],
  }).compileToV0Message();

  return new VersionedTransaction(messageV0);
}

export async function addToWithdrawalAccessList(
  lavarageProgram: Program<LavarageSOL> | Program<LavarageUSDC>,
  params: {
    nodeWallet: PublicKey;
    authority: PublicKey;
    toPubkey: PublicKey;
    computeBudgetMicroLamports?: number;
  }
): Promise<VersionedTransaction> {
  const { blockhash } =
    await lavarageProgram.provider.connection.getLatestBlockhash("finalized");

  const instruction = await lavarageProgram.methods
    .addWithdrawalAccess(params.toPubkey)
    .accounts({
      nodeWallet: params.nodeWallet,
      authority: params.authority,
    })
    .instruction();

  const computeFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: params.computeBudgetMicroLamports ?? 150000,
  });

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions: [instruction, computeFeeIx],
  }).compileToV0Message();

  return new VersionedTransaction(messageV0);
}


export async function removeFromWithdrawalAccessList(
  lavarageProgram: Program<LavarageSOL> | Program<LavarageUSDC>,
  params: {
    authority: PublicKey;
    nodeWallet: string; // This is a string in the IDL
    computeBudgetMicroLamports?: number;
  }
): Promise<VersionedTransaction> {
  const { blockhash } =
    await lavarageProgram.provider.connection.getLatestBlockhash("finalized");


  const instruction = await lavarageProgram.methods
    .removeWithdrawalAccess(params.nodeWallet)
    .accounts({
      authority: params.authority,
    })
    .instruction();

  const computeFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: params.computeBudgetMicroLamports ?? 150000,
  });

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions: [instruction, computeFeeIx],
  }).compileToV0Message();

  return new VersionedTransaction(messageV0);
}


export async function getWithdrawalAccessList(
  lavarageProgram: Program<LavarageSOL> | Program<LavarageUSDC>,
  params: {
    nodeWallet: string;
  }
): Promise<PublicKey | undefined> {
  const withdrawalAccessList = getWithdrawalAccessListPDA(lavarageProgram.programId);
  const withdrawalAccessListAccount = await lavarageProgram.account.withdrawalAccessList.fetch(withdrawalAccessList);
  return withdrawalAccessListAccount.accessEntries.find((entry) => entry.fromPubkey.toString() === params.nodeWallet)?.toPubkey;
}
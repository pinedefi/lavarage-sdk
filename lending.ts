import { BN, Program } from "@coral-xyz/anchor";
import { Lavarage } from "./idl/lavarage";
import { Lavarage as LavarageV2 } from "./idl/lavaragev2";
import {
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { getPda } from "./index";

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

export async function createNodeWallet(
  lavarageProgram: Program<Lavarage> | Program<LavarageV2>,
  params: {
    nodeWallet: PublicKey;
    operator: PublicKey;
    mint: string;
    liquidationLtv?: number; // Required for V2, optional for V1
  }
): Promise<VersionedTransaction> {
  const { blockhash } =
    await lavarageProgram.provider.connection.getLatestBlockhash("finalized");

  let instruction;

  // Check if this is V2 program (has liquidationLtv parameter)
  if (params.liquidationLtv !== undefined) {
    // V2 version
    instruction = await (lavarageProgram as Program<LavarageV2>).methods
      .lpOperatorCreateNodeWallet(new BN(params.liquidationLtv))
      .accounts({
        nodeWallet: params.nodeWallet,
        operator: params.operator,
        systemProgram: SystemProgram.programId,
        mint: new PublicKey(params.mint),
      })
      .instruction();
  } else {
    // V1 version
    instruction = await (lavarageProgram as Program<Lavarage>).methods
      .lpOperatorCreateNodeWallet()
      .accounts({
        nodeWallet: params.nodeWallet,
        operator: params.operator,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
  }

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions: [instruction],
  }).compileToV0Message();

  return new VersionedTransaction(messageV0);
}

export async function depositFunds(
  lavarageProgram: Program<Lavarage>,
  params: {
    nodeWallet: PublicKey;
    funder: PublicKey;
    amount: number;
  }
): Promise<VersionedTransaction> {
  const { blockhash } =
    await lavarageProgram.provider.connection.getLatestBlockhash("finalized");

  const instruction = await lavarageProgram.methods
    .lpOperatorFundNodeWallet(new BN(params.amount))
    .accounts({
      nodeWallet: params.nodeWallet,
      funder: params.funder,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions: [instruction],
  }).compileToV0Message();

  return new VersionedTransaction(messageV0);
}

export async function withdrawFundsV1(
  lavarageProgram: Program<Lavarage>,
  params: {
    nodeWallet: PublicKey;
    funder: PublicKey;
    amount: number;
  }
): Promise<VersionedTransaction> {
  const { blockhash } =
    await lavarageProgram.provider.connection.getLatestBlockhash("finalized");

  const instruction = await lavarageProgram.methods
    .lpOperatorWithdrawFromNodeWallet(new BN(params.amount))
    .accounts({
      nodeWallet: params.nodeWallet,
      funder: params.funder,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions: [instruction],
  }).compileToV0Message();

  return new VersionedTransaction(messageV0);
}

export async function withdrawFundsV2(
  lavarageProgram: Program<LavarageV2>,
  params: {
    nodeWallet: PublicKey;
    funder: PublicKey;
    mint: string;
    amount: number;
    fromTokenAccount?: PublicKey; // Optional, will be derived if not provided
    toTokenAccount?: PublicKey; // Optional, will be derived if not provided
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

  const instruction = await lavarageProgram.methods
    .lpOperatorWithdrawFromNodeWallet(new BN(params.amount))
    .accounts({
      nodeWallet: params.nodeWallet,
      funder: params.funder,
      systemProgram: SystemProgram.programId,
      mint: mintPubkey,
      fromTokenAccount,
      toTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction();

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions: [instruction],
  }).compileToV0Message();

  return new VersionedTransaction(messageV0);
}

// Unified withdraw function that works with both V1 and V2
export async function withdrawFunds(
  lavarageProgram: Program<Lavarage> | Program<LavarageV2>,
  params: {
    nodeWallet: PublicKey;
    funder: PublicKey;
    amount: number;
    mint?: string; // Required for V2, optional for V1
    fromTokenAccount?: PublicKey; // Only used for V2
    toTokenAccount?: PublicKey; // Only used for V2
  }
): Promise<VersionedTransaction> {
  // Check if mint is provided to determine if this is V2
  if (params.mint) {
    return withdrawFundsV2(lavarageProgram as Program<LavarageV2>, {
      nodeWallet: params.nodeWallet,
      funder: params.funder,
      mint: params.mint,
      amount: params.amount,
      fromTokenAccount: params.fromTokenAccount,
      toTokenAccount: params.toTokenAccount,
    });
  } else {
    return withdrawFundsV1(lavarageProgram as Program<Lavarage>, {
      nodeWallet: params.nodeWallet,
      funder: params.funder,
      amount: params.amount,
    });
  }
}

export async function createTradingPool(
  lavarageProgram: Program<Lavarage> | Program<LavarageV2>,
  params: {
    tradingPool: PublicKey;
    poolOwner: PublicKey;
    nodeWallet: string;
    mint: string;
    interestRate: number;
  }
): Promise<VersionedTransaction> {
  const { blockhash } =
    await lavarageProgram.provider.connection.getLatestBlockhash("finalized");

  const instruction = await lavarageProgram.methods
    .lpOperatorCreateTradingPool(new BN(params.interestRate))
    .accounts({
      tradingPool: params.tradingPool,
      operator: params.poolOwner,
      nodeWallet: new PublicKey(params.nodeWallet),
      mint: new PublicKey(params.mint),
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions: [instruction],
  }).compileToV0Message();

  return new VersionedTransaction(messageV0);
}

export async function updateMaxExposure(
  lavarageProgram: Program<Lavarage> | Program<LavarageV2>,
  params: {
    tradingPool: PublicKey;
    nodeWallet: string;
    poolOwner: PublicKey;
    maxExposure: number;
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
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions: [instruction],
  }).compileToV0Message();

  return new VersionedTransaction(messageV0);
}

export async function updateInterestRate(
  lavarageProgram: Program<Lavarage> | Program<LavarageV2>,
  params: {
    tradingPool: PublicKey;
    nodeWallet: string;
    poolOwner: PublicKey;
    interestRate: number;
  }
): Promise<VersionedTransaction> {
  const { blockhash } =
    await lavarageProgram.provider.connection.getLatestBlockhash("finalized");

  const instruction = await lavarageProgram.methods
    .lpOperatorUpdateInterestRate(new BN(params.interestRate))
    .accounts({
      tradingPool: params.tradingPool,
      nodeWallet: new PublicKey(params.nodeWallet),
      operator: params.poolOwner,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions: [instruction],
  }).compileToV0Message();

  return new VersionedTransaction(messageV0);
}

export async function createOffer(
  lavarageProgram: Program<Lavarage> | Program<LavarageV2>,
  params: {
    tradingPool: PublicKey;
    poolOwner: PublicKey;
    nodeWallet: string;
    mint: string;
    interestRate: number;
    maxExposure: number;
    includeCreatePool?: boolean; // Optional flag to include pool creation
  }
): Promise<VersionedTransaction> {
  const { blockhash } =
    await lavarageProgram.provider.connection.getLatestBlockhash("finalized");

  const instructions = [];

  // Optionally include pool creation instruction
  if (params.includeCreatePool) {
    const createPoolInstruction = await lavarageProgram.methods
      .lpOperatorCreateTradingPool(new BN(params.interestRate))
      .accounts({
        tradingPool: params.tradingPool,
        operator: params.poolOwner,
        nodeWallet: new PublicKey(params.nodeWallet),
        mint: new PublicKey(params.mint),
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    instructions.push(createPoolInstruction);
  }

  // Update max exposure instruction
  const updateMaxExposureInstruction = await lavarageProgram.methods
    .lpOperatorUpdateMaxExposure(new BN(params.maxExposure))
    .accounts({
      tradingPool: params.tradingPool,
      nodeWallet: new PublicKey(params.nodeWallet),
      operator: params.poolOwner,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  // Update interest rate instruction
  const updateInterestRateInstruction = await lavarageProgram.methods
    .lpOperatorUpdateInterestRate(new BN(params.interestRate))
    .accounts({
      tradingPool: params.tradingPool,
      nodeWallet: new PublicKey(params.nodeWallet),
      operator: params.poolOwner,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  instructions.push(
    updateMaxExposureInstruction,
    updateInterestRateInstruction
  );

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message();

  return new VersionedTransaction(messageV0);
}

import { BN, Program } from "@coral-xyz/anchor";
import { Lavarage } from "./idl/lavarage";
import { Lavarage as LavarageV2 } from "./idl/lavaragev2";
import {
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { getPda } from "./index";

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

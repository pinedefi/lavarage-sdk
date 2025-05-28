import { BN, Program } from "@coral-xyz/anchor";
import { Lavarage } from "./idl/lavarage";
import { Lavarage as LavarageV2 } from "./idl/lavaragev2";
import bs58 from "bs58";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
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
): Promise<TransactionInstruction> {
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

  return instruction;
}

export async function updateMaxExposure(
  lavarageProgram: Program<Lavarage> | Program<LavarageV2>,
  params: {
    tradingPool: PublicKey;
    nodeWallet: string;
    poolOwner: PublicKey;
    maxExposure: number;
  }
): Promise<TransactionInstruction> {
  const instruction = await lavarageProgram.methods
    .lpOperatorUpdateMaxExposure(new BN(params.maxExposure))
    .accounts({
      tradingPool: params.tradingPool,
      nodeWallet: new PublicKey(params.nodeWallet),
      operator: params.poolOwner,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  return instruction;
}

/**
 * Update interest rate transaction
 */
export async function updateInterestRateTransaction(
  lavarageProgram: Program<Lavarage> | Program<LavarageV2>,
  params: {
    tradingPool: PublicKey;
    nodeWallet: string;
    poolOwner: PublicKey;
    interestRate: number;
  }
): Promise<TransactionInstruction> {
  const instruction = await lavarageProgram.methods
    .lpOperatorUpdateInterestRate(new BN(params.interestRate))
    .accounts({
      tradingPool: params.tradingPool,
      nodeWallet: new PublicKey(params.nodeWallet),
      operator: params.poolOwner,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  return instruction;
}

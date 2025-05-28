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
import { CreateTradingPoolParams } from "./interfaces/sol";

/**
 * Get PDA for trading pool
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

/**
 * Create a trading pool transaction
 */
export async function createTradingPoolTransaction(
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

/**
 * Update max exposure transaction
 */
export async function updateMaxExposureTransaction(
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

/**
 * Update max borrow transaction
 */
export async function updateMaxBorrowTransaction(
  lavarageProgram: Program<Lavarage> | Program<LavarageV2>,
  params: {
    tradingPool: PublicKey;
    nodeWallet: string;
    poolOwner: PublicKey;
    maxBorrow: string;
  }
): Promise<TransactionInstruction> {
  const instruction = await lavarageProgram.methods
    .lpOperatorUpdateMaxBorrow(new BN(params.maxBorrow))
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
 * Create a complete trading pool with all necessary updates
 */
export async function createCompleteTradePool(
  lavarageProgram: Program<Lavarage> | Program<LavarageV2>,
  params: CreateTradingPoolParams,
  oraclePrice?: string
): Promise<{
  tradingPool: PublicKey;
  instructions: TransactionInstruction[];
  poolExists: boolean;
}> {
  const tokenPublicKey = new PublicKey(params.mint);
  const tradingPool = getTradingPoolPDA(
    params.poolOwnerKeypair.publicKey,
    tokenPublicKey,
    lavarageProgram.programId
  );

  // Check if pool already exists
  const poolAccount = await lavarageProgram.provider.connection.getAccountInfo(
    tradingPool
  );
  const poolExists = !!poolAccount?.data;

  const instructions: TransactionInstruction[] = [];

  // Only create pool if it doesn't exist
  if (!poolExists) {
    const createPoolIx = await createTradingPoolTransaction(lavarageProgram, {
      tradingPool,
      poolOwner: params.poolOwnerKeypair.publicKey,
      nodeWallet: params.nodeWallet,
      mint: params.mint,
      interestRate: params.interestRate,
    });
    instructions.push(createPoolIx);
  }

  // Update interest rate (if pool already exists)
  if (poolExists) {
    const updateIrIx = await updateInterestRateTransaction(lavarageProgram, {
      tradingPool,
      nodeWallet: params.nodeWallet,
      poolOwner: params.poolOwnerKeypair.publicKey,
      interestRate: params.interestRate,
    });
    instructions.push(updateIrIx);
  }

  // Update max exposure
  const updateMaxExposureIx = await updateMaxExposureTransaction(
    lavarageProgram,
    {
      tradingPool,
      nodeWallet: params.nodeWallet,
      poolOwner: params.poolOwnerKeypair.publicKey,
      maxExposure: params.maxExposure,
    }
  );
  instructions.push(updateMaxExposureIx);

  // Update max borrow if oracle price is provided
  if (oraclePrice) {
    const currencyLTV = params.ltv / 100;
    const maxBorrow = (
      (BigInt(oraclePrice) * BigInt(Math.floor(currencyLTV * 10000))) /
      BigInt(10000)
    ).toString();

    const updateMaxBorrowIx = await updateMaxBorrowTransaction(
      lavarageProgram,
      {
        tradingPool,
        nodeWallet: params.nodeWallet,
        poolOwner: params.poolOwnerKeypair.publicKey,
        maxBorrow,
      }
    );
    instructions.push(updateMaxBorrowIx);
  }

  return {
    tradingPool,
    instructions,
    poolExists,
  };
}

/**
 * Utility function to create a keypair from a private key string
 */
export function keypairFromPrivateKey(privateKeyString: string): Keypair {
  // Handle different private key formats
  let privateKeyBytes: Uint8Array;

  if (privateKeyString.startsWith("[") && privateKeyString.endsWith("]")) {
    // Array format: [1,2,3,...]
    const keyArray = JSON.parse(privateKeyString);
    privateKeyBytes = new Uint8Array(keyArray);
  } else if (privateKeyString.length === 128) {
    // Hex format
    privateKeyBytes = new Uint8Array(
      privateKeyString.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
    );
  } else {
    // Base58 format
    privateKeyBytes = bs58.decode(privateKeyString);
  }

  return Keypair.fromSecretKey(privateKeyBytes);
}

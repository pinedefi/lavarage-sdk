import { Keypair } from "@solana/web3.js";

import { PublicKey } from "@solana/web3.js";

export interface CreateTradingPoolParams {
  mint: string;
  interestRate: number;
  ltv: number;
  maxExposure: number;
  poolOwnerKeypair: Keypair;
  nodeWallet: string;
}

export interface TradingPoolPDA {
  tradingPool: PublicKey;
  poolOwnerPublicKey: PublicKey;
  tokenPublicKey: PublicKey;
}

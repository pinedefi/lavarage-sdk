import { Keypair } from "@solana/web3.js";

import { PublicKey } from "@solana/web3.js";

export interface TradingPoolPDA {
  tradingPool: PublicKey;
  poolOwnerPublicKey: PublicKey;
  tokenPublicKey: PublicKey;
}

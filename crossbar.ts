import { NATIVE_MINT } from "@solana/spl-token";
import { USDC_MINT } from "./constants";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { getQueue, isMainnetConnection, ON_DEMAND_DEVNET_QUEUE, ON_DEMAND_MAINNET_QUEUE } from "@switchboard-xyz/on-demand";
import { CrossbarClient } from "@switchboard-xyz/common";
import { retryWithBackoff } from "./utils";
import { Lavarage as LavarageSOL } from "./idl/lavarageSOL";
import { Lavarage as LavarageUSDC } from "./idl/lavarageUSDC";

export type ApiKeys = {
  birdeyeApiKey: string;
};

export const SURGE_FEEDS = [
  {
    address: NATIVE_MINT.toBase58(),
    feedId: '0x822512ee9add93518eca1c105a38422841a76c590db079eebb283deb2c14caa9',
    label: 'SOL-USD',
  },
  {
    address: USDC_MINT.toBase58(),
    feedId: '0x883ea8295f70ae506e894679d124196bb07064ea530cefd835b58c33a5ab6549',
    label: 'USDC-USD',
  },
];

// TODO: should not be hardcoded, use class-based approach
const crossbarClient = new CrossbarClient("https://crossbar.switchboard.xyz");

function getVariableOverrides(apiKeys: ApiKeys) {
  return {
    BIRDEYE_API_KEY: apiKeys.birdeyeApiKey,
  };
}

export async function getUpdateOracleIxs(program: Program<LavarageSOL | LavarageUSDC>, feedId: string, payer: PublicKey, apiKeys: ApiKeys): Promise<TransactionInstruction[]> {
  const queue = await getQueue({
    // @ts-expect-error @coral-xyz/anchor versions mismatch
    program,
    queueAddress: await isMainnetConnection(program.provider.connection) ? ON_DEMAND_MAINNET_QUEUE : ON_DEMAND_DEVNET_QUEUE,
  });

  return await retryWithBackoff(async () => await queue.fetchManagedUpdateIxs(
    crossbarClient,
    [feedId],
    {
      numSignatures: 1,
      variableOverrides: getVariableOverrides(apiKeys),
      instructionIdx: 0,
      payer,
    }
  ));
}

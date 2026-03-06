import { ON_DEMAND_DEVNET_QUEUE, getQueue, isMainnetConnection, ON_DEMAND_MAINNET_QUEUE, OracleQuote, Queue, ON_DEMAND_MAINNET_PID, ON_DEMAND_DEVNET_PID } from "@switchboard-xyz/on-demand";
import { queuePubkey } from "./constants";
import { PublicKey } from "@solana/web3.js";
import { SURGE_FEEDS } from "./crossbar";
import { AnchorProvider, Program } from "@coral-xyz/anchor";

export function getOracleQuoteForFeedId(feedId: string) {
  const [oracleQuote] = OracleQuote.getCanonicalPubkey(
    queuePubkey,
    [feedId]
  )

  return oracleQuote;
}

export function getOracleQuoteForCollateralType(collateralType: PublicKey) {
  const feed = SURGE_FEEDS.find(feed => feed.address === collateralType.toBase58());
  
  if (!feed) {
    throw new Error(`Quote feed not found for ${collateralType.toBase58()}`);
  }

  return getOracleQuoteForFeedId(feed.feedId);
}

async function getSwitchboardProgram(provider: AnchorProvider): Promise<Program> {
  const programId = await isMainnetConnection(provider.connection) ? ON_DEMAND_MAINNET_PID : ON_DEMAND_DEVNET_PID;
  
  return Program.at(programId, provider);
}

export async function getSwitchboardQueue(provider: AnchorProvider): Promise<Queue> {
  const program = await getSwitchboardProgram(provider);

  return await getQueue({
    // @ts-expect-error @coral-xyz/anchor versions mismatch
    program,
    queueAddress: await isMainnetConnection(provider.connection) ? ON_DEMAND_MAINNET_QUEUE : ON_DEMAND_DEVNET_QUEUE,
  });
}
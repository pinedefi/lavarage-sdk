import { OracleQuote } from "@switchboard-xyz/on-demand";
import { queuePubkey } from "./constants";
import { PublicKey } from "@solana/web3.js";
import { SURGE_FEEDS } from "./crossbar";

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
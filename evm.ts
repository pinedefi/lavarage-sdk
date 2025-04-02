import {
  BigNumberish,
  Contract,
  ContractTransaction,
  Provider,
  Signer,
  ZeroAddress,
} from "ethers";
import { borrowerOperationsAbi } from "./abi/borrowerOperations";

export interface BorrowerOperationsContract {
  buy(
    buyingCode: string,
    tokenCollateral: string,
    borrowAmount: BigNumberish,
    tokenHolder: string,
    inchRouter: string,
    integratorFeeAddress: string
  ): Promise<ContractTransaction>;
  sell(
    loanId: BigNumberish,
    sellingCode: string,
    tokenHolder: string,
    inchRouter: string,
    integratorFeeAddress: string
  ): Promise<ContractTransaction>;
}

export interface BuyEvent {
  trader: string;
  tokenCollateral: string;
  loanId: bigint;
  openingPositionSize: bigint;
  collateralAmount: bigint;
  initialMargin: bigint;
}

export interface SellEvent {
  trader: string;
  tokenCollateral: string;
  loanId: bigint;
  closingPositionSize: bigint;
  profit: bigint;
}

export interface LiquidationEvent {
  trader: string;
  tokenCollateral: string;
  loanId: bigint;
  closingPositionSize: bigint;
  liquidatorRepaidAmount: bigint;
}

/**
 * Opens a trading position on EVM chain
 * @param signer - Ethers signer
 * @param contractAddress - BorrowerOperations contract address
 * @param params - Trading parameters
 * @returns Transaction object
 */
export const openPositionEvm = async (
  signer: Signer,
  contractAddress: string,
  {
    buyingCode,
    tokenCollateral,
    borrowAmount,
    tokenHolder,
    inchRouter,
    integratorFeeAddress = ZeroAddress,
    buyerContribution,
  }: {
    buyingCode: string;
    tokenCollateral: string;
    borrowAmount: BigNumberish;
    tokenHolder: string;
    inchRouter: string;
    integratorFeeAddress?: string;
    buyerContribution: BigNumberish;
  }
): Promise<ContractTransaction> => {
  const contract = new Contract(contractAddress, borrowerOperationsAbi, signer);

  return contract.buy(
    buyingCode,
    tokenCollateral,
    borrowAmount,
    tokenHolder,
    inchRouter,
    integratorFeeAddress,
    { value: buyerContribution }
  );
};

/**
 * Closes a trading position on EVM chain
 * @param signer - Ethers signer
 * @param contractAddress - BorrowerOperations contract address
 * @param params - Trading parameters
 * @returns Transaction object
 */
export const closePositionEvm = async (
  signer: Signer,
  contractAddress: string,
  {
    loanId,
    sellingCode,
    tokenHolder,
    inchRouter,
    integratorFeeAddress = ZeroAddress,
  }: {
    loanId: BigNumberish;
    sellingCode: string;
    tokenHolder: string;
    inchRouter: string;
    integratorFeeAddress?: string;
  }
): Promise<ContractTransaction> => {
  const contract = new Contract(contractAddress, borrowerOperationsAbi, signer);

  return contract.sell(
    loanId,
    sellingCode,
    tokenHolder,
    inchRouter,
    integratorFeeAddress
  );
};

/**
 * Get all positions from events
 * @param provider - Ethers provider
 * @param contractAddress - BorrowerOperations contract address
 * @param fromBlock - Block to start searching from
 * @returns Array of Buy events representing positions
 */
export async function getPositionsEvm(
  provider: Provider,
  contractAddress: string,
  fromBlock: number = 0
): Promise<BuyEvent[]> {
  const contract = new Contract(
    contractAddress,
    borrowerOperationsAbi,
    provider
  );

  const filter = contract.filters.Buy();
  const events = await contract.queryFilter(filter, fromBlock);

  return events.map((event: any) => {
    const {
      trader,
      tokenCollateral,
      loanId,
      openingPositionSize,
      collateralAmount,
      initialMargin,
    } = event.args as unknown as BuyEvent;
    return {
      trader,
      tokenCollateral,
      loanId,
      openingPositionSize,
      collateralAmount,
      initialMargin,
    };
  });
}

/**
 * Get closed positions from events
 * @param provider - Ethers provider
 * @param contractAddress - BorrowerOperations contract address
 * @param fromBlock - Block to start searching from
 * @returns Array of Sell events representing closed positions
 */
export async function getClosedPositionsEvm(
  provider: Provider,
  contractAddress: string,
  fromBlock: number = 0
): Promise<SellEvent[]> {
  const contract = new Contract(
    contractAddress,
    borrowerOperationsAbi,
    provider
  );

  const filter = contract.filters.Sell();
  const events = await contract.queryFilter(filter, fromBlock);

  return events.map((event: any) => {
    const { trader, tokenCollateral, loanId, closingPositionSize, profit } =
      event.args as unknown as SellEvent;
    return {
      trader,
      tokenCollateral,
      loanId,
      closingPositionSize,
      profit,
    };
  });
}

/**
 * Get liquidated positions from events
 * @param provider - Ethers provider
 * @param contractAddress - BorrowerOperations contract address
 * @param fromBlock - Block to start searching from
 * @returns Array of Liquidation events representing liquidated positions
 */
export async function getLiquidatedPositionsEvm(
  provider: Provider,
  contractAddress: string,
  fromBlock: number = 0
): Promise<LiquidationEvent[]> {
  const contract = new Contract(
    contractAddress,
    borrowerOperationsAbi,
    provider
  );

  const filter = contract.filters.Liquidation();
  const events = await contract.queryFilter(filter, fromBlock);

  return events.map((event: any) => {
    const {
      trader,
      tokenCollateral,
      loanId,
      closingPositionSize,
      liquidatorRepaidAmount,
    } = event.args as unknown as LiquidationEvent;
    return {
      trader,
      tokenCollateral,
      loanId,
      closingPositionSize,
      liquidatorRepaidAmount,
    };
  });
}

import {
  BigNumberish,
  Contract,
  Provider,
  ZeroAddress,
  PopulatedTransaction,
} from "ethers";
import { borrowerOperationsAbi } from "./abi/borrowerOperations";
import { tokenHolderAbi } from "./abi/tokenHolderAbi";
import {
  BuyEvent,
  SellEvent,
  LiquidationEvent,
  Loan,
  Collateral,
} from "./interfaces/evm";

/**
 * Creates an unsigned transaction to open a trading position on EVM chain
 * @param provider - Ethers provider
 * @param borrowerOpsContractAddress - BorrowerOperations contract address
 * @param params - Trading parameters
 * @returns Unsigned transaction object
 */
export const openPositionEvm = async (
  provider: Provider,
  borrowerOpsContractAddress: string,
  {
    buyingCode,
    tokenCollateral,
    borrowAmount,
    tokenHolder,
    inchRouter,
    integratorFeeAddress = ZeroAddress,
    buyerContribution,
    gasLimit,
    gasPrice,
  }: {
    buyingCode: string;
    tokenCollateral: string;
    borrowAmount: BigNumberish;
    tokenHolder: string;
    inchRouter: string;
    integratorFeeAddress?: string;
    buyerContribution: BigNumberish;
    gasLimit?: string | number;
    gasPrice?: string | number;
  }
): Promise<PopulatedTransaction> => {
  const contract = new Contract(
    borrowerOpsContractAddress,
    borrowerOperationsAbi,
    provider
  );

  const txOptions: {
    value: BigNumberish;
    gasLimit?: BigNumberish;
    gasPrice?: BigNumberish;
  } = {
    value: buyerContribution,
  };

  if (gasLimit) txOptions.gasLimit = gasLimit;
  if (gasPrice) txOptions.gasPrice = gasPrice;

  return contract.buy.populateTransaction(
    buyingCode,
    tokenCollateral,
    borrowAmount,
    tokenHolder,
    inchRouter,
    integratorFeeAddress,
    txOptions
  );
};

/**
 * Creates an unsigned transaction to close a trading position on EVM chain
 * @param provider - Ethers provider
 * @param borrowerOpsContractAddress - BorrowerOperations contract address
 * @param params - Trading parameters
 * @returns Unsigned transaction object
 */
export const closePositionEvm = async (
  provider: Provider,
  borrowerOpsContractAddress: string,
  {
    loanId,
    sellingCode,
    tokenHolder,
    inchRouter,
    integratorFeeAddress = ZeroAddress,
    gasLimit,
    gasPrice,
  }: {
    loanId: BigNumberish;
    sellingCode: string;
    tokenHolder: string;
    inchRouter: string;
    integratorFeeAddress?: string;
    gasLimit?: string | number;
    gasPrice?: string | number;
  }
): Promise<PopulatedTransaction> => {
  const contract = new Contract(
    borrowerOpsContractAddress,
    borrowerOperationsAbi,
    provider
  );

  const txOptions: { gasLimit?: BigNumberish; gasPrice?: BigNumberish } = {};

  if (gasLimit) txOptions.gasLimit = gasLimit;
  if (gasPrice) txOptions.gasPrice = gasPrice;

  return contract.sell.populateTransaction(
    loanId,
    sellingCode,
    tokenHolder,
    inchRouter,
    integratorFeeAddress,
    Object.keys(txOptions).length > 0 ? txOptions : {}
  );
};

/**
 * Get all positions from events
 * @param provider - Ethers provider
 * @param borrowerOpsContractAddress - BorrowerOperations contract address
 * @param fromBlock - Block to start searching from
 * @returns Array of Buy events representing positions
 */
export async function getPositionsEvm(
  provider: Provider,
  borrowerOpsContractAddress: string,
  fromBlock: number = 42960845 // block contract was initialized
): Promise<BuyEvent[]> {
  const contract = new Contract(
    borrowerOpsContractAddress,
    borrowerOperationsAbi,
    provider
  );

  const filter = contract.filters.Buy();
  const events = await contract.queryFilter(filter, fromBlock);

  return events.map((event: any) => {
    const {
      buyer,
      tokenCollateral,
      loanId,
      openingPositionSize,
      collateralAmount,
      initialMargin,
    } = event.args as unknown as any;
    
    return {
      trader: buyer,
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
 * @param borrowerOpsContractAddress - BorrowerOperations contract address
 * @param fromBlock - Block to start searching from
 * @returns Array of Sell events representing closed positions
 */
export async function getClosedPositionsEvm(
  provider: Provider,
  borrowerOpsContractAddress: string,
  fromBlock: number = 42960845 // block contract was initialized
): Promise<SellEvent[]> {
  const contract = new Contract(
    borrowerOpsContractAddress,
    borrowerOperationsAbi,
    provider
  );

  const filter = contract.filters.Sell();
  const events = await contract.queryFilter(filter, fromBlock);

  return events.map((event: any) => {
    const { 
      buyer,
      tokenCollateral, 
      loanId, 
      closingPositionSize, 
      profit 
    } = event.args as unknown as any;
    
    return {
      trader: buyer,
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
 * @param borrowerOpsContractAddress - BorrowerOperations contract address
 * @param fromBlock - Block to start searching from
 * @returns Array of Liquidation events representing liquidated positions
 */
export async function getLiquidatedPositionsEvm(
  provider: Provider,
  borrowerOpsContractAddress: string,
  fromBlock: number = 42960845 // block contract was initialized
): Promise<LiquidationEvent[]> {
  const contract = new Contract(
    borrowerOpsContractAddress,
    borrowerOperationsAbi,
    provider
  );

  const filter = contract.filters.Liquidation();
  const events = await contract.queryFilter(filter, fromBlock);

  return events.map((event: any) => {
    const {
      borrower,
      tokenCollateral,
      loanId,
      closingPositionSize,
      liquidatorRepaidAmount,
    } = event.args as unknown as any;
    
    return {
      trader: borrower,
      tokenCollateral,
      loanId,
      closingPositionSize,
      liquidatorRepaidAmount,
    };
  });
}

/**
 * Get a loan by its ID from TokenHolder contract
 * @param provider - Ethers provider
 * @param tokenHolderContractAddress - Address of the TokenHolder contract
 * @param loanId - ID of the loan to retrieve
 * @returns Loan object
 */
export async function getLoanEvm(
  provider: Provider,
  tokenHolderContractAddress: string,
  loanId: BigNumberish
): Promise<Loan> {
  const contract = new Contract(
    tokenHolderContractAddress,
    tokenHolderAbi,
    provider
  );
  return contract.loans(loanId);
}

/**
 * Get all active loans for a user
 * @param provider - Ethers provider
 * @param tokenHolderContractAddress - Address of the TokenHolder contract
 * @param userAddress - Address of the user to get loans for
 * @returns Array of loans belonging to the user
 */
export async function getUserLoansEvm(
  provider: Provider,
  tokenHolderContractAddress: string,
  userAddress: string
): Promise<Loan[]> {
  const contract = new Contract(
    tokenHolderContractAddress,
    tokenHolderAbi,
    provider
  );
  const nextLoanId = await contract.nextLoanId();
  const userLoans: Loan[] = [];

  // Iterate through all loans to find the ones belonging to the user
  for (let i = 0; i < nextLoanId; i++) {
    const loan = await contract.loans(i);
    if (loan.borrower.toLowerCase() === userAddress.toLowerCase()) {
      userLoans.push(loan);
    }
  }

  return userLoans;
}

/**
 * Get collateral information for a specific token
 * @param provider - Ethers provider
 * @param tokenHolderContractAddress - Address of the TokenHolder contract
 * @param collateralAddress - Address of the collateral token
 * @returns Collateral object
 */
export async function getCollateralInfoEvm(
  provider: Provider,
  tokenHolderContractAddress: string,
  collateralAddress: string
): Promise<Collateral> {
  const contract = new Contract(
    tokenHolderContractAddress,
    tokenHolderAbi,
    provider
  );
  return contract.collateralMapping(collateralAddress);
}

/**
 * Get all available collateral information
 * @param provider - Ethers provider
 * @param tokenHolderContractAddress - Address of the TokenHolder contract
 * @param collateralAddresses - Array of collateral token addresses
 * @returns Array of active collaterals
 */
export async function getOffersEvm(
  provider: Provider,
  tokenHolderContractAddress: string,
  collateralAddresses: string[]
): Promise<Array<{ address: string; collateral: Collateral }>> {
  const contract = new Contract(
    tokenHolderContractAddress,
    tokenHolderAbi,
    provider
  );
  const activeCollaterals = [];

  for (const address of collateralAddresses) {
    const collateral = await contract.collateralMapping(address);
    if (collateral.active) {
      activeCollaterals.push({
        address,
        collateral,
      });
    }
  }

  return activeCollaterals;
}
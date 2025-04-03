import {
  BigNumberish,
  Contract,
  ContractTransaction,
  Provider,
  Signer,
  ZeroAddress,
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
 * Opens a trading position on EVM chain
 * @param signer - Ethers signer
 * @param borrowerOpsContractAddress - BorrowerOperations contract address
 * @param params - Trading parameters
 * @returns Transaction object
 */
export const openPositionEvm = async (
  signer: Signer,
  borrowerOpsContractAddress: string,
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
  const contract = new Contract(
    borrowerOpsContractAddress,
    borrowerOperationsAbi,
    signer
  );

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
 * @param borrowerOpsContractAddress - BorrowerOperations contract address
 * @param params - Trading parameters
 * @returns Transaction object
 */
export const closePositionEvm = async (
  signer: Signer,
  borrowerOpsContractAddress: string,
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
  const contract = new Contract(
    borrowerOpsContractAddress,
    borrowerOperationsAbi,
    signer
  );

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
 * @param borrowerOpsContractAddress - BorrowerOperations contract address
 * @param fromBlock - Block to start searching from
 * @returns Array of Buy events representing positions
 */
export async function getPositionsEvm(
  provider: Provider,
  borrowerOpsContractAddress: string,
  fromBlock: number = 0
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
 * @param borrowerOpsContractAddress - BorrowerOperations contract address
 * @param fromBlock - Block to start searching from
 * @returns Array of Sell events representing closed positions
 */
export async function getClosedPositionsEvm(
  provider: Provider,
  borrowerOpsContractAddress: string,
  fromBlock: number = 0
): Promise<SellEvent[]> {
  const contract = new Contract(
    borrowerOpsContractAddress,
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
 * @param borrowerOpsContractAddress - BorrowerOperations contract address
 * @param fromBlock - Block to start searching from
 * @returns Array of Liquidation events representing liquidated positions
 */
export async function getLiquidatedPositionsEvm(
  provider: Provider,
  borrowerOpsContractAddress: string,
  fromBlock: number = 0
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

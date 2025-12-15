import {
  BigNumberish,
  Contract,
  ContractTransaction,
  Provider,
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
 * Creates an unsigned transaction to open a trading position on EVM chain
 * @group EVM
 * @category Trading
 * @param provider - Ethers provider
 * @param borrowerOpsContractAddress - BorrowerOperations contract address
 * @param params - Trading parameters
 * @returns Unsigned transaction object
 * 
 * @example
 * ```typescript
 * const tx = await openPositionEvm(
 *   provider,
 *   "0x123...", // contract address
 *   {
 *     buyingCode: "0x...", // 1inch swap data
 *     tokenCollateral: "0x456...", // USDC address
 *     borrowAmount: ethers.parseEther("2"),
 *     tokenHolder: "0x789...",
 *     inchRouter: "0xabc...",
 *     buyerContribution: ethers.parseEther("1") // 1 ETH margin
 *   }
 * );
 * 
 * const receipt = await signer.sendTransaction(tx);
 * ```
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
): Promise<ContractTransaction> => {
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
 * @group EVM
 * @category Trading
 * @param provider - Ethers provider
 * @param borrowerOpsContractAddress - BorrowerOperations contract address
 * @param params - Trading parameters
 * @returns Unsigned transaction object
 * 
 * @example
 * ```typescript
 * const tx = await closePositionEvm(
 *   provider,
 *   "0x123...", // contract address
 *   {
 *     loanId: 1,
 *     sellingCode: "0x...", // 1inch swap data for selling
 *     tokenHolder: "0x789...",
 *     inchRouter: "0xabc...",
 *     integratorFeeAddress: "0xdef..." // optional
 *   }
 * );
 * 
 * const receipt = await signer.sendTransaction(tx);
 * ```
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
): Promise<ContractTransaction> => {
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
 * Get all positions from active loans
 * @group EVM
 * @category Queries
 * @param provider - Ethers provider
 * @param tokenHolderContractAddress - TokenHolder contract address
 * @returns Array of active positions
 * 
 * @example
 * ```typescript
 * const positions = await getPositionsEvm(
 *   provider,
 *   "0x123..." // TokenHolder address
 * );
 * 
 * console.log(`Found ${positions.length} active positions`);
 * 
 * positions.forEach(pos => {
 *   console.log(`Loan #${pos.loanId}: ${pos.collateralAmount} collateral`);
 * });
 * ```
 */
export async function getPositionsEvm(
  provider: Provider,
  tokenHolderContractAddress: string
): Promise<BuyEvent[]> {
  const contract = new Contract(
    tokenHolderContractAddress,
    tokenHolderAbi,
    provider
  );

  const activeLoanCount = await contract.getActiveLoanCount();
  const batchSize = 100; // Process in batches to avoid gas limits
  const positions: BuyEvent[] = [];

  // Fetch loans in batches
  for (let i = 0; i < activeLoanCount; i += batchSize) {
    const currentBatchSize = Math.min(Number(activeLoanCount) - i, batchSize);
    const loans = await contract.getActiveLoansBatch(i, currentBatchSize);

    // Convert each loan to a BuyEvent format
    for (const loan of loans) {
      positions.push({
        trader: loan.borrower,
        tokenCollateral: loan.collateral.collateralAddress,
        loanId: loan.id,
        openingPositionSize: loan.amount + loan.userPaid,
        collateralAmount: loan.collateralAmount,
        initialMargin: loan.userPaid,
        transactionHash: "", // Not available from loan data
        timestamp: Number(loan.timestamp)
      });
    }
  }

  return positions;
}

/**
 * Get closed positions from events
 * @group EVM
 * @category Queries
 * @param provider - Ethers provider
 * @param borrowerOpsContractAddress - BorrowerOperations contract address
 * @param fromBlock - Block to start searching from
 * @returns Array of Sell events representing closed positions
 * 
 * @example
 * ```typescript
 * const closedPositions = await getClosedPositionsEvm(
 *   provider,
 *   "0x123...", // BorrowerOps address
 *   50000000 // optional: custom start block
 * );
 * 
 * console.log(`Found ${closedPositions.length} closed positions`);
 * 
 * // Check profit/loss
 * closedPositions.forEach(pos => {
 *   console.log(`Loan #${pos.loanId}: ${pos.profit > 0 ? 'Profit' : 'Loss'}`);
 * });
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

  const currentBlock = await provider.getBlockNumber();
  const filter = contract.filters.Sell();
  const allEvents: any[] = [];
  
  // Query in chunks of 10,000 blocks
  for (let start = fromBlock; start <= currentBlock; start += 10000) {
    const end = Math.min(start + 9999, currentBlock);
    const events = await contract.queryFilter(filter, start, end);
    allEvents.push(...events);
  }

  return Promise.all(
    allEvents.map(async (event: any) => {
      const { buyer, tokenHolder, tokenCollateral, loanId, closingPositionSize, profit } =
        event.args as unknown as any;

      const block = await provider.getBlock(event.blockNumber);
      const timestamp = block ? Number(block.timestamp) : 0;

      return {
        trader: buyer,
        tokenCollateral: tokenHolder,
        loanId,
        closingPositionSize,
        profit,
        transactionHash: event.transactionHash,
        timestamp,
      };
    })
  );
}

/**
 * Get liquidated positions from events
 * @group EVM
 * @category Queries
 * @param provider - Ethers provider
 * @param borrowerOpsContractAddress - BorrowerOperations contract address
 * @param fromBlock - Block to start searching from
 * @returns Array of Liquidation events representing liquidated positions
 * @example
 * ```typescript
 * const liquidations = await getLiquidatedPositionsEvm(
 *   provider,
 *   "0x123...", // BorrowerOps address
 *   50000000 // optional: custom start block
 * );
 * 
 * console.log(`Found ${liquidations.length} liquidated positions`);
 * 
 * // Analyze liquidation data
 * liquidations.forEach(liq => {
 *   console.log(`Loan #${liq.loanId}: liquidated ${liq.closingPositionSize}`);
 *   console.log(`Liquidator repaid: ${liq.liquidatorRepaidAmount}`);
 * });
 * ```
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

  const currentBlock = await provider.getBlockNumber();
  const filter = contract.filters.Liquidation();
  const allEvents: any[] = [];
  
  // Query in chunks of 10,000 blocks
  for (let start = fromBlock; start <= currentBlock; start += 10000) {
    const end = Math.min(start + 9999, currentBlock);
    const events = await contract.queryFilter(filter, start, end);
    allEvents.push(...events);
  }

  return Promise.all(
    allEvents.map(async (event: any) => {
      const {
        borrower,
        tokenCollateral,
        loanId,
        closingPositionSize,
        liquidatorRepaidAmount,
      } = event.args as unknown as any;

      const block = await provider.getBlock(event.blockNumber);
      const timestamp = block ? Number(block.timestamp) : 0;

      return {
        trader: borrower,
        tokenCollateral,
        loanId,
        closingPositionSize,
        liquidatorRepaidAmount,
        transactionHash: event.transactionHash,
        timestamp,
      };
    })
  );
}

/**
 * Get a loan by its ID from TokenHolder contract
 * @group EVM
 * @category Queries
 * @param provider - Ethers provider
 * @param tokenHolderContractAddress - Address of the TokenHolder contract
 * @param loanId - ID of the loan to retrieve
 * @returns Loan object
 * 
 * @example
 * ```typescript
 * const loan = await getLoanEvm(
 *   provider,
 *   "0x123...", // TokenHolder address
 *   42 // loan ID
 * );
 * 
 * console.log(`Loan #${loan.id}`);
 * console.log(`Borrower: ${loan.borrower}`);
 * console.log(`Amount: ${loan.amount}`);
 * console.log(`Collateral: ${loan.collateralAmount}`);
 * ```
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
 * @group EVM
 * @category Queries
 * @param provider - Ethers provider
 * @param tokenHolderContractAddress - Address of the TokenHolder contract
 * @param userAddress - Address of the user to get loans for
 * @returns Array of loans belonging to the user
 * 
 * @example
 * ```typescript
 * const userLoans = await getUserLoansEvm(
 *   provider,
 *   "0x123...", // TokenHolder address
 *   "0x456..." // user address
 * );
 * 
 * console.log(`User has ${userLoans.length} active loans`);
 * 
 * userLoans.forEach(loan => {
 *   console.log(`Loan #${loan.id}: ${loan.amount} borrowed`);
 * });
 * ```
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
 * @group EVM
 * @category Queries
 * @param provider - Ethers provider
 * @param tokenHolderContractAddress - Address of the TokenHolder contract
 * @param collateralAddress - Address of the collateral token
 * @returns Collateral object
 * 
 * @example
 * ```typescript
 * const collateralInfo = await getCollateralInfoEvm(
 *   provider,
 *   "0x123...", // TokenHolder address
 *   "0x456..." // USDC or other collateral token address
 * );
 * 
 * console.log(`Collateral: ${collateralInfo.symbol}`);
 * console.log(`Max LTV: ${collateralInfo.maxLTV}`);
 * console.log(`Liquidation threshold: ${collateralInfo.liquidationThreshold}`);
 * ```
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
 * @group EVM
 * @category Queries
 * @param provider - Ethers provider
 * @param tokenHolderContractAddress - Address of the TokenHolder contract
 * @param collateralAddresses - Array of collateral token addresses
 * @returns Array of active collaterals
 * 
 * @example
 * ```typescript
 * const collaterals = await getOffersEvm(
 *   provider,
 *   "0x123...", // TokenHolder address
 *   ["0x456...", "0x789...", "0xabc..."] // token addresses to check
 * );
 * 
 * console.log(`Found ${collaterals.length} available collaterals`);
 * 
 * collaterals.forEach(({ address, collateral }) => {
 *   console.log(`Token ${address}: LTV ${collateral.maxLTV}%`);
 * });
 * ```
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
    //if (collateral.active) {
    activeCollaterals.push({
      address,
      collateral,
    });
    //}
  }

  return activeCollaterals;
}

/**
 * Get the opening fee percentage
 * @group EVM
 * @category Queries
 * @param provider - Ethers provider
 * @param borrowerOpsContractAddress - BorrowerOperations contract address
 * @returns Opening fee as a BigNumber
 * 
 * @example
 * ```typescript
 * const openingFee = await getOpeningFeeEvm(
 *   provider,
 *   "0x123..." // BorrowerOps address
 * );
 * 
 * // Convert to percentage (assuming 18 decimals)
 * const feePercent = Number(openingFee) / 1e16; // e.g., 0.5%
 * console.log(`Opening fee: ${feePercent}%`);
 * ```
 */
export async function getOpeningFeeEvm(
  provider: Provider,
  borrowerOpsContractAddress: string
): Promise<bigint> {
  const contract = new Contract(
    borrowerOpsContractAddress,
    borrowerOperationsAbi,
    provider
  );
  return contract.openingFee();
}

/**
 * Get the profit fee percentage
 * @group EVM
 * @category Queries
 * @param provider - Ethers provider
 * @param borrowerOpsContractAddress - BorrowerOperations contract address
 * @returns Profit fee as a BigNumber
 * 
 * @example
 * ```typescript
 * const profitFee = await getProfitFeeEvm(
 *   provider,
 *   "0x123..." // BorrowerOps address
 * );
 * 
 * // Convert to percentage (assuming 18 decimals)
 * const feePercent = Number(profitFee) / 1e16; // e.g., 1%
 * console.log(`Profit fee: ${feePercent}%`);
 * ```
 */
export async function getProfitFeeEvm(
  provider: Provider,
  borrowerOpsContractAddress: string
): Promise<bigint> {
  const contract = new Contract(
    borrowerOpsContractAddress,
    borrowerOperationsAbi,
    provider
  );
  return contract.profitFee();
}

/**
 * Get the token balance of the token holder contract
 * @group EVM
 * @category Queries
 * @param provider - Ethers provider
 * @param tokenHolderContractAddress - Address of the TokenHolder contract
 * @returns Token balance as a BigNumber
 * 
 * @example
 * ```typescript
 * const balance = await getTokenBalanceEvm(
 *   provider,
 *   "0x123..." // TokenHolder address
 * );
 * 
 * // Format for display (assuming 18 decimals)
 * const formatted = ethers.formatEther(balance);
 * console.log(`Contract balance: ${formatted} ETH`);
 * ```
 */
export async function getTokenBalanceEvm(
  provider: Provider,
  tokenHolderContractAddress: string
): Promise<bigint> {
  const contract = new Contract(
    tokenHolderContractAddress,
    tokenHolderAbi,
    provider
  );
  return contract.getBalance();
}

/**
 * Get the active loan count
 * @group EVM
 * @category Queries
 * @param provider - Ethers provider
 * @param tokenHolderContractAddress - Address of the TokenHolder contract
 * @returns Number of active loans
 * 
 * @example
 * ```typescript
 * const loanCount = await getActiveLoanCountEvm(
 *   provider,
 *   "0x123..." // TokenHolder address
 * );
 * 
 * console.log(`Total active loans: ${loanCount}`);
 * 
 * // Use for statistics or monitoring
 * if (loanCount > 1000n) {
 *   console.log("High activity detected");
 * }
 * ```
 */
export async function getActiveLoanCountEvm(
  provider: Provider,
  tokenHolderContractAddress: string
): Promise<bigint> {
  const contract = new Contract(
    tokenHolderContractAddress,
    tokenHolderAbi,
    provider
  );
  return contract.getActiveLoanCount();
}

/**
 * Get a batch of active loans
 * @group EVM
 * @category Queries
 * @param provider - Ethers provider
 * @param tokenHolderContractAddress - Address of the TokenHolder contract
 * @param startIndex - Starting index in the activeLoanIds array
 * @param batchSize - Number of loans to retrieve
 * @returns Array of active loans
 * 
 * @example
 * ```typescript
 * const loans = await getActiveLoansBatchEvm(
 *   provider,
 *   "0x123...", // TokenHolder address
 *   0, // start from first loan
 *   100 // get 100 loans
 * );
 * 
 * console.log(`Retrieved ${loans.length} loans`);
 * 
 * // Process batch
 * loans.forEach(loan => {
 *   console.log(`Loan #${loan.id}: ${loan.borrower}`);
 * });
 * ```
 */
export async function getActiveLoansBatchEvm(
  provider: Provider,
  tokenHolderContractAddress: string,
  startIndex: BigNumberish,
  batchSize: BigNumberish
): Promise<Loan[]> {
  const contract = new Contract(
    tokenHolderContractAddress,
    tokenHolderAbi,
    provider
  );
  return contract.getActiveLoansBatch(startIndex, batchSize);
}

/**
 * Get all loans for a specific borrower
 * @group EVM
 * @category Queries
 * @param provider - Ethers provider
 * @param tokenHolderContractAddress - Address of the TokenHolder contract
 * @param borrowerAddress - Address of the borrower
 * @returns Array of loans belonging to the borrower
 * 
 * @example
 * ```typescript
 * const userLoans = await getLoansByBorrowerEvm(
 *   provider,
 *   "0x123...", // TokenHolder address
 *   "0x456..." // borrower address
 * );
 * 
 * console.log(`Borrower has ${userLoans.length} loans`);
 * 
 * userLoans.forEach(loan => {
 *   console.log(`Loan #${loan.id}: ${loan.collateralAmount} collateral`);
 * });
 * ```
 */
export async function getLoansByBorrowerEvm(
  provider: Provider,
  tokenHolderContractAddress: string,
  borrowerAddress: string
): Promise<Loan[]> {
  const contract = new Contract(
    tokenHolderContractAddress,
    tokenHolderAbi,
    provider
  );
  return contract.getLoansByBorrower(borrowerAddress);
}

/**
 * Get current exposure for a collateral
 * @group EVM
 * @category Queries
 * @param provider - Ethers provider
 * @param tokenHolderContractAddress - Address of the TokenHolder contract
 * @param collateralAddress - Address of the collateral token
 * @returns Current exposure as a BigNumber
 * 
 * @example
 * ```typescript
 * const exposure = await getCollateralExposureEvm(
 *   provider,
 *   "0x123...", // TokenHolder address
 *   "0x456..." // collateral token address
 * );
 * 
 * console.log(`Current exposure: ${ethers.formatEther(exposure)}`);
 * 
 * // Check if near limit
 * const maxExposure = 1000000n;
 * if (exposure > maxExposure * 90n / 100n) {
 *   console.log("Warning: 90% exposure reached");
 * }
 * ```
 */
export async function getCollateralExposureEvm(
  provider: Provider,
  tokenHolderContractAddress: string,
  collateralAddress: string
): Promise<bigint> {
  const contract = new Contract(
    tokenHolderContractAddress,
    tokenHolderAbi,
    provider
  );
  return contract.getCollateralExposure(collateralAddress);
}

/**
 * Get available exposure for a collateral
 * @group EVM
 * @category Queries
 * @param provider - Ethers provider
 * @param tokenHolderContractAddress - Address of the TokenHolder contract
 * @param collateralAddress - Address of the collateral token
 * @returns Available exposure as a BigNumber
 * 
 * @example
 * ```typescript
 * const available = await getAvailableExposureEvm(
 *   provider,
 *   "0x123...", // TokenHolder address
 *   "0x456..." // collateral token address
 * );
 * 
 * console.log(`Available exposure: ${ethers.formatEther(available)}`);
 * 
 * // Check if can open new position
 * const newPositionSize = ethers.parseEther("10");
 * if (available >= newPositionSize) {
 *   console.log("Sufficient exposure available");
 * }
 * ```
 */
export async function getAvailableExposureEvm(
  provider: Provider,
  tokenHolderContractAddress: string,
  collateralAddress: string
): Promise<bigint> {
  const contract = new Contract(
    tokenHolderContractAddress,
    tokenHolderAbi,
    provider
  );
  return contract.getAvailableExposure(collateralAddress);
}

/**
 * Update max lend per token for multiple collaterals in batch
 * @group EVM
 * @category Operations
 * @param provider - Ethers provider
 * @param tokenHolderContractAddress - Address of the TokenHolder contract
 * @param collateralAddresses - Array of collateral token addresses
 * @param newMaxLendPerTokens - Array of new max lend per token values
 * @param gasLimit - Optional gas limit
 * @param gasPrice - Optional gas price
 * @returns Unsigned transaction object
 * 
 * @example
 * ```typescript
 * const tx = await updateMaxLendPerTokenBatchEvm(
 *   provider,
 *   "0x123...", // TokenHolder address
 *   {
 *     collateralAddresses: ["0x456...", "0x789..."],
 *     newMaxLendPerTokens: [
 *       ethers.parseEther("1000"),
 *       ethers.parseEther("500")
 *     ]
 *   }
 * );
 * 
 * const receipt = await signer.sendTransaction(tx);
 * console.log("Max lend limits updated");
 * ```
 */
export const updateMaxLendPerTokenBatchEvm = async (
  provider: Provider,
  tokenHolderContractAddress: string,
  {
    collateralAddresses,
    newMaxLendPerTokens,
    gasLimit,
    gasPrice,
  }: {
    collateralAddresses: string[];
    newMaxLendPerTokens: BigNumberish[];
    gasLimit?: string | number;
    gasPrice?: string | number;
  }
): Promise<ContractTransaction> => {
  const contract = new Contract(
    tokenHolderContractAddress,
    tokenHolderAbi,
    provider
  );

  const txOptions: { gasLimit?: BigNumberish; gasPrice?: BigNumberish } = {};

  if (gasLimit) txOptions.gasLimit = gasLimit;
  if (gasPrice) txOptions.gasPrice = gasPrice;

  return contract.updateMaxLendPerTokenBulk.populateTransaction(
    collateralAddresses,
    newMaxLendPerTokens,
    Object.keys(txOptions).length > 0 ? txOptions : {}
  );
};

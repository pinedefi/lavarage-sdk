import { Block } from "ethers";

export interface Collateral {
  collateralAddress: string;
  maxLendPerToken: bigint;
  interestRate: bigint;
  active: boolean;
  minAmount: bigint;
  maxExposure: bigint;
  currentExposure: bigint;
}

export interface Loan {
  id: bigint;
  amount: bigint;
  collateral: Collateral;
  collateralAmount: bigint;
  timestamp: bigint;
  borrower: string;
  userPaid: bigint;
}

export interface BuyEvent {
  trader: string;
  tokenCollateral: string;
  loanId: bigint;
  openingPositionSize: bigint;
  collateralAmount: bigint;
  initialMargin: bigint;
  transactionHash: string;
  timestamp: number;
}

export interface SellEvent {
  trader: string;
  tokenCollateral: string;
  loanId: bigint;
  closingPositionSize: bigint;
  profit: bigint;
  transactionHash: string;
  timestamp: number;
}

export interface LiquidationEvent {
  trader: string;
  tokenCollateral: string;
  loanId: bigint;
  closingPositionSize: bigint;
  liquidatorRepaidAmount: bigint;
  transactionHash: string;
  timestamp: number;
}

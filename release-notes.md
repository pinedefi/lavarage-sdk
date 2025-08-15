# @lavarage/sdk

## 7.0.0

### Major Changes

- Added support for withdrawal access list management
  - New functions:
    - `addToWithdrawalAccessList`: Adds a public key to the withdrawal access list for a node wallet
    - `removeFromWithdrawalAccessList`: Removes a public key from the withdrawal access list for a node wallet
    - `getWithdrawalAccessListPDA`: Gets the PDA for the withdrawal access list
  - These functions allow node wallet operators to control which addresses can withdraw funds

### Minor Changes

- Updated dependencies
  - `@coral-xyz/anchor` to 0.29.0
  - `@solana/web3.js` to 1.98.0
  - Added `ethers` v6.13.5

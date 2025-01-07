import { BN, Program, ProgramAccount } from '@coral-xyz/anchor'
import { Lavarage } from './idl/lavarage'
import { Lavarage as LavarageV2 } from './idl/lavaragev2'
import bs58 from 'bs58'
import { AddressLookupTableAccount, Keypair, PublicKey, SystemProgram, SYSVAR_CLOCK_PUBKEY, SYSVAR_INSTRUCTIONS_PUBKEY, Transaction, TransactionInstruction, TransactionMessage, VersionedTransaction } from '@solana/web3.js'
import { ASSOCIATED_TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction, getAccount, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, TokenAccountNotFoundError, TokenInvalidAccountOwnerError } from '@solana/spl-token'


export function getPda(seed: Buffer | Buffer[], programId: PublicKey) {
  const seedsBuffer = Array.isArray(seed) ? seed : [seed]

  return PublicKey.findProgramAddressSync(seedsBuffer, programId)[0]
}

export function getPositionAccountPDA(lavarageProgram: Program<Lavarage> | Program<LavarageV2>, offer: ProgramAccount, seed: PublicKey) {
  return getPda([Buffer.from('position'), lavarageProgram.provider.publicKey!.toBuffer(), offer.publicKey.toBuffer(), seed.toBuffer()], lavarageProgram.programId)
}

async function getTokenAccountOrCreateIfNotExists(lavarageProgram: Program<Lavarage> | Program<LavarageV2>, ownerPublicKey: PublicKey, tokenAddress: PublicKey) {
  const associatedTokenAddress = getAssociatedTokenAddressSync(tokenAddress, ownerPublicKey, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID)

  try {
    const tokenAccount = await getAccount(lavarageProgram.provider.connection, associatedTokenAddress, 'finalized')
    return { account: tokenAccount, instruction: null }
  }
  catch (error) {
    if (error instanceof TokenAccountNotFoundError || error instanceof TokenInvalidAccountOwnerError) {
      const instruction = createAssociatedTokenAccountInstruction(
        lavarageProgram.provider.publicKey!,
        associatedTokenAddress,
        ownerPublicKey,
        tokenAddress,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      )

      return {
        account: {
          address: associatedTokenAddress,
        },
        instruction,
      }
    }
    else {
      console.error('Error in getTokenAccountOrCreateIfNotExists: ', error)

      return { account: null, instruction: null }
    }
  }
}


export * from './idl/lavarage'
export const getOffers = (lavarageProgram: Program<Lavarage> | Program<LavarageV2>) => {
  return lavarageProgram.account.pool.all()
}

export const getOpenPositions = (lavarageProgram: Program<Lavarage> | Program<LavarageV2>) => {
  return lavarageProgram.account.position.all([{ dataSize: 178 },
  {
    memcmp: {
      offset: 40,
      bytes: bs58.encode(new Uint8Array(8)),
    },
  },])
}

export const getClosedPositions = async (lavarageProgram: Program<Lavarage> | Program<LavarageV2>) => {
  const value = BigInt(9997)
  const valueBuffer = Buffer.alloc(8)
  valueBuffer.writeBigUInt64LE(value)
  const value2 = BigInt(9998)
  const valueBuffer2 = Buffer.alloc(8)
  valueBuffer2.writeBigUInt64LE(value2)
  return (await lavarageProgram.account.position.all([{ dataSize: 178 },
  {
    memcmp: {
      offset: 40,
      bytes: bs58.encode(Uint8Array.from(valueBuffer)),
    },
  },])).concat(await lavarageProgram.account.position.all([{ dataSize: 178 },
  {
    memcmp: {
      offset: 40,
      bytes: bs58.encode(Uint8Array.from(valueBuffer2)),
    },
  },]))
}

export const getLiquidatedPositions = (lavarageProgram: Program<Lavarage> | Program<LavarageV2>) => {
  const value = BigInt(9999)
  const valueBuffer = Buffer.alloc(8)
  valueBuffer.writeBigUInt64LE(value)
  return lavarageProgram.account.position.all([{ dataSize: 178 },
  {
    memcmp: {
      offset: 40,
      bytes: bs58.encode(Uint8Array.from(valueBuffer)),
    },
  },])
}

export const getAllPositions = (lavarageProgram: Program<Lavarage> | Program<LavarageV2>) => {
  return lavarageProgram.account.position.all([{ dataSize: 178 },
  ])
}

export const openTradeV1 = async (lavarageProgram: Program<Lavarage>, offer: ProgramAccount<{
  nodeWallet: PublicKey,
  interestRate: number,
  collateralType: PublicKey,
}>, jupInstruction: {
  instructions: {
    setupInstructions: Record<string, unknown>[]
    swapInstruction: Record<string, unknown>
    addressLookupTableAddresses: string[]
  }
}, marginSOL: BN, leverage: number, randomSeed: Keypair, partnerFeeRecipient?: PublicKey) => {
  // assuming all token accounts are created prior
  const positionAccount = getPositionAccountPDA(lavarageProgram, offer, randomSeed.publicKey)
  const fromTokenAccount = await getTokenAccountOrCreateIfNotExists(lavarageProgram, lavarageProgram.provider.publicKey!, offer.account.collateralType)

  const toTokenAccount = await getTokenAccountOrCreateIfNotExists(lavarageProgram, positionAccount, offer.account.collateralType)

  const tokenAccountCreationTx = new Transaction()

  if (fromTokenAccount.instruction) {
    tokenAccountCreationTx.add(fromTokenAccount.instruction)
  }

  if (toTokenAccount.instruction) {
    tokenAccountCreationTx.add(toTokenAccount.instruction)
  }

  const instructionsJup = jupInstruction.instructions

  const { setupInstructions, swapInstruction: swapInstructionPayload, addressLookupTableAddresses } = instructionsJup

  const deserializeInstruction = (instruction: any) => {
    return new TransactionInstruction({
      programId: new PublicKey(instruction.programId),

      keys: instruction.accounts.map((key: any) => ({
        pubkey: new PublicKey(key.pubkey),
        isSigner: key.isSigner,
        isWritable: key.isWritable,
      })),
      data: Buffer.from(instruction.data, 'base64'),
    })
  }

  const getAddressLookupTableAccounts = async (keys: string[]): Promise<AddressLookupTableAccount[]> => {
    const addressLookupTableAccountInfos = await lavarageProgram.provider.connection.getMultipleAccountsInfo(keys.map(key => new PublicKey(key)))

    return addressLookupTableAccountInfos.reduce((acc, accountInfo, index) => {
      const addressLookupTableAddress = keys[index]
      if (accountInfo) {
        const addressLookupTableAccount = new AddressLookupTableAccount({
          key: new PublicKey(addressLookupTableAddress),
          state: AddressLookupTableAccount.deserialize(Uint8Array.from(accountInfo.data)),
        })
        acc.push(addressLookupTableAccount)
      }

      return acc
    }, new Array<AddressLookupTableAccount>())
  }

  const addressLookupTableAccounts: AddressLookupTableAccount[] = []

  addressLookupTableAccounts.push(...(await getAddressLookupTableAccounts(addressLookupTableAddresses)))

  const { blockhash } = await lavarageProgram.provider.connection.getLatestBlockhash('finalized')

  const tradingOpenBorrowInstruction = await lavarageProgram.methods
    .tradingOpenBorrow(new BN((marginSOL.toNumber()*leverage).toFixed(0)), marginSOL)
    .accountsStrict({
      nodeWallet: offer.account.nodeWallet,
      instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
      tradingPool: offer.publicKey,
      positionAccount,
      trader: lavarageProgram.provider.publicKey!,
      systemProgram: SystemProgram.programId,
      clock: SYSVAR_CLOCK_PUBKEY,
      randomAccountAsId: randomSeed.publicKey.toBase58(),
      feeReceipient: '6JfTobDvwuwZxZP6FR5JPmjdvQ4h4MovkEVH2FPsMSrF',
    }).remainingAccounts(partnerFeeRecipient ? [{
      pubkey: partnerFeeRecipient,
      isSigner: false,
      isWritable: true,
    }] : [])
    .instruction()

  const openAddCollateralInstruction = await lavarageProgram.methods
    .tradingOpenAddCollateral(offer.account.interestRate)
    .accountsStrict({
      tradingPool: offer.publicKey,
      trader: lavarageProgram.provider.publicKey!,
      mint: offer.account.collateralType,
      toTokenAccount: toTokenAccount.account!.address,
      systemProgram: SystemProgram.programId,
      positionAccount,
      randomAccountAsId: randomSeed.publicKey.toBase58(),
    })
    .instruction()

  const jupiterIxs = [
    ...setupInstructions.map(deserializeInstruction),
    deserializeInstruction(swapInstructionPayload),
  ]

  const allInstructions = [
    fromTokenAccount.instruction!,
    toTokenAccount.instruction!,
    tradingOpenBorrowInstruction!,
    ...jupiterIxs,
    openAddCollateralInstruction!,
  ].filter(Boolean)

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions: allInstructions,
  }).compileToV0Message(addressLookupTableAccounts)

  const tx = new VersionedTransaction(messageV0)

  return tx
}

export const openTradeV2 = async (lavarageProgram: Program<LavarageV2>, offer: ProgramAccount<{
  nodeWallet: PublicKey,
  interestRate: number,
  collateralType: PublicKey,
}>, jupInstruction: {
  instructions: {
    setupInstructions: Record<string, unknown>[]
    swapInstruction: Record<string, unknown>
    addressLookupTableAddresses: string[]
  }
}, marginSOL: BN, leverage: number, randomSeed: Keypair, quoteToken: PublicKey, partnerFeeRecipient?: PublicKey) => {
  // assuming all token accounts are created prior
  const positionAccount = getPositionAccountPDA(lavarageProgram, offer, randomSeed.publicKey)
  const fromTokenAccount = await getTokenAccountOrCreateIfNotExists(lavarageProgram, lavarageProgram.provider.publicKey!, offer.account.collateralType)

  const toTokenAccount = await getTokenAccountOrCreateIfNotExists(lavarageProgram, positionAccount, offer.account.collateralType)

  const tokenAccountCreationTx = new Transaction()

  if (fromTokenAccount.instruction) {
    tokenAccountCreationTx.add(fromTokenAccount.instruction)
  }

  if (toTokenAccount.instruction) {
    tokenAccountCreationTx.add(toTokenAccount.instruction)
  }

  const instructionsJup = jupInstruction.instructions

  const { setupInstructions, swapInstruction: swapInstructionPayload, addressLookupTableAddresses } = instructionsJup

  const deserializeInstruction = (instruction: any) => {
    return new TransactionInstruction({
      programId: new PublicKey(instruction.programId),

      keys: instruction.accounts.map((key: any) => ({
        pubkey: new PublicKey(key.pubkey),
        isSigner: key.isSigner,
        isWritable: key.isWritable,
      })),
      data: Buffer.from(instruction.data, 'base64'),
    })
  }

  const getAddressLookupTableAccounts = async (keys: string[]): Promise<AddressLookupTableAccount[]> => {
    const addressLookupTableAccountInfos = await lavarageProgram.provider.connection.getMultipleAccountsInfo(keys.map(key => new PublicKey(key)))

    return addressLookupTableAccountInfos.reduce((acc, accountInfo, index) => {
      const addressLookupTableAddress = keys[index]
      if (accountInfo) {
        const addressLookupTableAccount = new AddressLookupTableAccount({
          key: new PublicKey(addressLookupTableAddress),
          state: AddressLookupTableAccount.deserialize(Uint8Array.from(accountInfo.data)),
        })
        acc.push(addressLookupTableAccount)
      }

      return acc
    }, new Array<AddressLookupTableAccount>())
  }

  const addressLookupTableAccounts: AddressLookupTableAccount[] = []

  addressLookupTableAccounts.push(...(await getAddressLookupTableAccounts(addressLookupTableAddresses)))

  const { blockhash } = await lavarageProgram.provider.connection.getLatestBlockhash('finalized')

  const tradingOpenBorrowInstruction = await lavarageProgram.methods
    .tradingOpenBorrow(new BN((marginSOL.toNumber()*leverage).toFixed(0)), marginSOL)
    .accountsStrict({
      nodeWallet: offer.account.nodeWallet,
      instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
      tradingPool: offer.publicKey,
      positionAccount,
      trader: lavarageProgram.provider.publicKey!,
      systemProgram: SystemProgram.programId,
      clock: SYSVAR_CLOCK_PUBKEY,
      randomAccountAsId: randomSeed.publicKey.toBase58(),
      feeTokenAccount: getAssociatedTokenAddressSync(quoteToken, new PublicKey('6JfTobDvwuwZxZP6FR5JPmjdvQ4h4MovkEVH2FPsMSrF')),
      toTokenAccount: getAssociatedTokenAddressSync(quoteToken, lavarageProgram.provider.publicKey!),
      tokenProgram: TOKEN_PROGRAM_ID,
      fromTokenAccount: getAssociatedTokenAddressSync(quoteToken, offer.account.nodeWallet),
    }).remainingAccounts(partnerFeeRecipient ? [{
      pubkey: partnerFeeRecipient,
      isSigner: false,
      isWritable: true,
    }] : [])
    .instruction()

  const openAddCollateralInstruction = await lavarageProgram.methods
    .tradingOpenAddCollateral(offer.account.interestRate)
    .accountsStrict({
      tradingPool: offer.publicKey,
      trader: lavarageProgram.provider.publicKey!,
      mint: offer.account.collateralType,
      toTokenAccount: toTokenAccount.account!.address,
      systemProgram: SystemProgram.programId,
      positionAccount,
      randomAccountAsId: randomSeed.publicKey.toBase58(),
    })
    .instruction()

  const jupiterIxs = [
    ...setupInstructions.map(deserializeInstruction),
    deserializeInstruction(swapInstructionPayload),
  ]

  const allInstructions = [
    fromTokenAccount.instruction!,
    toTokenAccount.instruction!,
    tradingOpenBorrowInstruction!,
    ...jupiterIxs,
    openAddCollateralInstruction!,
  ].filter(Boolean)

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions: allInstructions,
  }).compileToV0Message(addressLookupTableAccounts)

  const tx = new VersionedTransaction(messageV0)

  return tx
}

export const closeTradeV1 = async (lavarageProgram: Program<Lavarage>, position: ProgramAccount<{
  pool: PublicKey,
  seed: PublicKey,
  userPaid: BN,
  amount: BN,
}>, offer: ProgramAccount<{
  nodeWallet: PublicKey,
  interestRate: number,
  collateralType: PublicKey,
}>, jupInstruction: {
  instructions?: {
    setupInstructions: Record<string, unknown>[]
    swapInstruction: Record<string, unknown>
    cleanupInstruction: Record<string, unknown>
    addressLookupTableAddresses: string[]
  },
  quoteResponse: any
}, partnerFeeRecipient?: PublicKey, profitFeeMarkup?: number) => {
  if (position.account.pool.toBase58() != offer.publicKey.toBase58()) throw "Mismatch offer"
  const pool = offer
  const poolPubKey = offer.publicKey

  const tokenAddressPubKey = new PublicKey(offer.account.collateralType)

  const positionAccountPDA = position.publicKey

  const fromTokenAccount = await getTokenAccountOrCreateIfNotExists(lavarageProgram, positionAccountPDA, tokenAddressPubKey)

  const toTokenAccount = await getTokenAccountOrCreateIfNotExists(lavarageProgram, lavarageProgram.provider.publicKey!, tokenAddressPubKey)

  const jupiterSellIx = jupInstruction!.instructions

  
  const deserializeInstruction = (instruction: any) => {
    return new TransactionInstruction({
      programId: new PublicKey(instruction.programId),

      keys: instruction.accounts.map((key: any) => ({
        pubkey: new PublicKey(key.pubkey),
        isSigner: key.isSigner,
        isWritable: key.isWritable,
      })),
      data: Buffer.from(instruction.data, 'base64'),
    })
  }

  const getAddressLookupTableAccounts = async (keys: string[]): Promise<AddressLookupTableAccount[]> => {
    const addressLookupTableAccountInfos = await lavarageProgram.provider.connection.getMultipleAccountsInfo(keys.map(key => new PublicKey(key)))

    return addressLookupTableAccountInfos.reduce((acc, accountInfo, index) => {
      const addressLookupTableAddress = keys[index]
      if (accountInfo) {
        const addressLookupTableAccount = new AddressLookupTableAccount({
          key: new PublicKey(addressLookupTableAddress),
          state: AddressLookupTableAccount.deserialize(Uint8Array.from(accountInfo.data)),
        })
        acc.push(addressLookupTableAccount)
      }

      return acc
    }, new Array<AddressLookupTableAccount>())
  }

  const addressLookupTableAccounts: AddressLookupTableAccount[] = []

  

  const { blockhash } = await lavarageProgram.provider.connection.getLatestBlockhash('finalized')

  

  const closePositionIx = await lavarageProgram.methods
    .tradingCloseBorrowCollateral()
    .accountsStrict({
      tradingPool: poolPubKey,
      instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
      mint: offer.account.collateralType,
      fromTokenAccount: fromTokenAccount.account!.address,
      toTokenAccount: toTokenAccount.account!.address,
      positionAccount: positionAccountPDA,
      clock: SYSVAR_CLOCK_PUBKEY,
      systemProgram: SystemProgram.programId,
      trader: lavarageProgram.provider.publicKey!,
      tokenProgram: TOKEN_PROGRAM_ID,
      randomAccountAsId: position.account.seed,
    })
    .instruction()

  let repaySolIx: TransactionInstruction | null = null
  let jupiterIxs: TransactionInstruction[] = []
  if (jupInstruction.instructions == null ) {
    repaySolIx = await lavarageProgram.methods
    .tradingCloseRepaySol(new BN(jupInstruction.quoteResponse.outAmount), new BN(9997))
    .accountsStrict({
      nodeWallet: pool.account.nodeWallet,
      positionAccount: positionAccountPDA,
      tradingPool: poolPubKey,
      trader: lavarageProgram.provider.publicKey!,
      systemProgram: SystemProgram.programId,
      clock: SYSVAR_CLOCK_PUBKEY,
      randomAccountAsId: position.account.seed,
      feeReceipient: '6JfTobDvwuwZxZP6FR5JPmjdvQ4h4MovkEVH2FPsMSrF',
    }).remainingAccounts(partnerFeeRecipient ? [{
      pubkey: partnerFeeRecipient,
      isSigner: false,
      isWritable: true,
    }] : [])
    .instruction()
  } else {
    repaySolIx = await lavarageProgram.methods
    .tradingCloseRepaySol(new BN(jupInstruction.quoteResponse.outAmount), new BN(9998))
    .accountsStrict({
      nodeWallet: pool.account.nodeWallet,
      positionAccount: positionAccountPDA,
      tradingPool: poolPubKey,
      trader: lavarageProgram.provider.publicKey!,
      systemProgram: SystemProgram.programId,
      clock: SYSVAR_CLOCK_PUBKEY,
      randomAccountAsId: position.account.seed,
      feeReceipient: '6JfTobDvwuwZxZP6FR5JPmjdvQ4h4MovkEVH2FPsMSrF',
    }).remainingAccounts(partnerFeeRecipient ? [{
      pubkey: partnerFeeRecipient,
      isSigner: false,
      isWritable: true,
    }] : [])
    .instruction()
    const { setupInstructions, swapInstruction: swapInstructionPayload, cleanupInstruction, addressLookupTableAddresses } = jupiterSellIx!
    jupiterIxs = [
      ...setupInstructions.map(deserializeInstruction),
      deserializeInstruction(swapInstructionPayload),
      deserializeInstruction(cleanupInstruction),
    ]
    addressLookupTableAccounts.push(...(await getAddressLookupTableAccounts(addressLookupTableAddresses)))
  }
  const profit = new BN(jupInstruction.quoteResponse.outAmount).sub(position.account.amount).sub(position.account.userPaid)
  const allInstructions = [
    toTokenAccount.instruction!,
    closePositionIx,
    ...jupiterIxs,
    repaySolIx,
    profitFeeMarkup && partnerFeeRecipient ? SystemProgram.transfer(
      {
        fromPubkey: lavarageProgram.provider.publicKey!,
        toPubkey: partnerFeeRecipient!,
        lamports: profit.toNumber() > 0 ? profit.mul(new BN(profitFeeMarkup * 1000)).div(new BN(1000)).toNumber() : 0
      }
    ) : null,
  ].filter(i => !!i)

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions: allInstructions,
  }).compileToV0Message(addressLookupTableAccounts)

  const tx = new VersionedTransaction(messageV0)

  return tx
}

export const closeTradeV2 = async (lavarageProgram: Program<LavarageV2>, position: ProgramAccount<{
  pool: PublicKey,
  seed: PublicKey,
  userPaid: BN,
  amount: BN,
}>, offer: ProgramAccount<{
  nodeWallet: PublicKey,
  interestRate: number,
  collateralType: PublicKey,
}>, jupInstruction: {
  instructions?: {
    setupInstructions: Record<string, unknown>[]
    swapInstruction: Record<string, unknown>
    cleanupInstruction: Record<string, unknown>
    addressLookupTableAddresses: string[]
  },
  quoteResponse: any
}, quoteToken: PublicKey, partnerFeeRecipient?: PublicKey, profitFeeMarkup?: number) => {
  if (position.account.pool.toBase58() != offer.publicKey.toBase58()) throw "Mismatch offer"
  const pool = offer
  const poolPubKey = offer.publicKey

  const tokenAddressPubKey = new PublicKey(offer.account.collateralType)

  const positionAccountPDA = position.publicKey

  const fromTokenAccount = await getTokenAccountOrCreateIfNotExists(lavarageProgram, positionAccountPDA, tokenAddressPubKey)

  const toTokenAccount = await getTokenAccountOrCreateIfNotExists(lavarageProgram, lavarageProgram.provider.publicKey!, tokenAddressPubKey)

  const jupiterSellIx = jupInstruction!.instructions

  
  const deserializeInstruction = (instruction: any) => {
    return new TransactionInstruction({
      programId: new PublicKey(instruction.programId),

      keys: instruction.accounts.map((key: any) => ({
        pubkey: new PublicKey(key.pubkey),
        isSigner: key.isSigner,
        isWritable: key.isWritable,
      })),
      data: Buffer.from(instruction.data, 'base64'),
    })
  }

  const getAddressLookupTableAccounts = async (keys: string[]): Promise<AddressLookupTableAccount[]> => {
    const addressLookupTableAccountInfos = await lavarageProgram.provider.connection.getMultipleAccountsInfo(keys.map(key => new PublicKey(key)))

    return addressLookupTableAccountInfos.reduce((acc, accountInfo, index) => {
      const addressLookupTableAddress = keys[index]
      if (accountInfo) {
        const addressLookupTableAccount = new AddressLookupTableAccount({
          key: new PublicKey(addressLookupTableAddress),
          state: AddressLookupTableAccount.deserialize(Uint8Array.from(accountInfo.data)),
        })
        acc.push(addressLookupTableAccount)
      }

      return acc
    }, new Array<AddressLookupTableAccount>())
  }

  const addressLookupTableAccounts: AddressLookupTableAccount[] = []

  

  const { blockhash } = await lavarageProgram.provider.connection.getLatestBlockhash('finalized')

  

  const closePositionIx = await lavarageProgram.methods
    .tradingCloseBorrowCollateral()
    .accountsStrict({
      tradingPool: poolPubKey,
      instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
      mint: offer.account.collateralType,
      fromTokenAccount: fromTokenAccount.account!.address,
      toTokenAccount: toTokenAccount.account!.address,
      positionAccount: positionAccountPDA,
      clock: SYSVAR_CLOCK_PUBKEY,
      systemProgram: SystemProgram.programId,
      trader: lavarageProgram.provider.publicKey!,
      tokenProgram: TOKEN_PROGRAM_ID,
      randomAccountAsId: position.account.seed,
    })
    .instruction()

  let repaySolIx: TransactionInstruction | null = null
  let jupiterIxs: TransactionInstruction[] = []
  if (jupInstruction.instructions == null ) {
    repaySolIx = await lavarageProgram.methods
    .tradingCloseRepaySol(new BN(jupInstruction.quoteResponse.outAmount), new BN(9997))
    .accountsStrict({
      nodeWallet: pool.account.nodeWallet,
      positionAccount: positionAccountPDA,
      tradingPool: poolPubKey,
      trader: lavarageProgram.provider.publicKey!,
      systemProgram: SystemProgram.programId,
      clock: SYSVAR_CLOCK_PUBKEY,
      randomAccountAsId: position.account.seed,
      feeTokenAccount: getAssociatedTokenAddressSync(quoteToken, new PublicKey('6JfTobDvwuwZxZP6FR5JPmjdvQ4h4MovkEVH2FPsMSrF')),
      fromTokenAccount: getAssociatedTokenAddressSync(quoteToken, lavarageProgram.provider.publicKey!),
      tokenProgram: TOKEN_PROGRAM_ID,
      toTokenAccount: getAssociatedTokenAddressSync(quoteToken, pool.account.nodeWallet),
      mint: quoteToken,
    }).remainingAccounts(partnerFeeRecipient ? [{
      pubkey: partnerFeeRecipient,
      isSigner: false,
      isWritable: true,
    }] : [])
    .instruction()
  } else {
    repaySolIx = await lavarageProgram.methods
    .tradingCloseRepaySol(new BN(jupInstruction.quoteResponse.outAmount), new BN(9998))
    .accountsStrict({
      nodeWallet: pool.account.nodeWallet,
      positionAccount: positionAccountPDA,
      tradingPool: poolPubKey,
      trader: lavarageProgram.provider.publicKey!,
      systemProgram: SystemProgram.programId,
      clock: SYSVAR_CLOCK_PUBKEY,
      randomAccountAsId: position.account.seed,
      feeTokenAccount: getAssociatedTokenAddressSync(quoteToken, new PublicKey('6JfTobDvwuwZxZP6FR5JPmjdvQ4h4MovkEVH2FPsMSrF')),
      fromTokenAccount: getAssociatedTokenAddressSync(quoteToken, lavarageProgram.provider.publicKey!),
      tokenProgram: TOKEN_PROGRAM_ID,
      toTokenAccount: getAssociatedTokenAddressSync(quoteToken, pool.account.nodeWallet),
      mint: quoteToken,
    }).remainingAccounts(partnerFeeRecipient ? [{
      pubkey: partnerFeeRecipient,
      isSigner: false,
      isWritable: true,
    }] : [])
    .instruction()
    const { setupInstructions, swapInstruction: swapInstructionPayload, cleanupInstruction, addressLookupTableAddresses } = jupiterSellIx!
    jupiterIxs = [
      ...setupInstructions.map(deserializeInstruction),
      deserializeInstruction(swapInstructionPayload),
      deserializeInstruction(cleanupInstruction),
    ]
    addressLookupTableAccounts.push(...(await getAddressLookupTableAccounts(addressLookupTableAddresses)))
  }
  const profit = new BN(jupInstruction.quoteResponse.outAmount).sub(position.account.amount).sub(position.account.userPaid)
  const allInstructions = [
    toTokenAccount.instruction!,
    closePositionIx,
    ...jupiterIxs,
    repaySolIx,
    profitFeeMarkup && partnerFeeRecipient ? SystemProgram.transfer(
      {
        fromPubkey: lavarageProgram.provider.publicKey!,
        toPubkey: partnerFeeRecipient!,
        lamports: profit.toNumber() > 0 ? profit.mul(new BN(profitFeeMarkup * 1000)).div(new BN(1000)).toNumber() : 0
      }
    ) : null,
  ].filter(i => !!i)

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions: allInstructions,
  }).compileToV0Message(addressLookupTableAccounts)

  const tx = new VersionedTransaction(messageV0)

  return tx
}
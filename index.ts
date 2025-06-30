import { BN, Program, ProgramAccount } from "@coral-xyz/anchor";
import { Lavarage } from "./idl/lavarage";
import { Lavarage as LavarageV2 } from "./idl/lavaragev2";
import bs58 from "bs58";
import {
  AddressLookupTableAccount,
  ComputeBudgetProgram,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  TokenAccountNotFoundError,
  TokenInvalidAccountOwnerError,
} from "@solana/spl-token";

export * from "./evm";
export * as lending from "./lending";

export function getPda(seed: Buffer | Buffer[], programId: PublicKey) {
  const seedsBuffer = Array.isArray(seed) ? seed : [seed];

  return PublicKey.findProgramAddressSync(seedsBuffer, programId)[0];
}

export function getPositionAccountPDA(
  lavarageProgram: Program<Lavarage> | Program<LavarageV2>,
  offer: ProgramAccount,
  seed: PublicKey
) {
  return getPda(
    [
      Buffer.from("position"),
      lavarageProgram.provider.publicKey!.toBuffer(),
      offer.publicKey.toBuffer(),
      seed.toBuffer(),
    ],
    lavarageProgram.programId
  );
}

async function getTokenAccountOrCreateIfNotExists(
  lavarageProgram: Program<Lavarage> | Program<LavarageV2>,
  ownerPublicKey: PublicKey,
  tokenAddress: PublicKey,
  tokenProgram?: PublicKey
) {
  const associatedTokenAddress = getAssociatedTokenAddressSync(
    tokenAddress,
    ownerPublicKey,
    true,
    tokenProgram,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const instruction = createAssociatedTokenAccountIdempotentInstruction(
    lavarageProgram.provider.publicKey!,
    associatedTokenAddress,
    ownerPublicKey,
    tokenAddress,
    tokenProgram,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  return {
    account: {
      address: associatedTokenAddress,
    },
    instruction,
  };
}

export * from "./idl/lavarage";
export * as IDLV2 from "./idl/lavaragev2";

export const getOffers = (
  lavarageProgram: Program<Lavarage> | Program<LavarageV2>
) => {
  return lavarageProgram.account.pool.all();
};

export const getOpenPositions = (
  lavarageProgram: Program<Lavarage> | Program<LavarageV2>
) => {
  return lavarageProgram.account.position.all([
    { dataSize: 178 },
    {
      memcmp: {
        offset: 40,
        bytes: bs58.encode(new Uint8Array(8)),
      },
    },
  ]);
};

export const getClosedPositions = async (
  lavarageProgram: Program<Lavarage> | Program<LavarageV2>
) => {
  const value = BigInt(9997);
  const valueBuffer = Buffer.alloc(8);
  valueBuffer.writeBigUInt64LE(value);
  const value2 = BigInt(9998);
  const valueBuffer2 = Buffer.alloc(8);
  valueBuffer2.writeBigUInt64LE(value2);
  const value3 = BigInt(9996);
  const valueBuffer3 = Buffer.alloc(8);
  valueBuffer3.writeBigUInt64LE(value3);
  return (
    await lavarageProgram.account.position.all([
      { dataSize: 178 },
      {
        memcmp: {
          offset: 40,
          bytes: bs58.encode(Uint8Array.from(valueBuffer)),
        },
      },
    ])
  )
    .concat(
      await lavarageProgram.account.position.all([
        { dataSize: 178 },
        {
          memcmp: {
            offset: 40,
            bytes: bs58.encode(Uint8Array.from(valueBuffer2)),
          },
        },
      ])
    )
    .concat(
      await lavarageProgram.account.position.all([
        { dataSize: 178 },
        {
          memcmp: {
            offset: 40,
            bytes: bs58.encode(Uint8Array.from(valueBuffer3)),
          },
        },
      ])
    );
};

export const getLiquidatedPositions = (
  lavarageProgram: Program<Lavarage> | Program<LavarageV2>
) => {
  const value = BigInt(9999);
  const valueBuffer = Buffer.alloc(8);
  valueBuffer.writeBigUInt64LE(value);
  return lavarageProgram.account.position.all([
    { dataSize: 178 },
    {
      memcmp: {
        offset: 40,
        bytes: bs58.encode(Uint8Array.from(valueBuffer)),
      },
    },
  ]);
};

export const getAllPositions = (
  lavarageProgram: Program<Lavarage> | Program<LavarageV2>
) => {
  return lavarageProgram.account.position.all([{ dataSize: 178 }]);
};

export const openTradeV1 = async (
  lavarageProgram: Program<Lavarage>,
  offer: ProgramAccount<{
    nodeWallet: PublicKey;
    interestRate: number;
    collateralType: PublicKey;
  }>,
  jupInstruction: {
    instructions: {
      setupInstructions: Record<string, unknown>[];
      swapInstruction: Record<string, unknown>;
      addressLookupTableAddresses: string[];
    };
  },
  marginSOL: BN,
  leverage: number,
  randomSeed: Keypair,
  tokenProgram: PublicKey,
  partnerFeeRecipient?: PublicKey,
  partnerFeeMarkup?: number,
  computeBudgetMicroLamports?: number
) => {
  let partnerFeeMarkupAsPkey;
  if (partnerFeeMarkup) {
    const feeBuffer = Buffer.alloc(8);
    feeBuffer.writeBigUInt64LE(BigInt(partnerFeeMarkup));
    const feeBuffer32 = Buffer.alloc(32);
    feeBuffer32.set(feeBuffer, 0);
    partnerFeeMarkupAsPkey = new PublicKey(feeBuffer32);
  }
  // assuming all token accounts are created prior
  const positionAccount = getPositionAccountPDA(
    lavarageProgram,
    offer,
    randomSeed.publicKey
  );

  const fromTokenAccount = await getTokenAccountOrCreateIfNotExists(
    lavarageProgram,
    lavarageProgram.provider.publicKey!,
    offer.account.collateralType,
    tokenProgram
  );

  const toTokenAccount = await getTokenAccountOrCreateIfNotExists(
    lavarageProgram,
    positionAccount,
    offer.account.collateralType,
    tokenProgram
  );

  const tokenAccountCreationTx = new Transaction();

  if (fromTokenAccount.instruction) {
    tokenAccountCreationTx.add(fromTokenAccount.instruction);
  }

  if (toTokenAccount.instruction) {
    tokenAccountCreationTx.add(toTokenAccount.instruction);
  }

  const instructionsJup = jupInstruction.instructions;

  const {
    setupInstructions,
    swapInstruction: swapInstructionPayload,
    addressLookupTableAddresses,
  } = instructionsJup;

  const deserializeInstruction = (instruction: any) => {
    return new TransactionInstruction({
      programId: new PublicKey(instruction.programId),

      keys: instruction.accounts.map((key: any) => ({
        pubkey: new PublicKey(key.pubkey),
        isSigner: key.isSigner,
        isWritable: key.isWritable,
      })),
      data: Buffer.from(instruction.data, "base64"),
    });
  };

  const getAddressLookupTableAccounts = async (
    keys: string[]
  ): Promise<AddressLookupTableAccount[]> => {
    const addressLookupTableAccountInfos =
      await lavarageProgram.provider.connection.getMultipleAccountsInfo(
        keys.map((key) => new PublicKey(key))
      );

    return addressLookupTableAccountInfos.reduce((acc, accountInfo, index) => {
      const addressLookupTableAddress = keys[index];
      if (accountInfo) {
        const addressLookupTableAccount = new AddressLookupTableAccount({
          key: new PublicKey(addressLookupTableAddress),
          state: AddressLookupTableAccount.deserialize(
            Uint8Array.from(accountInfo.data)
          ),
        });
        acc.push(addressLookupTableAccount);
      }

      return acc;
    }, new Array<AddressLookupTableAccount>());
  };

  const addressLookupTableAccounts: AddressLookupTableAccount[] = [];

  addressLookupTableAccounts.push(
    ...(await getAddressLookupTableAccounts([
      "5LEAB3owNUSKvECm7vkr58tDtQpzbngQ2NYpc7qmRFdi",
      ...addressLookupTableAddresses,
    ]))
  );

  const { blockhash } =
    await lavarageProgram.provider.connection.getLatestBlockhash("finalized");

  const tradingOpenBorrowInstruction = await lavarageProgram.methods
    .tradingOpenBorrow(
      new BN((marginSOL.toNumber() * leverage).toFixed(0)),
      marginSOL
    )
    .accountsStrict({
      nodeWallet: offer.account.nodeWallet,
      instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
      tradingPool: offer.publicKey,
      positionAccount,
      trader: lavarageProgram.provider.publicKey!,
      systemProgram: SystemProgram.programId,
      clock: SYSVAR_CLOCK_PUBKEY,
      randomAccountAsId: randomSeed.publicKey.toBase58(),
      feeReceipient: "6JfTobDvwuwZxZP6FR5JPmjdvQ4h4MovkEVH2FPsMSrF",
    })
    .remainingAccounts(
      partnerFeeRecipient && partnerFeeMarkupAsPkey
        ? [
            {
              pubkey: partnerFeeRecipient,
              isSigner: false,
              isWritable: true,
            },
            {
              pubkey: partnerFeeMarkupAsPkey,
              isSigner: false,
              isWritable: false,
            },
          ]
        : []
    )
    .instruction();

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
    .instruction();

  const jupiterIxs = [
    ...setupInstructions.map(deserializeInstruction),
    deserializeInstruction(swapInstructionPayload),
  ];

  const computeFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: computeBudgetMicroLamports ?? 100000,
  });

  const allInstructions = [
    fromTokenAccount.instruction!,
    toTokenAccount.instruction!,
    tradingOpenBorrowInstruction!,
    ...jupiterIxs,
    openAddCollateralInstruction!,
    computeBudgetMicroLamports ? computeFeeIx : undefined,
  ].filter(Boolean) as TransactionInstruction[];

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions: allInstructions,
  }).compileToV0Message(addressLookupTableAccounts);

  const tx = new VersionedTransaction(messageV0);

  return tx;
};

export const openTradeV2 = async (
  lavarageProgram: Program<LavarageV2>,
  offer: ProgramAccount<{
    nodeWallet: PublicKey;
    interestRate: number;
    collateralType: PublicKey;
  }>,
  jupInstruction: {
    instructions: {
      setupInstructions: Record<string, unknown>[];
      swapInstruction: Record<string, unknown>;
      addressLookupTableAddresses: string[];
    };
  },
  marginSOL: BN,
  leverage: number,
  randomSeed: Keypair,
  quoteToken: PublicKey,
  tokenProgram: PublicKey,
  partnerFeeRecipient?: PublicKey,
  partnerFeeMarkup?: number,
  computeBudgetMicroLamports?: number
) => {
  let partnerFeeMarkupAsPkey;
  if (partnerFeeMarkup) {
    const feeBuffer = Buffer.alloc(8);
    feeBuffer.writeBigUInt64LE(BigInt(partnerFeeMarkup));
    const feeBuffer32 = Buffer.alloc(32);
    feeBuffer32.set(feeBuffer, 0);
    partnerFeeMarkupAsPkey = new PublicKey(feeBuffer32);
  }
  // assuming all token accounts are created prior
  const positionAccount = getPositionAccountPDA(
    lavarageProgram,
    offer,
    randomSeed.publicKey
  );

  const quoteMintAccount =
    await lavarageProgram.provider.connection.getAccountInfo(quoteToken);
  const quoteTokenProgram = quoteMintAccount?.owner;

  const fromTokenAccount = await getTokenAccountOrCreateIfNotExists(
    lavarageProgram,
    lavarageProgram.provider.publicKey!,
    offer.account.collateralType,
    tokenProgram
  );

  const toTokenAccount = await getTokenAccountOrCreateIfNotExists(
    lavarageProgram,
    positionAccount,
    offer.account.collateralType,
    tokenProgram
  );

  const tokenAccountCreationTx = new Transaction();

  if (fromTokenAccount.instruction) {
    tokenAccountCreationTx.add(fromTokenAccount.instruction);
  }

  if (toTokenAccount.instruction) {
    tokenAccountCreationTx.add(toTokenAccount.instruction);
  }

  const instructionsJup = jupInstruction.instructions;

  const {
    setupInstructions,
    swapInstruction: swapInstructionPayload,
    addressLookupTableAddresses,
  } = instructionsJup;

  const deserializeInstruction = (instruction: any) => {
    return new TransactionInstruction({
      programId: new PublicKey(instruction.programId),

      keys: instruction.accounts.map((key: any) => ({
        pubkey: new PublicKey(key.pubkey),
        isSigner: key.isSigner,
        isWritable: key.isWritable,
      })),
      data: Buffer.from(instruction.data, "base64"),
    });
  };

  const getAddressLookupTableAccounts = async (
    keys: string[]
  ): Promise<AddressLookupTableAccount[]> => {
    const addressLookupTableAccountInfos =
      await lavarageProgram.provider.connection.getMultipleAccountsInfo(
        keys.map((key) => new PublicKey(key))
      );

    return addressLookupTableAccountInfos.reduce((acc, accountInfo, index) => {
      const addressLookupTableAddress = keys[index];
      if (accountInfo) {
        const addressLookupTableAccount = new AddressLookupTableAccount({
          key: new PublicKey(addressLookupTableAddress),
          state: AddressLookupTableAccount.deserialize(
            Uint8Array.from(accountInfo.data)
          ),
        });
        acc.push(addressLookupTableAccount);
      }

      return acc;
    }, new Array<AddressLookupTableAccount>());
  };

  const addressLookupTableAccounts: AddressLookupTableAccount[] = [];

  addressLookupTableAccounts.push(
    ...(await getAddressLookupTableAccounts([
      ...addressLookupTableAddresses,
      getQuoteCurrencySpecificAddressLookupTable(quoteToken.toBase58()),
      "5LEAB3owNUSKvECm7vkr58tDtQpzbngQ2NYpc7qmRFdi",
    ]))
  );

  const { blockhash } =
    await lavarageProgram.provider.connection.getLatestBlockhash("finalized");

  const tradingOpenBorrowInstruction = await lavarageProgram.methods
    .tradingOpenBorrow(
      new BN((marginSOL.toNumber() * leverage).toFixed(0)),
      marginSOL
    )
    .accountsStrict({
      nodeWallet: offer.account.nodeWallet,
      instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
      tradingPool: offer.publicKey,
      positionAccount,
      trader: lavarageProgram.provider.publicKey!,
      systemProgram: SystemProgram.programId,
      clock: SYSVAR_CLOCK_PUBKEY,
      randomAccountAsId: randomSeed.publicKey.toBase58(),
      feeTokenAccount: getAssociatedTokenAddressSync(
        quoteToken,
        new PublicKey("6JfTobDvwuwZxZP6FR5JPmjdvQ4h4MovkEVH2FPsMSrF"),
        true,
        quoteTokenProgram
      ),
      toTokenAccount: getAssociatedTokenAddressSync(
        quoteToken,
        lavarageProgram.provider.publicKey!,
        true,
        quoteTokenProgram
      ),
      tokenProgram: quoteTokenProgram!,
      fromTokenAccount: getAssociatedTokenAddressSync(
        quoteToken,
        offer.account.nodeWallet,
        true,
        quoteTokenProgram
      ),
    })
    .remainingAccounts(
      partnerFeeRecipient && partnerFeeMarkupAsPkey
        ? [
            {
              pubkey: getAssociatedTokenAddressSync(
                quoteToken,
                partnerFeeRecipient,
                false,
                quoteTokenProgram
              ),
              isSigner: false,
              isWritable: true,
            },
            {
              pubkey: partnerFeeMarkupAsPkey,
              isSigner: false,
              isWritable: false,
            },
          ]
        : []
    )
    .instruction();

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
    .instruction();

  const jupiterIxs = [
    ...setupInstructions.map(deserializeInstruction),
    deserializeInstruction(swapInstructionPayload),
  ];

  const computeFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: computeBudgetMicroLamports ?? 100000,
  });

  const allInstructions = [
    fromTokenAccount.instruction!,
    toTokenAccount.instruction!,
    tradingOpenBorrowInstruction!,
    ...jupiterIxs,
    openAddCollateralInstruction!,
    computeBudgetMicroLamports ? computeFeeIx : undefined,
  ].filter(Boolean) as TransactionInstruction[];

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions: allInstructions,
  }).compileToV0Message(addressLookupTableAccounts);

  const tx = new VersionedTransaction(messageV0);

  return tx;
};

export const createTpDelegate = async (
  lavarageProgram: Program<Lavarage> | Program<LavarageV2>,
  position: ProgramAccount<{
    pool: PublicKey;
    seed: PublicKey;
    userPaid: BN;
    amount: BN;
  }>,
  tpPrice: BN,
  tpTolerence: BN,
  prioFee: BN,
  quoteToken: PublicKey,
  partnerFeeRecipient?: PublicKey
) => {
  const { blockhash } =
    await lavarageProgram.provider.connection.getLatestBlockhash("finalized");
  const ix = await lavarageProgram.methods
    .tradingCreateTpDelegate(
      tpPrice,
      tpTolerence,
      new PublicKey("6dA5GTDPWxnw3gvjoy3vYBDyY7iETxcTJzt8RqF9i9MV"),
      new BN(10000)
    )
    .accountsStrict({
      delegate: getPda(
        [Buffer.from("delegate"), position.publicKey.toBuffer()],
        lavarageProgram.programId
      ),
      originalOperator: lavarageProgram.provider.publicKey!,
      delegatedAccount: position.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .remainingAccounts(
      partnerFeeRecipient
        ? [
            {
              pubkey:
                quoteToken.toBase58() ==
                "So11111111111111111111111111111111111111112"
                  ? partnerFeeRecipient
                  : getAssociatedTokenAddressSync(
                      quoteToken,
                      partnerFeeRecipient,
                      false
                    ),
              isSigner: false,
              isWritable: true,
            },
          ]
        : []
    )
    .instruction();

  const computeFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: prioFee.toNumber(),
  });

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions: [ix, computeFeeIx].filter(Boolean),
  }).compileToV0Message();

  return new VersionedTransaction(messageV0);
};

export const modifyTpDelegate = async (
  lavarageProgram: Program<Lavarage> | Program<LavarageV2>,
  position: ProgramAccount<{
    pool: PublicKey;
    seed: PublicKey;
    userPaid: BN;
    amount: BN;
  }>,
  tpPrice: BN,
  tpTolerence: BN,
  prioFee: BN,
  quoteToken: PublicKey,
  partnerFeeRecipient?: PublicKey
) => {
  const { blockhash } =
    await lavarageProgram.provider.connection.getLatestBlockhash("finalized");
  const delegatePda = getPda(
    [Buffer.from("delegate"), position.publicKey.toBuffer()],
    lavarageProgram.programId
  );
  const removeIx = await lavarageProgram.methods
    .tradingRemoveTpDelegate()
    .accountsStrict({
      delegate: delegatePda,
      originalOperator: lavarageProgram.provider.publicKey!,
      delegatedAccount: position.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
  const ix = await lavarageProgram.methods
    .tradingCreateTpDelegate(
      tpPrice,
      tpTolerence,
      new PublicKey("6dA5GTDPWxnw3gvjoy3vYBDyY7iETxcTJzt8RqF9i9MV"),
      new BN(10000)
    )
    .accountsStrict({
      delegate: delegatePda,
      originalOperator: lavarageProgram.provider.publicKey!,
      delegatedAccount: position.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .remainingAccounts(
      partnerFeeRecipient
        ? [
            {
              pubkey:
                quoteToken.toBase58() ==
                "So11111111111111111111111111111111111111112"
                  ? partnerFeeRecipient
                  : getAssociatedTokenAddressSync(
                      quoteToken,
                      partnerFeeRecipient,
                      false
                    ),
              isSigner: false,
              isWritable: true,
            },
          ]
        : []
    )
    .instruction();

  const computeFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: prioFee.toNumber(),
  });

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions: [removeIx, ix, computeFeeIx].filter(Boolean),
  }).compileToV0Message();

  return new VersionedTransaction(messageV0);
};

export const removeTpDelegate = async (
  lavarageProgram: Program<Lavarage> | Program<LavarageV2>,
  position: ProgramAccount<{
    pool: PublicKey;
    seed: PublicKey;
    userPaid: BN;
    amount: BN;
  }>,
  prioFee: BN
) => {
  const { blockhash } =
    await lavarageProgram.provider.connection.getLatestBlockhash("finalized");
  const delegatePda = getPda(
    [Buffer.from("delegate"), position.publicKey.toBuffer()],
    lavarageProgram.programId
  );
  const removeIx = await lavarageProgram.methods
    .tradingRemoveTpDelegate()
    .accountsStrict({
      delegate: delegatePda,
      originalOperator: lavarageProgram.provider.publicKey!,
      delegatedAccount: position.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  const computeFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: prioFee.toNumber(),
  });

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions: [removeIx, computeFeeIx].filter(Boolean),
  }).compileToV0Message();

  return new VersionedTransaction(messageV0);
};

export const partialRepayV1 = async (
  lavarageProgram: Program<Lavarage>,
  position: ProgramAccount<{
    pool: PublicKey;
    seed: PublicKey;
    userPaid: BN;
    amount: BN;
  }>,
  repaymentBps: number
) => {
  const { blockhash } =
    await lavarageProgram.provider.connection.getLatestBlockhash("finalized");
  const pool = await lavarageProgram.account.pool.fetch(position.account.pool);
  const positionAccountPDA = position.publicKey;
  const ix = await lavarageProgram.methods
    .tradingClosePartialRepaySol(new BN(repaymentBps))
    .accountsStrict({
      systemProgram: SystemProgram.programId,
      positionAccount: positionAccountPDA,
      tradingPool: position.account.pool,
      nodeWallet: pool.nodeWallet,
      trader: lavarageProgram.provider.publicKey!,
      clock: SYSVAR_CLOCK_PUBKEY,
      randomAccountAsId: position.account.seed,
      feeReceipient: "6JfTobDvwuwZxZP6FR5JPmjdvQ4h4MovkEVH2FPsMSrF",
    })
    .instruction();
  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions: [ix],
  }).compileToV0Message();
  return new VersionedTransaction(messageV0);
};

export const partialRepayV2 = async (
  lavarageProgram: Program<LavarageV2>,
  position: ProgramAccount<{
    pool: PublicKey;
    seed: PublicKey;
    userPaid: BN;
    amount: BN;
  }>,
  repaymentBps: number
) => {
  const { blockhash } =
    await lavarageProgram.provider.connection.getLatestBlockhash("finalized");
  const pool = await lavarageProgram.account.pool.fetch(position.account.pool);
  const positionAccountPDA = position.publicKey;
  const ix = await lavarageProgram.methods
    .tradingPartialRepaySol(new BN(repaymentBps))
    .accountsStrict({
      systemProgram: SystemProgram.programId,
      positionAccount: positionAccountPDA,
      tradingPool: position.account.pool,
      nodeWallet: pool.nodeWallet,
      trader: lavarageProgram.provider.publicKey!,
      clock: SYSVAR_CLOCK_PUBKEY,
      randomAccountAsId: position.account.seed,
      fromTokenAccount: getAssociatedTokenAddressSync(
        pool.qtType,
        lavarageProgram.provider.publicKey!
      ),
      toTokenAccount: getAssociatedTokenAddressSync(
        pool.qtType,
        pool.nodeWallet,
        true
      ),
      mint: pool.qtType,
      feeTokenAccount: getAssociatedTokenAddressSync(
        pool.qtType,
        new PublicKey("6JfTobDvwuwZxZP6FR5JPmjdvQ4h4MovkEVH2FPsMSrF")
      ),
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction();

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions: [ix],
  }).compileToV0Message();

  return new VersionedTransaction(messageV0);
};

export const closeTradeV1 = async (
  lavarageProgram: Program<Lavarage>,
  position: ProgramAccount<{
    pool: PublicKey;
    seed: PublicKey;
    userPaid: BN;
    amount: BN;
  }>,
  offer: ProgramAccount<{
    nodeWallet: PublicKey;
    interestRate: number;
    collateralType: PublicKey;
  }>,
  jupInstruction: {
    instructions?: {
      setupInstructions: Record<string, unknown>[];
      swapInstruction: Record<string, unknown>;
      cleanupInstruction: Record<string, unknown>;
      addressLookupTableAddresses: string[];
      tokenLedgerInstruction?: Record<string, unknown>;
    };
    quoteResponse: any;
  },
  partnerFeeRecipient?: PublicKey,
  partnerFeeMarkup?: number,
  computeBudgetMicroLamports?: number
) => {
  let partnerFeeMarkupAsPkey;
  if (partnerFeeMarkup) {
    const feeBuffer = Buffer.alloc(8);
    feeBuffer.writeBigUInt64LE(BigInt(partnerFeeMarkup));
    const feeBuffer32 = Buffer.alloc(32);
    feeBuffer32.set(feeBuffer, 0);
    partnerFeeMarkupAsPkey = new PublicKey(feeBuffer32);
  }
  if (position.account.pool.toBase58() != offer.publicKey.toBase58())
    throw "Mismatch offer";
  const pool = offer;
  const poolPubKey = offer.publicKey;

  const tokenAddressPubKey = new PublicKey(offer.account.collateralType);

  const mintAccount = await lavarageProgram.provider.connection.getAccountInfo(
    offer.account.collateralType
  );
  const tokenProgram = mintAccount?.owner;

  const positionAccountPDA = position.publicKey;

  const fromTokenAccount = await getTokenAccountOrCreateIfNotExists(
    lavarageProgram,
    positionAccountPDA,
    tokenAddressPubKey,
    tokenProgram
  );

  const toTokenAccount = await getTokenAccountOrCreateIfNotExists(
    lavarageProgram,
    lavarageProgram.provider.publicKey!,
    tokenAddressPubKey,
    tokenProgram
  );

  const jupiterSellIx = jupInstruction!.instructions;

  const deserializeInstruction = (instruction: any) => {
    return new TransactionInstruction({
      programId: new PublicKey(instruction.programId),

      keys: instruction.accounts.map((key: any) => ({
        pubkey: new PublicKey(key.pubkey),
        isSigner: key.isSigner,
        isWritable: key.isWritable,
      })),
      data: Buffer.from(instruction.data, "base64"),
    });
  };

  const getAddressLookupTableAccounts = async (
    keys: string[]
  ): Promise<AddressLookupTableAccount[]> => {
    const addressLookupTableAccountInfos =
      await lavarageProgram.provider.connection.getMultipleAccountsInfo(
        keys.map((key) => new PublicKey(key))
      );

    return addressLookupTableAccountInfos.reduce((acc, accountInfo, index) => {
      const addressLookupTableAddress = keys[index];
      if (accountInfo) {
        const addressLookupTableAccount = new AddressLookupTableAccount({
          key: new PublicKey(addressLookupTableAddress),
          state: AddressLookupTableAccount.deserialize(
            Uint8Array.from(accountInfo.data)
          ),
        });
        acc.push(addressLookupTableAccount);
      }

      return acc;
    }, new Array<AddressLookupTableAccount>());
  };

  const addressLookupTableAccounts: AddressLookupTableAccount[] = [];

  const { blockhash } =
    await lavarageProgram.provider.connection.getLatestBlockhash("finalized");

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
      tokenProgram: tokenProgram!,
      randomAccountAsId: position.account.seed,
    })
    .instruction();

  let repaySolIx: TransactionInstruction | null = null;
  let jupiterIxs: TransactionInstruction[] = [];
  if (jupInstruction.instructions == undefined) {
    repaySolIx = await lavarageProgram.methods
      .tradingCloseRepaySol(
        new BN(jupInstruction.quoteResponse.outAmount),
        new BN(9997)
      )
      .accountsStrict({
        nodeWallet: pool.account.nodeWallet,
        positionAccount: positionAccountPDA,
        tradingPool: poolPubKey,
        trader: lavarageProgram.provider.publicKey!,
        systemProgram: SystemProgram.programId,
        clock: SYSVAR_CLOCK_PUBKEY,
        randomAccountAsId: position.account.seed,
        feeReceipient: "6JfTobDvwuwZxZP6FR5JPmjdvQ4h4MovkEVH2FPsMSrF",
      })
      .remainingAccounts(
        partnerFeeRecipient && partnerFeeMarkupAsPkey
          ? [
              {
                pubkey: partnerFeeRecipient,
                isSigner: false,
                isWritable: true,
              },
              {
                pubkey: partnerFeeMarkupAsPkey,
                isSigner: false,
                isWritable: false,
              },
            ]
          : []
      )
      .instruction();
  } else {
    repaySolIx = await lavarageProgram.methods
      .tradingCloseRepaySol(
        new BN(jupInstruction.quoteResponse.outAmount),
        new BN(9998)
      )
      .accountsStrict({
        nodeWallet: pool.account.nodeWallet,
        positionAccount: positionAccountPDA,
        tradingPool: poolPubKey,
        trader: lavarageProgram.provider.publicKey!,
        systemProgram: SystemProgram.programId,
        clock: SYSVAR_CLOCK_PUBKEY,
        randomAccountAsId: position.account.seed,
        feeReceipient: "6JfTobDvwuwZxZP6FR5JPmjdvQ4h4MovkEVH2FPsMSrF",
      })
      .remainingAccounts(
        partnerFeeRecipient && partnerFeeMarkupAsPkey
          ? [
              {
                pubkey: partnerFeeRecipient,
                isSigner: false,
                isWritable: true,
              },
              {
                pubkey: partnerFeeMarkupAsPkey,
                isSigner: false,
                isWritable: false,
              },
            ]
          : []
      )
      .instruction();

      
    const {
      setupInstructions,
      swapInstruction: swapInstructionPayload,
      cleanupInstruction,
      addressLookupTableAddresses,
    } = jupiterSellIx!;
    jupiterIxs = [
      ...setupInstructions.map(deserializeInstruction),
      deserializeInstruction(swapInstructionPayload),
      deserializeInstruction(cleanupInstruction),
    ];
    addressLookupTableAccounts.push(
      ...(await getAddressLookupTableAccounts([
        "5LEAB3owNUSKvECm7vkr58tDtQpzbngQ2NYpc7qmRFdi",
        ...addressLookupTableAddresses,
      ]))
    );
  }
  const profit = new BN(jupInstruction.quoteResponse.outAmount)
    .sub(position.account.amount)
    .sub(position.account.userPaid);

  let createAssociatedTokenAccountInstruction =
    createAssociatedTokenAccountIdempotentInstruction(
      lavarageProgram.provider.publicKey!,
      toTokenAccount.account!.address,
      lavarageProgram.provider.publicKey!,
      offer.account.collateralType,
      tokenProgram!
    );

  const computeFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: computeBudgetMicroLamports ?? 100000,
  });

  const allInstructions = [
    jupInstruction.instructions?.tokenLedgerInstruction
      ? createAssociatedTokenAccountInstruction
      : null,
    jupInstruction.instructions?.tokenLedgerInstruction
      ? deserializeInstruction(
          jupInstruction.instructions.tokenLedgerInstruction
        )
      : null,
    toTokenAccount.instruction!,
    closePositionIx,
    ...jupiterIxs,
    repaySolIx,
    computeBudgetMicroLamports ? computeFeeIx : undefined,
  ].filter((i) => !!i);

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions: allInstructions,
  }).compileToV0Message(addressLookupTableAccounts);

  const tx = new VersionedTransaction(messageV0);

  return tx;
};

export const closeTradeV2 = async (
  lavarageProgram: Program<LavarageV2>,
  position: ProgramAccount<{
    pool: PublicKey;
    seed: PublicKey;
    userPaid: BN;
    amount: BN;
  }>,
  offer: ProgramAccount<{
    nodeWallet: PublicKey;
    interestRate: number;
    collateralType: PublicKey;
  }>,
  jupInstruction: {
    instructions?: {
      setupInstructions: Record<string, unknown>[];
      swapInstruction: Record<string, unknown>;
      cleanupInstruction: Record<string, unknown>;
      addressLookupTableAddresses: string[];
      tokenLedgerInstruction?: Record<string, unknown>;
    };
    quoteResponse: any;
  },
  quoteToken: PublicKey,
  partnerFeeRecipient?: PublicKey,
  partnerFeeMarkup?: number,
  computeBudgetMicroLamports?: number
) => {
  let partnerFeeMarkupAsPkey;
  if (partnerFeeMarkup) {
    const feeBuffer = Buffer.alloc(8);
    feeBuffer.writeBigUInt64LE(BigInt(partnerFeeMarkup));
    const feeBuffer32 = Buffer.alloc(32);
    feeBuffer32.set(feeBuffer, 0);
    partnerFeeMarkupAsPkey = new PublicKey(feeBuffer32);
  }
  if (position.account.pool.toBase58() != offer.publicKey.toBase58())
    throw "Mismatch offer";
  const pool = offer;
  const poolPubKey = offer.publicKey;

  const tokenAddressPubKey = new PublicKey(offer.account.collateralType);

  const mintAccount = await lavarageProgram.provider.connection.getAccountInfo(
    offer.account.collateralType
  );
  const tokenProgram = mintAccount?.owner;

  const quoteMintAccount =
    await lavarageProgram.provider.connection.getAccountInfo(quoteToken);
  const quoteTokenProgram = quoteMintAccount?.owner;

  const positionAccountPDA = position.publicKey;

  const fromTokenAccount = await getTokenAccountOrCreateIfNotExists(
    lavarageProgram,
    positionAccountPDA,
    tokenAddressPubKey,
    tokenProgram
  );

  const toTokenAccount = await getTokenAccountOrCreateIfNotExists(
    lavarageProgram,
    lavarageProgram.provider.publicKey!,
    tokenAddressPubKey,
    tokenProgram
  );

  const jupiterSellIx = jupInstruction!.instructions;

  const deserializeInstruction = (instruction: any) => {
    return new TransactionInstruction({
      programId: new PublicKey(instruction.programId),

      keys: instruction.accounts.map((key: any) => ({
        pubkey: new PublicKey(key.pubkey),
        isSigner: key.isSigner,
        isWritable: key.isWritable,
      })),
      data: Buffer.from(instruction.data, "base64"),
    });
  };

  const getAddressLookupTableAccounts = async (
    keys: string[]
  ): Promise<AddressLookupTableAccount[]> => {
    const addressLookupTableAccountInfos =
      await lavarageProgram.provider.connection.getMultipleAccountsInfo(
        keys.map((key) => new PublicKey(key))
      );

    return addressLookupTableAccountInfos.reduce((acc, accountInfo, index) => {
      const addressLookupTableAddress = keys[index];
      if (accountInfo) {
        const addressLookupTableAccount = new AddressLookupTableAccount({
          key: new PublicKey(addressLookupTableAddress),
          state: AddressLookupTableAccount.deserialize(
            Uint8Array.from(accountInfo.data)
          ),
        });
        acc.push(addressLookupTableAccount);
      }

      return acc;
    }, new Array<AddressLookupTableAccount>());
  };

  const addressLookupTableAccounts: AddressLookupTableAccount[] = [];

  const { blockhash } =
    await lavarageProgram.provider.connection.getLatestBlockhash("finalized");

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
      tokenProgram: tokenProgram!,
      randomAccountAsId: position.account.seed,
    })
    .instruction();

  let repaySolIx: TransactionInstruction | null = null;
  let jupiterIxs: TransactionInstruction[] = [];
  if (jupInstruction.instructions == undefined) {
    repaySolIx = await lavarageProgram.methods
      .tradingCloseRepaySol(
        new BN(jupInstruction.quoteResponse.outAmount),
        new BN(9997)
      )
      .accountsStrict({
        nodeWallet: pool.account.nodeWallet,
        positionAccount: positionAccountPDA,
        tradingPool: poolPubKey,
        trader: lavarageProgram.provider.publicKey!,
        systemProgram: SystemProgram.programId,
        clock: SYSVAR_CLOCK_PUBKEY,
        randomAccountAsId: position.account.seed,
        feeTokenAccount: getAssociatedTokenAddressSync(
          quoteToken,
          new PublicKey("6JfTobDvwuwZxZP6FR5JPmjdvQ4h4MovkEVH2FPsMSrF"),
          false,
          quoteTokenProgram
        ),
        fromTokenAccount: getAssociatedTokenAddressSync(
          quoteToken,
          lavarageProgram.provider.publicKey!,
          false,
          quoteTokenProgram
        ),
        tokenProgram: quoteTokenProgram!,
        toTokenAccount: getAssociatedTokenAddressSync(
          quoteToken,
          pool.account.nodeWallet,
          true,
          quoteTokenProgram
        ),
        mint: quoteToken,
      })
      .remainingAccounts(
        partnerFeeRecipient && partnerFeeMarkupAsPkey
          ? [
              {
                pubkey: getAssociatedTokenAddressSync(
                  quoteToken,
                  partnerFeeRecipient,
                  false,
                  quoteTokenProgram
                ),
                isSigner: false,
                isWritable: true,
              },
              {
                pubkey: partnerFeeMarkupAsPkey,
                isSigner: false,
                isWritable: false,
              },
            ]
          : []
      )
      .instruction();
  } else {
    repaySolIx = await lavarageProgram.methods
      .tradingCloseRepaySol(
        new BN(jupInstruction.quoteResponse.outAmount),
        new BN(9998)
      )
      .accountsStrict({
        nodeWallet: pool.account.nodeWallet,
        positionAccount: positionAccountPDA,
        tradingPool: poolPubKey,
        trader: lavarageProgram.provider.publicKey!,
        systemProgram: SystemProgram.programId,
        clock: SYSVAR_CLOCK_PUBKEY,
        randomAccountAsId: position.account.seed,
        feeTokenAccount: getAssociatedTokenAddressSync(
          quoteToken,
          new PublicKey("6JfTobDvwuwZxZP6FR5JPmjdvQ4h4MovkEVH2FPsMSrF"),
          false,
          quoteTokenProgram
        ),
        fromTokenAccount: getAssociatedTokenAddressSync(
          quoteToken,
          lavarageProgram.provider.publicKey!,
          false,
          quoteTokenProgram
        ),
        tokenProgram: quoteTokenProgram!,
        toTokenAccount: getAssociatedTokenAddressSync(
          quoteToken,
          pool.account.nodeWallet,
          true,
          quoteTokenProgram
        ),
        mint: quoteToken,
      })
      .remainingAccounts(
        partnerFeeRecipient && partnerFeeMarkupAsPkey
          ? [
              {
                pubkey: partnerFeeRecipient,
                isSigner: false,
                isWritable: true,
              },
              {
                pubkey: partnerFeeMarkupAsPkey,
                isSigner: false,
                isWritable: false,
              },
            ]
          : []
      )
      .instruction();
    const {
      setupInstructions,
      swapInstruction: swapInstructionPayload,
      cleanupInstruction,
      addressLookupTableAddresses,
    } = jupiterSellIx!;
    jupiterIxs = [
      ...setupInstructions.filter((i) => !!i).map(deserializeInstruction),
      swapInstructionPayload
        ? deserializeInstruction(swapInstructionPayload)
        : null,
      cleanupInstruction ? deserializeInstruction(cleanupInstruction) : null,
    ].filter((i) => !!i);
    addressLookupTableAccounts.push(
      ...(await getAddressLookupTableAccounts([
        ...addressLookupTableAddresses,
        getQuoteCurrencySpecificAddressLookupTable(quoteToken.toBase58()),
        "5LEAB3owNUSKvECm7vkr58tDtQpzbngQ2NYpc7qmRFdi",
      ]))
    );
  }
  const profit = new BN(jupInstruction.quoteResponse.outAmount)
    .sub(position.account.amount)
    .sub(position.account.userPaid);

  let createAssociatedTokenAccountInstruction =
    createAssociatedTokenAccountIdempotentInstruction(
      lavarageProgram.provider.publicKey!,
      toTokenAccount.account!.address,
      lavarageProgram.provider.publicKey!,
      offer.account.collateralType,
      tokenProgram!
    );

  const computeFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: computeBudgetMicroLamports ?? 100000,
  });

  const allInstructions = [
    jupInstruction.instructions?.tokenLedgerInstruction
      ? createAssociatedTokenAccountInstruction
      : null,
    jupInstruction.instructions?.tokenLedgerInstruction
      ? deserializeInstruction(
          jupInstruction.instructions.tokenLedgerInstruction
        )
      : null,
    toTokenAccount.instruction!,
    closePositionIx,
    ...jupiterIxs,
    repaySolIx,
    computeBudgetMicroLamports ? computeFeeIx : undefined,
  ].filter((i) => !!i);

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions: allInstructions,
  }).compileToV0Message(addressLookupTableAccounts);

  const tx = new VersionedTransaction(messageV0);

  return tx;
};

export const getDelegateAccounts = async (
  lavarageProgram: Program<Lavarage> | Program<LavarageV2>,
  userPubKey?: PublicKey
) => {
  const delegateAccounts = await lavarageProgram.account.delegate.all(
    userPubKey
      ? [
          {
            memcmp: {
              offset: 104,
              bytes: userPubKey.toBase58(),
            },
          },
        ]
      : undefined
  );
  return delegateAccounts.map((d) => ({
    ...d,
    parsed: {
      tpPrice: new BN(d.account.field1),
      tpThreshold: new BN(d.account.field2),
    },
  }));
};

const getQuoteCurrencySpecificAddressLookupTable = (quoteCurrency: string) => {
  switch (quoteCurrency) {
    case "J9BcrQfX4p9D1bvLzRNCbMDv8f44a9LFdeqNE4Yk2WMD":
      return "2EdNtwVhyjkEgkKDC7GShfSSczZYMKLuJraeoJzG4E4R";
    case "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v":
      return "CxLE1LRaZg2eYygzFfVRhgmSACsvqzyhySDrMHq3QSab";
    default:
      return "2EdNtwVhyjkEgkKDC7GShfSSczZYMKLuJraeoJzG4E4R";
  }
};

export const splitPositionV2 = async (
  lavarageProgram: Program<LavarageV2> | Program<Lavarage>,
  position: ProgramAccount<{
    pool: PublicKey;
    seed: PublicKey;
    userPaid: BN;
    amount: BN;
  }>,
  offer: ProgramAccount<{
    nodeWallet: PublicKey;
    interestRate: number;
    collateralType: PublicKey;
  }>,
  quoteToken: PublicKey,
  propotionBps: number,
  computeBudgetMicroLamports?: number
) => {
  const positionAccountPDA = position.publicKey;

  const newPosition1Seed = Keypair.generate().publicKey;
  const newPosition2Seed = Keypair.generate().publicKey;

  const newPosition1AccountPDA = getPositionAccountPDA(
    lavarageProgram,
    offer,
    newPosition1Seed
  );
  const newPosition2AccountPDA = getPositionAccountPDA(
    lavarageProgram,
    offer,
    newPosition2Seed
  );

  const mintAccount = await lavarageProgram.provider.connection.getAccountInfo(
    offer.account.collateralType
  );
  const tokenProgram = mintAccount?.owner;

  const newPosition1TokenAccount = getAssociatedTokenAddressSync(
    offer.account.collateralType,
    newPosition1AccountPDA,
    true,
    tokenProgram
  );
  const newPosition2TokenAccount = getAssociatedTokenAddressSync(
    offer.account.collateralType,
    newPosition2AccountPDA,
    true,
    tokenProgram
  );

  const createNewPosition1TokenAccountIx =
    createAssociatedTokenAccountInstruction(
      lavarageProgram.provider.publicKey!,
      newPosition1TokenAccount,
      newPosition1AccountPDA,
      offer.account.collateralType,
      tokenProgram!
    );

  const createNewPosition2TokenAccountIx =
    createAssociatedTokenAccountInstruction(
      lavarageProgram.provider.publicKey!,
      newPosition2TokenAccount,
      newPosition2AccountPDA,
      offer.account.collateralType,
      tokenProgram!
    );

  const ix = await lavarageProgram.methods
    .tradingManagementSplitPosition(
      new BN(propotionBps),
      newPosition1Seed,
      newPosition2Seed
    )
    .accountsStrict({
      originalPosition: positionAccountPDA,
      newPositionOne: newPosition1AccountPDA,
      newPositionTwo: newPosition2AccountPDA,
      trader: lavarageProgram.provider.publicKey!,
      systemProgram: SystemProgram.programId,
      mint: offer.account.collateralType,
      tokenProgram: tokenProgram!,
      originalPositionTokenAccount: getAssociatedTokenAddressSync(
        offer.account.collateralType,
        positionAccountPDA,
        true,
        tokenProgram
      ),
      newPositionTokenAccountOne: newPosition1TokenAccount,
      newPositionTokenAccountTwo: newPosition2TokenAccount,
    })
    .instruction();

  const computeBudgetIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: computeBudgetMicroLamports ?? 100000,
  });

  const allInstructions = [
    createNewPosition1TokenAccountIx,
    createNewPosition2TokenAccountIx,
    ix,
    computeBudgetIx,
  ].filter((i) => !!i);

  const { blockhash } =
    await lavarageProgram.provider.connection.getLatestBlockhash("finalized");

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions: allInstructions,
  }).compileToV0Message();

  const tx = new VersionedTransaction(messageV0);

  return {
    transaction: tx,
    newPositionAddresses: [
      newPosition1AccountPDA.toBase58(),
      newPosition2AccountPDA.toBase58(),
    ],
  };
};

export const mergePositionV2 = async (
  lavarageProgram: Program<LavarageV2>,
  position1: ProgramAccount<{
    pool: PublicKey;
    seed: PublicKey;
    userPaid: BN;
    amount: BN;
  }>,
  position2: ProgramAccount<{
    pool: PublicKey;
    seed: PublicKey;
    userPaid: BN;
    amount: BN;
  }>,
  offer: ProgramAccount<{
    nodeWallet: PublicKey;
    interestRate: number;
    collateralType: PublicKey;
  }>,
  quoteToken: PublicKey,
  computeBudgetMicroLamports?: number
) => {
  const positionAccountPDA1 = position1.publicKey;
  const positionAccountPDA2 = position2.publicKey;

  const newPositionSeed = Keypair.generate().publicKey;

  const newPositionAccountPDA = getPositionAccountPDA(
    lavarageProgram,
    offer,
    newPositionSeed
  );

  const mintAccount = await lavarageProgram.provider.connection.getAccountInfo(
    offer.account.collateralType
  );
  const tokenProgram = mintAccount?.owner;

  const newPositionTokenAccount = getAssociatedTokenAddressSync(
    offer.account.collateralType,
    newPositionAccountPDA,
    true,
    tokenProgram
  );

  const createNewPositionTokenAccountIx =
    createAssociatedTokenAccountInstruction(
      lavarageProgram.provider.publicKey!,
      newPositionTokenAccount,
      newPositionAccountPDA,
      offer.account.collateralType,
      tokenProgram!
    );

  const ix = await lavarageProgram.methods
    .tradingManagementMergePositions(newPositionSeed)
    .accountsStrict({
      mergedPosition: newPositionAccountPDA,
      positionOne: positionAccountPDA1,
      positionTwo: positionAccountPDA2,
      trader: lavarageProgram.provider.publicKey!,
      systemProgram: SystemProgram.programId,
      mint: offer.account.collateralType,
      tokenProgram: tokenProgram!,
      positionOneTokenAccount: getAssociatedTokenAddressSync(
        offer.account.collateralType,
        positionAccountPDA1,
        true,
        tokenProgram
      ),
      positionTwoTokenAccount: getAssociatedTokenAddressSync(
        offer.account.collateralType,
        positionAccountPDA2,
        true,
        tokenProgram
      ),
      mergedPositionTokenAccount: newPositionTokenAccount,
    })
    .instruction();

  const computeBudgetIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: computeBudgetMicroLamports ?? 100000,
  });

  const allInstructions = [
    createNewPositionTokenAccountIx,
    ix,
    computeBudgetIx,
  ].filter((i) => !!i);

  const { blockhash } =
    await lavarageProgram.provider.connection.getLatestBlockhash("finalized");

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions: allInstructions,
  }).compileToV0Message();

  const tx = new VersionedTransaction(messageV0);

  return tx;
};

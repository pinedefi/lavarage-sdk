import { BN, Instruction, Program } from "@coral-xyz/anchor";
import { Lavarage } from "./idl/lavarage";
import { Lavarage as LavarageV2 } from "./idl/lavaragev2";
import {
  ComputeBudgetProgram,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
  getMint,
} from "@solana/spl-token";
import { getPda } from "./index";

export function getNodeWalletPDA(
  operatorPublicKey: PublicKey,
  mintPublicKey: PublicKey,
  programId: PublicKey
): PublicKey {
  return getPda(
    [
      Buffer.from("node_wallet"),
      operatorPublicKey.toBuffer(),
      mintPublicKey.toBuffer(),
    ],
    programId
  );
}

export function getTradingPoolPDA(
  poolOwnerPublicKey: PublicKey,
  tokenPublicKey: PublicKey,
  programId: PublicKey
): PublicKey {
  return getPda(
    [
      Buffer.from("trading_pool"),
      poolOwnerPublicKey.toBuffer(),
      tokenPublicKey.toBuffer(),
    ],
    programId
  );
}

async function createNodeWallet(
  lavarageProgram: Program<Lavarage> | Program<LavarageV2>,
  params: {
    operator: PublicKey;
    mint?: string; // Required for V2, optional for V1
    liquidationLtv?: number; // Required for V2, optional for V1
  }
): Promise<{
  instruction: TransactionInstruction;
  nodeWallet: Keypair | undefined;
  nodeWalletAccount: PublicKey;
}> {
  const { blockhash } =
    await lavarageProgram.provider.connection.getLatestBlockhash("finalized");

  let instruction, nodeWallet;

  // Check if this is V2 program (has mint and liquidationLtv parameters)
  if (params.mint !== undefined && params.liquidationLtv !== undefined) {
    nodeWallet = getNodeWalletPDA(
      new PublicKey(params.operator),
      new PublicKey(params.mint),
      lavarageProgram.programId
    );
    // V2 version
    instruction = await (lavarageProgram as Program<LavarageV2>).methods
      .lpOperatorCreateNodeWallet(new BN(params.liquidationLtv))
      .accounts({
        nodeWallet: nodeWallet,
        operator: new PublicKey(params.operator),
        systemProgram: SystemProgram.programId,
        mint: new PublicKey(params.mint),
      })
      .instruction();
  } else {
    nodeWallet = Keypair.generate();
    // V1 version
    instruction = await (lavarageProgram as Program<Lavarage>).methods
      .lpOperatorCreateNodeWallet()
      .accounts({
        nodeWallet: nodeWallet.publicKey,
        operator: new PublicKey(params.operator),
        systemProgram: SystemProgram.programId,
      })
      .instruction();
  }

  return {
    instruction,
    nodeWallet: nodeWallet instanceof Keypair ? nodeWallet : undefined,
    nodeWalletAccount:
      nodeWallet instanceof Keypair ? nodeWallet.publicKey : nodeWallet,
  };
}

export async function depositFunds(
  lavarageProgram: Program<Lavarage>,
  params: {
    nodeWallet: PublicKey;
    mint?: string; // Required for V2, optional for V1
    funder: PublicKey;
    amount: number;
    computeBudgetMicroLamports?: number;
  }
): Promise<VersionedTransaction> {
  const { blockhash } =
    await lavarageProgram.provider.connection.getLatestBlockhash("finalized");

  let instruction, createTokenAccountIx;
  if (params.mint === undefined) {
    const computeFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: params.computeBudgetMicroLamports ?? 150000,
    });
    instruction = await lavarageProgram.methods
      .lpOperatorFundNodeWallet(new BN(params.amount))
      .accounts({
        nodeWallet: params.nodeWallet,
        funder: params.funder,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
  } else {
    const mintPubkey = new PublicKey(params.mint);
    const mintOwner = await lavarageProgram.provider.connection.getAccountInfo(
      mintPubkey
    );
    const mintAccount = await getMint(
      lavarageProgram.provider.connection,
      mintPubkey,
      "confirmed",
      mintOwner?.owner
    );
    const computeFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: params.computeBudgetMicroLamports ?? 150000,
    });
    const destinationTokenAccount = getAssociatedTokenAddressSync(
      mintPubkey,
      new PublicKey(params.nodeWallet),
      true,
      mintOwner?.owner
    )
    createTokenAccountIx = createAssociatedTokenAccountIdempotentInstruction(
      lavarageProgram.provider.publicKey!,
      destinationTokenAccount,
      params.nodeWallet,
      new PublicKey(params.mint),
      mintOwner?.owner
    );
    instruction = createTransferCheckedInstruction(
      getAssociatedTokenAddressSync(
        mintPubkey,
        new PublicKey(params.funder),
        true,
        mintOwner?.owner
      ),
      new PublicKey(params.mint),
      destinationTokenAccount,
      lavarageProgram.provider.publicKey!,
      params.amount,
      mintAccount.decimals,
      [],
      mintOwner?.owner
    );
  }

  const computeFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: params.computeBudgetMicroLamports ?? 150000,
  });

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions: [createTokenAccountIx, instruction, computeFeeIx].filter(Boolean) as TransactionInstruction[],
  }).compileToV0Message();

  return new VersionedTransaction(messageV0);
}

export async function withdrawFundsV1(
  lavarageProgram: Program<Lavarage>,
  params: {
    nodeWallet: PublicKey;
    funder: PublicKey;
    amount: number;
    computeBudgetMicroLamports?: number;
  }
): Promise<VersionedTransaction> {
  const { blockhash } =
    await lavarageProgram.provider.connection.getLatestBlockhash("finalized");

  const instruction = await lavarageProgram.methods
    .lpOperatorWithdrawFromNodeWallet(new BN(params.amount))
    .accounts({
      nodeWallet: params.nodeWallet,
      funder: params.funder,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  const computeFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: params.computeBudgetMicroLamports ?? 150000,
  });

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions: [instruction, computeFeeIx],
  }).compileToV0Message();

  return new VersionedTransaction(messageV0);
}

export async function withdrawFundsV2(
  lavarageProgram: Program<LavarageV2>,
  params: {
    nodeWallet: PublicKey;
    funder: PublicKey;
    mint: string;
    amount: number;
    fromTokenAccount?: PublicKey; // Optional, will be derived if not provided
    toTokenAccount?: PublicKey; // Optional, will be derived if not provided
    computeBudgetMicroLamports?: number;
  }
): Promise<VersionedTransaction> {
  const { blockhash } =
    await lavarageProgram.provider.connection.getLatestBlockhash("finalized");

  const mintPubkey = new PublicKey(params.mint);

  // Derive token accounts if not provided
  const fromTokenAccount =
    params.fromTokenAccount ||
    getAssociatedTokenAddressSync(mintPubkey, params.nodeWallet, true);
  const toTokenAccount =
    params.toTokenAccount ||
    getAssociatedTokenAddressSync(mintPubkey, params.funder);

  const instruction = await lavarageProgram.methods
    .lpOperatorWithdrawFromNodeWallet(new BN(params.amount))
    .accounts({
      nodeWallet: params.nodeWallet,
      funder: params.funder,
      systemProgram: SystemProgram.programId,
      mint: mintPubkey,
      fromTokenAccount,
      toTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction();

  const computeFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: params.computeBudgetMicroLamports ?? 150000,
  });

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions: [instruction, computeFeeIx],
  }).compileToV0Message();

  return new VersionedTransaction(messageV0);
}

// Unified withdraw function that works with both V1 and V2
export async function withdrawFunds(
  lavarageProgram: Program<Lavarage> | Program<LavarageV2>,
  params: {
    nodeWallet: PublicKey;
    funder: PublicKey;
    amount: number;
    mint?: string; // Required for V2, optional for V1
    fromTokenAccount?: PublicKey; // Only used for V2
    toTokenAccount?: PublicKey; // Only used for V2
    computeBudgetMicroLamports?: number;
  }
): Promise<VersionedTransaction> {
  // Check if mint is provided to determine if this is V2
  if (params.mint) {
    return withdrawFundsV2(lavarageProgram as Program<LavarageV2>, {
      nodeWallet: params.nodeWallet,
      funder: params.funder,
      mint: params.mint,
      amount: params.amount,
      fromTokenAccount: params.fromTokenAccount,
      toTokenAccount: params.toTokenAccount,
      computeBudgetMicroLamports: params.computeBudgetMicroLamports,
    });
  } else {
    return withdrawFundsV1(lavarageProgram as Program<Lavarage>, {
      nodeWallet: params.nodeWallet,
      funder: params.funder,
      amount: params.amount,
      computeBudgetMicroLamports: params.computeBudgetMicroLamports,
    });
  }
}

export async function createOffer(
  lavarageProgram: Program<Lavarage> | Program<LavarageV2>,
  params: {
    tradingPool: PublicKey;
    poolOwner: PublicKey;
    // the collateral mint
    mint: string;
    // the quote mint
    quoteMint: string;
    interestRate: number;
    maxExposure: number;
    computeBudgetMicroLamports?: number;
  }
): Promise<VersionedTransaction> {
  
  let nodeWalletAccount, nodeWalletSigner, createNodeWalletInstruction, nodeWalletPubKey;

  if (params.quoteMint === "So11111111111111111111111111111111111111112") {
    const nodeWallets = await lavarageProgram.account.nodeWallet.all();
    nodeWalletAccount = nodeWallets.find((wallet) =>
      wallet.account.nodeOperator.equals(new PublicKey(params.poolOwner)),
    );
  } else {
    const nodeWalletPda = getNodeWalletPDA(
      new PublicKey(params.poolOwner),
      new PublicKey(params.quoteMint),
      lavarageProgram.programId
    );
    const nodeWalletAccountInfo = await lavarageProgram.provider.connection.getAccountInfo(nodeWalletPda);
    if (nodeWalletAccountInfo) {
      nodeWalletAccount = {
        publicKey: nodeWalletPda,
      };
    }
  }

  if (!nodeWalletAccount?.account) {
    // Determine if this is V2 based on mint (SOL = V1, others = V2)
    const isSOL = params.quoteMint === "So11111111111111111111111111111111111111112";

    const {
      instruction,
      nodeWallet,
      nodeWalletAccount: nodeWalletPublicKey,
    } = await createNodeWallet(lavarageProgram, {
      operator: new PublicKey(params.poolOwner.toBase58()),
      mint: isSOL ? undefined : params.quoteMint, // Only pass mint for V2 (non-SOL)
      liquidationLtv: isSOL ? undefined : 90, // Only pass liquidationLtv for V2 (non-SOL)
    });
    nodeWalletSigner = nodeWallet;
    createNodeWalletInstruction = instruction;
    nodeWalletPubKey = nodeWalletPublicKey;
  } else {
    nodeWalletPubKey = nodeWalletAccount.publicKey;
  }

  const { blockhash } =
    await lavarageProgram.provider.connection.getLatestBlockhash("finalized");

  // Both V1 and V2 lpOperatorCreateTradingPool require mint parameter
  const instruction = await lavarageProgram.methods
    .lpOperatorCreateTradingPool(new BN(params.interestRate))
    .accounts({
      tradingPool: params.tradingPool,
      operator: params.poolOwner,
      nodeWallet: nodeWalletPubKey,
      mint: new PublicKey(params.mint), // Always required for both V1 and V2
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  const updateMaxExposureInstruction = await lavarageProgram.methods
    .lpOperatorUpdateMaxExposure(new BN(params.maxExposure))
    .accounts({
      tradingPool: params.tradingPool,
      nodeWallet: nodeWalletPubKey,
      operator: params.poolOwner,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  const computeFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: params.computeBudgetMicroLamports ?? 150000,
  });

  const transferInstruction = SystemProgram.transfer({
    fromPubkey: lavarageProgram.provider.publicKey!,
    toPubkey: new PublicKey("BMME51pfWdBfakTEMuQbNP4NG3wCY4Fo47dKatThhXGQ"),
    lamports: 0.3 * LAMPORTS_PER_SOL
  });

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions: [
      createNodeWalletInstruction === undefined
        ? null
        : createNodeWalletInstruction,
      instruction,
      updateMaxExposureInstruction,
      transferInstruction,
      computeFeeIx,
    ].filter(Boolean) as TransactionInstruction[],
  }).compileToV0Message();

  if (nodeWalletSigner) {
    const transaction = new VersionedTransaction(messageV0);
    transaction.sign([nodeWalletSigner]);
    return transaction;
  }

  return new VersionedTransaction(messageV0);
}

export async function updateMaxExposure(
  lavarageProgram: Program<Lavarage> | Program<LavarageV2>,
  params: {
    tradingPool: PublicKey;
    nodeWallet: string;
    poolOwner: PublicKey;
    maxExposure: number;
    computeBudgetMicroLamports?: number;
  }
): Promise<VersionedTransaction> {
  const { blockhash } =
    await lavarageProgram.provider.connection.getLatestBlockhash("finalized");

  const instruction = await lavarageProgram.methods
    .lpOperatorUpdateMaxExposure(new BN(params.maxExposure))
    .accounts({
      tradingPool: params.tradingPool,
      nodeWallet: new PublicKey(params.nodeWallet),
      operator: params.poolOwner,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  const computeFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: params.computeBudgetMicroLamports ?? 150000,
  });

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions: [instruction, computeFeeIx],
  }).compileToV0Message();

  return new VersionedTransaction(messageV0);
}

export async function updateInterestRate(
  lavarageProgram: Program<Lavarage> | Program<LavarageV2>,
  params: {
    tradingPool: PublicKey;
    nodeWallet: string;
    poolOwner: PublicKey;
    interestRate: number;
    computeBudgetMicroLamports?: number;
  }
): Promise<VersionedTransaction> {
  const { blockhash } =
    await lavarageProgram.provider.connection.getLatestBlockhash("finalized");

  const instruction = await lavarageProgram.methods
    .lpOperatorUpdateInterestRate(new BN(params.interestRate))
    .accounts({
      tradingPool: params.tradingPool,
      nodeWallet: new PublicKey(params.nodeWallet),
      operator: params.poolOwner,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  const computeFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: params.computeBudgetMicroLamports ?? 150000,
  });

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions: [instruction, computeFeeIx],
  }).compileToV0Message();

  return new VersionedTransaction(messageV0);
}

export async function updateOffer(
  lavarageProgram: Program<Lavarage> | Program<LavarageV2>,
  params: {
    tradingPool: PublicKey;
    poolOwner: PublicKey;
    nodeWallet: string;
    mint: string;
    interestRate: number;
    maxExposure: number;
    computeBudgetMicroLamports?: number;
    //includeCreatePool?: boolean; // Optional flag to include pool creation
  }
): Promise<VersionedTransaction> {
  const { blockhash } =
    await lavarageProgram.provider.connection.getLatestBlockhash("finalized");

  const instructions = [];

  // // Optionally include pool creation instruction
  // if (params.includeCreatePool) {
  //   const createPoolInstruction = await lavarageProgram.methods
  //     .lpOperatorCreateTradingPool(new BN(params.interestRate))
  //     .accounts({
  //       tradingPool: params.tradingPool,
  //       operator: params.poolOwner,
  //       nodeWallet: new PublicKey(params.nodeWallet),
  //       mint: new PublicKey(params.mint),
  //       systemProgram: SystemProgram.programId,
  //     })
  //     .instruction();

  //   instructions.push(createPoolInstruction);
  // }

  // Update max exposure instruction
  const updateMaxExposureInstruction = await lavarageProgram.methods
    .lpOperatorUpdateMaxExposure(new BN(params.maxExposure))
    .accounts({
      tradingPool: params.tradingPool,
      nodeWallet: new PublicKey(params.nodeWallet),
      operator: params.poolOwner,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  // Update interest rate instruction
  const updateInterestRateInstruction = await lavarageProgram.methods
    .lpOperatorUpdateInterestRate(new BN(params.interestRate))
    .accounts({
      tradingPool: params.tradingPool,
      nodeWallet: new PublicKey(params.nodeWallet),
      operator: params.poolOwner,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  const computeFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: params.computeBudgetMicroLamports ?? 150000,
  });

  instructions.push(
    updateMaxExposureInstruction,
    updateInterestRateInstruction,
    computeFeeIx
  );

  const messageV0 = new TransactionMessage({
    payerKey: lavarageProgram.provider.publicKey!,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message();

  return new VersionedTransaction(messageV0);
}

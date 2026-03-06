/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/lavarage.json`.
 */
export type Lavarage = {
  "address": "CRSeeBqjDnm3UPefJ9gxrtngTsnQRhEJiTA345Q83X3v",
  "metadata": {
    "name": "lavarage",
    "version": "0.1.0",
    "spec": "0.1.0"
  },
  "instructions": [
    {
      "name": "lpOperatorCreateTradingPool",
      "discriminator": [
        182,
        99,
        232,
        188,
        202,
        38,
        71,
        211
      ],
      "accounts": [
        {
          "name": "tradingPool",
          "writable": true
        },
        {
          "name": "operator",
          "writable": true,
          "signer": true
        },
        {
          "name": "nodeWallet"
        },
        {
          "name": "mint"
        },
        {
          "name": "systemProgram"
        }
      ],
      "args": [
        {
          "name": "interestRate",
          "type": "u8"
        }
      ]
    },
    {
      "name": "lpOperatorCreateNodeWallet",
      "discriminator": [
        193,
        83,
        139,
        125,
        229,
        111,
        150,
        164
      ],
      "accounts": [
        {
          "name": "nodeWallet",
          "writable": true
        },
        {
          "name": "operator",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram"
        }
      ],
      "args": []
    },
    {
      "name": "lpOperatorFundNodeWallet",
      "discriminator": [
        204,
        29,
        191,
        156,
        11,
        132,
        135,
        61
      ],
      "accounts": [
        {
          "name": "nodeWallet",
          "writable": true
        },
        {
          "name": "funder",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "lpOperatorWithdrawFromNodeWallet",
      "discriminator": [
        162,
        244,
        237,
        100,
        96,
        130,
        60,
        117
      ],
      "accounts": [
        {
          "name": "nodeWallet",
          "writable": true
        },
        {
          "name": "funder",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram"
        },
        {
          "name": "withdrawalAccessList"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "lpOperatorUpdateMaxBorrow",
      "discriminator": [
        47,
        66,
        56,
        156,
        203,
        107,
        44,
        148
      ],
      "accounts": [
        {
          "name": "tradingPool",
          "writable": true
        },
        {
          "name": "nodeWallet"
        },
        {
          "name": "operator",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "lpOperatorUpdateMaxExposure",
      "discriminator": [
        43,
        226,
        68,
        201,
        78,
        18,
        155,
        107
      ],
      "accounts": [
        {
          "name": "tradingPool",
          "writable": true
        },
        {
          "name": "nodeWallet"
        },
        {
          "name": "operator",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "lpOperatorUpdateInterestRate",
      "discriminator": [
        25,
        217,
        30,
        158,
        210,
        240,
        173,
        10
      ],
      "accounts": [
        {
          "name": "tradingPool",
          "writable": true
        },
        {
          "name": "nodeWallet"
        },
        {
          "name": "operator",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u8"
        }
      ]
    },
    {
      "name": "lpLiquidate",
      "discriminator": [
        36,
        244,
        70,
        20,
        135,
        159,
        86,
        149
      ],
      "accounts": [
        {
          "name": "mint"
        },
        {
          "name": "positionAccount",
          "writable": true
        },
        {
          "name": "trader",
          "writable": true
        },
        {
          "name": "tradingPool",
          "writable": true
        },
        {
          "name": "fromTokenAccount",
          "writable": true
        },
        {
          "name": "toTokenAccount",
          "writable": true
        },
        {
          "name": "nodeWallet",
          "writable": true
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "randomAccountAsId"
        },
        {
          "name": "clock"
        },
        {
          "name": "operator",
          "signer": true
        },
        {
          "name": "oracle",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "positionSize",
          "type": "u64"
        }
      ]
    },
    {
      "name": "lpCollectInterest",
      "discriminator": [
        181,
        55,
        21,
        23,
        53,
        171,
        73,
        115
      ],
      "accounts": [
        {
          "name": "mint"
        },
        {
          "name": "positionAccount",
          "writable": true
        },
        {
          "name": "trader",
          "writable": true
        },
        {
          "name": "tradingPool",
          "writable": true
        },
        {
          "name": "fromTokenAccount",
          "writable": true
        },
        {
          "name": "toTokenAccount",
          "writable": true
        },
        {
          "name": "nodeWallet",
          "writable": true
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "randomAccountAsId"
        },
        {
          "name": "clock"
        },
        {
          "name": "operator",
          "signer": true
        },
        {
          "name": "oracle",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "price",
          "type": "u128"
        }
      ]
    },
    {
      "name": "tradingOpenBorrow",
      "discriminator": [
        53,
        88,
        1,
        144,
        58,
        65,
        182,
        60
      ],
      "accounts": [
        {
          "name": "positionAccount",
          "writable": true
        },
        {
          "name": "trader",
          "writable": true,
          "signer": true
        },
        {
          "name": "tradingPool",
          "writable": true
        },
        {
          "name": "nodeWallet",
          "writable": true
        },
        {
          "name": "instructions"
        },
        {
          "name": "systemProgram"
        },
        {
          "name": "clock"
        },
        {
          "name": "randomAccountAsId"
        },
        {
          "name": "feeReceipient",
          "writable": true
        },
        {
          "name": "positionTokenAccount",
          "writable": true
        },
        {
          "name": "collateralTokenProgram"
        },
        {
          "name": "associatedTokenProgram"
        },
        {
          "name": "collateralMint"
        },
        {
          "name": "usersTokenAccount",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "positionSize",
          "type": "u64"
        },
        {
          "name": "userPays",
          "type": "u64"
        }
      ]
    },
    {
      "name": "tradingOpenBorrowWithReferral",
      "discriminator": [
        126,
        119,
        109,
        0,
        131,
        111,
        251,
        238
      ],
      "accounts": [
        {
          "name": "positionAccount",
          "writable": true
        },
        {
          "name": "trader",
          "writable": true,
          "signer": true
        },
        {
          "name": "tradingPool",
          "writable": true
        },
        {
          "name": "nodeWallet",
          "writable": true
        },
        {
          "name": "instructions"
        },
        {
          "name": "systemProgram"
        },
        {
          "name": "clock"
        },
        {
          "name": "randomAccountAsId"
        },
        {
          "name": "feeReceipient",
          "writable": true
        },
        {
          "name": "positionTokenAccount",
          "writable": true
        },
        {
          "name": "collateralTokenProgram"
        },
        {
          "name": "associatedTokenProgram"
        },
        {
          "name": "collateralMint"
        },
        {
          "name": "usersTokenAccount",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "positionSize",
          "type": "u64"
        },
        {
          "name": "userPays",
          "type": "u64"
        },
        {
          "name": "discountBps",
          "type": "u64"
        },
        {
          "name": "referralBps",
          "type": "u64"
        }
      ]
    },
    {
      "name": "tradingOpenAddCollateral",
      "discriminator": [
        21,
        160,
        90,
        163,
        189,
        122,
        164,
        50
      ],
      "accounts": [
        {
          "name": "positionAccount",
          "writable": true
        },
        {
          "name": "trader",
          "writable": true,
          "signer": true
        },
        {
          "name": "tradingPool",
          "writable": true
        },
        {
          "name": "systemProgram"
        },
        {
          "name": "mint"
        },
        {
          "name": "toTokenAccount",
          "writable": true
        },
        {
          "name": "randomAccountAsId"
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "associatedTokenProgram"
        }
      ],
      "args": [
        {
          "name": "maxInterestRate",
          "type": "u8"
        }
      ]
    },
    {
      "name": "tradingCloseBorrowCollateral",
      "discriminator": [
        160,
        104,
        113,
        179,
        42,
        80,
        8,
        16
      ],
      "accounts": [
        {
          "name": "positionAccount",
          "writable": true
        },
        {
          "name": "trader",
          "writable": true,
          "signer": true
        },
        {
          "name": "tradingPool",
          "writable": true
        },
        {
          "name": "instructions"
        },
        {
          "name": "systemProgram"
        },
        {
          "name": "mint"
        },
        {
          "name": "fromTokenAccount",
          "writable": true
        },
        {
          "name": "toTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "clock"
        },
        {
          "name": "randomAccountAsId"
        },
        {
          "name": "associatedTokenProgram"
        }
      ],
      "args": []
    },
    {
      "name": "tradingDataAccruedInterest",
      "discriminator": [
        227,
        39,
        217,
        0,
        88,
        3,
        25,
        115
      ],
      "accounts": [
        {
          "name": "positionAccount",
          "writable": true
        },
        {
          "name": "trader",
          "writable": true,
          "signer": true
        },
        {
          "name": "tradingPool",
          "writable": true
        },
        {
          "name": "nodeWallet",
          "writable": true
        },
        {
          "name": "systemProgram"
        },
        {
          "name": "clock"
        },
        {
          "name": "randomAccountAsId"
        },
        {
          "name": "feeReceipient",
          "writable": true
        }
      ],
      "args": [],
      "returns": "u64"
    },
    {
      "name": "tradingCloseRepaySol",
      "discriminator": [
        74,
        90,
        5,
        111,
        35,
        171,
        135,
        56
      ],
      "accounts": [
        {
          "name": "positionAccount",
          "writable": true
        },
        {
          "name": "trader",
          "writable": true,
          "signer": true
        },
        {
          "name": "tradingPool",
          "writable": true
        },
        {
          "name": "nodeWallet",
          "writable": true
        },
        {
          "name": "systemProgram"
        },
        {
          "name": "clock"
        },
        {
          "name": "randomAccountAsId"
        },
        {
          "name": "feeReceipient",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "closingPositionSize",
          "type": "u64"
        },
        {
          "name": "closeType",
          "type": "u64"
        }
      ]
    },
    {
      "name": "tradingCloseRepaySolWithReferral",
      "discriminator": [
        113,
        176,
        203,
        24,
        224,
        228,
        31,
        35
      ],
      "accounts": [
        {
          "name": "positionAccount",
          "writable": true
        },
        {
          "name": "trader",
          "writable": true,
          "signer": true
        },
        {
          "name": "tradingPool",
          "writable": true
        },
        {
          "name": "nodeWallet",
          "writable": true
        },
        {
          "name": "systemProgram"
        },
        {
          "name": "clock"
        },
        {
          "name": "randomAccountAsId"
        },
        {
          "name": "feeReceipient",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "closingPositionSize",
          "type": "u64"
        },
        {
          "name": "closeType",
          "type": "u64"
        },
        {
          "name": "discountBps",
          "type": "u64"
        },
        {
          "name": "referralBps",
          "type": "u64"
        }
      ]
    },
    {
      "name": "tradingClosePartialRepaySol",
      "discriminator": [
        29,
        236,
        62,
        88,
        170,
        105,
        68,
        2
      ],
      "accounts": [
        {
          "name": "positionAccount",
          "writable": true
        },
        {
          "name": "trader",
          "writable": true,
          "signer": true
        },
        {
          "name": "tradingPool",
          "writable": true
        },
        {
          "name": "nodeWallet",
          "writable": true
        },
        {
          "name": "systemProgram"
        },
        {
          "name": "clock"
        },
        {
          "name": "randomAccountAsId"
        },
        {
          "name": "feeReceipient",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "repayPercentage",
          "type": "u64"
        }
      ]
    },
    {
      "name": "tradingClosePositionAccount",
      "discriminator": [
        112,
        178,
        77,
        58,
        204,
        138,
        62,
        85
      ],
      "accounts": [
        {
          "name": "positionAccount",
          "writable": true
        },
        {
          "name": "admin",
          "signer": true
        },
        {
          "name": "feeReceipient",
          "writable": true
        },
        {
          "name": "systemProgram"
        }
      ],
      "args": []
    },
    {
      "name": "tradingClosePoolAccount",
      "discriminator": [
        226,
        22,
        159,
        126,
        37,
        223,
        57,
        107
      ],
      "accounts": [
        {
          "name": "poolAccount",
          "writable": true
        },
        {
          "name": "operator",
          "signer": true
        },
        {
          "name": "admin",
          "signer": true
        },
        {
          "name": "feeReceipient",
          "writable": true
        },
        {
          "name": "systemProgram"
        }
      ],
      "args": []
    },
    {
      "name": "syncNodeWallet",
      "discriminator": [
        185,
        205,
        57,
        48,
        112,
        135,
        240,
        250
      ],
      "accounts": [
        {
          "name": "nodeWallet",
          "writable": true
        },
        {
          "name": "funder",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram"
        }
      ],
      "args": []
    },
    {
      "name": "tradingCreateTpDelegate",
      "discriminator": [
        174,
        200,
        59,
        127,
        100,
        216,
        183,
        8
      ],
      "accounts": [
        {
          "name": "delegate",
          "writable": true
        },
        {
          "name": "originalOperator",
          "writable": true,
          "signer": true
        },
        {
          "name": "delegatedAccount"
        },
        {
          "name": "systemProgram"
        }
      ],
      "args": [
        {
          "name": "price",
          "type": "u64"
        },
        {
          "name": "lowerThreshold",
          "type": "u64"
        },
        {
          "name": "delegateOperator",
          "type": "pubkey"
        },
        {
          "name": "partialPercentage",
          "type": "u64"
        }
      ]
    },
    {
      "name": "tradingRemoveTpDelegate",
      "discriminator": [
        88,
        18,
        149,
        143,
        124,
        43,
        68,
        178
      ],
      "accounts": [
        {
          "name": "delegate",
          "writable": true
        },
        {
          "name": "originalOperator",
          "writable": true,
          "signer": true
        },
        {
          "name": "delegatedAccount"
        },
        {
          "name": "systemProgram"
        }
      ],
      "args": []
    },
    {
      "name": "delegateExecuteTp",
      "discriminator": [
        207,
        251,
        148,
        38,
        214,
        153,
        54,
        242
      ],
      "accounts": [
        {
          "name": "delegate",
          "writable": true
        },
        {
          "name": "delegateOperator",
          "signer": true
        },
        {
          "name": "account",
          "writable": true
        },
        {
          "name": "tradingPool",
          "writable": true
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "positionTokenAccount",
          "writable": true
        },
        {
          "name": "delegateTokenAccount",
          "writable": true
        },
        {
          "name": "systemProgram"
        },
        {
          "name": "mint"
        }
      ],
      "args": [
        {
          "name": "seed",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "delegateClosePosition",
      "discriminator": [
        100,
        249,
        236,
        96,
        249,
        195,
        17,
        157
      ],
      "accounts": [
        {
          "name": "delegate",
          "writable": true
        },
        {
          "name": "delegateOperator",
          "signer": true
        },
        {
          "name": "account",
          "writable": true
        },
        {
          "name": "tradingPool",
          "writable": true
        },
        {
          "name": "nodeWallet",
          "writable": true
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "nodeWalletTokenAccount",
          "writable": true
        },
        {
          "name": "delegateTokenAccount",
          "writable": true
        },
        {
          "name": "feeTokenAccount",
          "writable": true
        },
        {
          "name": "profitTokenAccount",
          "writable": true
        },
        {
          "name": "systemProgram"
        },
        {
          "name": "qtMint"
        }
      ],
      "args": [
        {
          "name": "closingPositionSize",
          "type": "u64"
        }
      ]
    },
    {
      "name": "tradingManagementSplitPosition",
      "discriminator": [
        230,
        180,
        252,
        200,
        8,
        246,
        131,
        54
      ],
      "accounts": [
        {
          "name": "originalPosition",
          "writable": true
        },
        {
          "name": "newPositionOne",
          "writable": true
        },
        {
          "name": "newPositionTwo",
          "writable": true
        },
        {
          "name": "mint"
        },
        {
          "name": "originalPositionTokenAccount",
          "writable": true
        },
        {
          "name": "newPositionTokenAccountOne",
          "writable": true
        },
        {
          "name": "newPositionTokenAccountTwo",
          "writable": true
        },
        {
          "name": "trader",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "systemProgram"
        }
      ],
      "args": [
        {
          "name": "splitRatioBps",
          "type": "u64"
        },
        {
          "name": "seed1",
          "type": "pubkey"
        },
        {
          "name": "seed2",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "initWithdrawalAccessList",
      "discriminator": [
        118,
        110,
        194,
        104,
        220,
        145,
        69,
        31
      ],
      "accounts": [
        {
          "name": "withdrawalAccessList",
          "writable": true
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram"
        }
      ],
      "args": []
    },
    {
      "name": "addWithdrawalAccess",
      "discriminator": [
        45,
        247,
        214,
        153,
        224,
        115,
        136,
        178
      ],
      "accounts": [
        {
          "name": "withdrawalAccessList",
          "writable": true
        },
        {
          "name": "nodeWallet"
        },
        {
          "name": "authority",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "toPubkey",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "removeWithdrawalAccess",
      "discriminator": [
        218,
        186,
        7,
        130,
        180,
        40,
        111,
        122
      ],
      "accounts": [
        {
          "name": "withdrawalAccessList",
          "writable": true
        },
        {
          "name": "authority",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "fromPubkey",
          "type": "string"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "delegate",
      "discriminator": [
        92,
        145,
        166,
        111,
        11,
        38,
        38,
        247
      ]
    },
    {
      "name": "nodeWallet",
      "discriminator": [
        48,
        117,
        214,
        115,
        125,
        23,
        94,
        246
      ]
    },
    {
      "name": "pool",
      "discriminator": [
        241,
        154,
        109,
        4,
        17,
        177,
        109,
        188
      ]
    },
    {
      "name": "position",
      "discriminator": [
        170,
        188,
        143,
        228,
        122,
        64,
        247,
        208
      ]
    },
    {
      "name": "withdrawalAccessList",
      "discriminator": [
        29,
        144,
        191,
        76,
        108,
        26,
        73,
        234
      ]
    }
  ],
  "events": [
    {
      "name": "positionCloseEvent",
      "discriminator": [
        85,
        5,
        166,
        100,
        218,
        87,
        230,
        129
      ]
    },
    {
      "name": "positionOpenEvent",
      "discriminator": [
        84,
        127,
        249,
        160,
        99,
        95,
        120,
        120
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "addressMismatch",
      "msg": "Address Mismatch"
    },
    {
      "code": 6001,
      "name": "programMismatch",
      "msg": "Program Mismatch"
    },
    {
      "code": 6002,
      "name": "missingRepay",
      "msg": "Missing Repay"
    },
    {
      "code": 6003,
      "name": "incorrectOwner",
      "msg": "Incorrect Owner"
    },
    {
      "code": 6004,
      "name": "incorrectProgramAuthority",
      "msg": "Incorrect Program Authority"
    },
    {
      "code": 6005,
      "name": "cannotBorrowBeforeRepay",
      "msg": "Cannot Borrow Before Repay"
    },
    {
      "code": 6006,
      "name": "unknownInstruction",
      "msg": "Unknown Instruction"
    },
    {
      "code": 6007,
      "name": "expectedCollateralNotEnough",
      "msg": "Expected collateral not enough"
    },
    {
      "code": 6008,
      "name": "forTesting",
      "msg": "testError"
    },
    {
      "code": 6009,
      "name": "blacklistedAccount",
      "msg": "Account is blacklisted"
    },
    {
      "code": 6010,
      "name": "closeStatusRecallTimestampZero",
      "msg": "Close status recall timestamp is zero"
    }
  ],
  "types": [
    {
      "name": "withdrawalAccessEntry",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "fromPubkey",
            "type": "string"
          },
          {
            "name": "toPubkey",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "lendingErrors",
      "docs": [
        "Errors for this program"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "addressMismatch"
          },
          {
            "name": "programMismatch"
          },
          {
            "name": "missingRepay"
          },
          {
            "name": "incorrectOwner"
          },
          {
            "name": "incorrectProgramAuthority"
          },
          {
            "name": "cannotBorrowBeforeRepay"
          },
          {
            "name": "unknownInstruction"
          },
          {
            "name": "expectedCollateralNotEnough"
          },
          {
            "name": "accessEntryAlreadyExists"
          },
          {
            "name": "accessEntryNotFound"
          },
          {
            "name": "unauthorizedWithdrawal"
          },
          {
            "name": "accountAlreadyInitialized"
          }
        ]
      }
    },
    {
      "name": "errorCode",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "invalidSignature"
          },
          {
            "name": "invalidOracle"
          }
        ]
      }
    },
    {
      "name": "errorCode",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "invalidSplitRatio"
          },
          {
            "name": "positionsNotMergeable"
          }
        ]
      }
    },
    {
      "name": "errorCode",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "onlyDelegateOperator"
          },
          {
            "name": "addressMismatch"
          },
          {
            "name": "invalidDelegateType"
          }
        ]
      }
    },
    {
      "name": "positionCloseType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "closedByUser"
          },
          {
            "name": "liquidated"
          }
        ]
      }
    },
    {
      "name": "delegate",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "delegateType",
            "type": "u8"
          },
          {
            "name": "field1",
            "type": "u64"
          },
          {
            "name": "field2",
            "type": "u64"
          },
          {
            "name": "field3",
            "type": "u64"
          },
          {
            "name": "field4",
            "type": "pubkey"
          },
          {
            "name": "field5",
            "type": "pubkey"
          },
          {
            "name": "originalOperator",
            "type": "pubkey"
          },
          {
            "name": "delegateOperator",
            "type": "pubkey"
          },
          {
            "name": "account",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "nodeWallet",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "totalFunds",
            "type": "u64"
          },
          {
            "name": "totalBorrowed",
            "type": "u64"
          },
          {
            "name": "maintenanceLtv",
            "type": "u8"
          },
          {
            "name": "liquidationLtv",
            "type": "u8"
          },
          {
            "name": "nodeOperator",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "pool",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "interestRate",
            "type": "u8"
          },
          {
            "name": "collateralType",
            "type": "pubkey"
          },
          {
            "name": "maxBorrow",
            "type": "u64"
          },
          {
            "name": "nodeWallet",
            "type": "pubkey"
          },
          {
            "name": "maxExposure",
            "type": "u64"
          },
          {
            "name": "currentExposure",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "position",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "closeStatusRecallTimestamp",
            "type": "u64"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "userPaid",
            "type": "u64"
          },
          {
            "name": "collateralAmount",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          },
          {
            "name": "trader",
            "type": "pubkey"
          },
          {
            "name": "seed",
            "type": "pubkey"
          },
          {
            "name": "closeTimestamp",
            "type": "i64"
          },
          {
            "name": "closingPositionSize",
            "type": "u64"
          },
          {
            "name": "interestRate",
            "type": "u8"
          },
          {
            "name": "lastInterestCollect",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "withdrawalAccessList",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "accessEntries",
            "type": {
              "vec": {
                "defined": {
                  "name": "withdrawalAccessEntry"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "positionCloseEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "userPaid",
            "type": "u64"
          },
          {
            "name": "collateralAmount",
            "type": "u64"
          },
          {
            "name": "openTimestamp",
            "type": "i64"
          },
          {
            "name": "trader",
            "type": "pubkey"
          },
          {
            "name": "closeType",
            "type": "u8"
          },
          {
            "name": "closeTimestamp",
            "type": "i64"
          },
          {
            "name": "closingPositionSize",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "positionOpenEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "userPaid",
            "type": "u64"
          },
          {
            "name": "collateralAmount",
            "type": "u64"
          },
          {
            "name": "openTimestamp",
            "type": "i64"
          },
          {
            "name": "trader",
            "type": "pubkey"
          }
        ]
      }
    }
  ]
};

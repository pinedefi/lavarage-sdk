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
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
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
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  119,
                  105,
                  116,
                  104,
                  100,
                  114,
                  97,
                  119,
                  97,
                  108,
                  95,
                  97,
                  99,
                  99,
                  101,
                  115,
                  115,
                  95,
                  108,
                  105,
                  115,
                  116
                ]
              }
            ]
          }
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
          "writable": true,
          "relations": [
            "delegate"
          ]
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
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
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
          "writable": true,
          "relations": [
            "delegate"
          ]
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
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "account"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "trading_pool.collateral_type",
                "account": "pool"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "delegateTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "delegateOperator"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "trading_pool.collateral_type",
                "account": "pool"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
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
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  119,
                  105,
                  116,
                  104,
                  100,
                  114,
                  97,
                  119,
                  97,
                  108,
                  95,
                  97,
                  99,
                  99,
                  101,
                  115,
                  115,
                  95,
                  108,
                  105,
                  115,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
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
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "trader"
              },
              {
                "kind": "account",
                "path": "tradingPool"
              },
              {
                "kind": "account",
                "path": "randomAccountAsId"
              }
            ]
          }
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
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "positionAccount"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
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
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        },
        {
          "name": "operator",
          "signer": true
        },
        {
          "name": "oracle",
          "signer": true
        },
        {
          "name": "oracleQueue",
          "address": "A43DyUGA7s8eXPxqEjJY6EBu1KKbNgfxF8h17VAHn13w"
        },
        {
          "name": "baseOracleQuote"
        },
        {
          "name": "clockSysvar",
          "address": "SysvarC1ock11111111111111111111111111111111"
        },
        {
          "name": "slotHashesSysvar",
          "address": "SysvarS1otHashes111111111111111111111111111"
        },
        {
          "name": "instructionsSysvar",
          "address": "Sysvar1nstructions1111111111111111111111111"
        }
      ],
      "args": []
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
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "trader"
              },
              {
                "kind": "account",
                "path": "tradingPool"
              },
              {
                "kind": "account",
                "path": "randomAccountAsId"
              }
            ]
          }
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
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "positionAccount"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
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
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
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
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
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
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  100,
                  105,
                  110,
                  103,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "operator"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
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
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "createTradingPoolArgs"
            }
          }
        }
      ]
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
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
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
      "name": "lpOperatorUpdateTradingPool",
      "discriminator": [
        99,
        179,
        6,
        181,
        30,
        148,
        30,
        204
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
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "updatePoolArgs"
            }
          }
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
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
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
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  119,
                  105,
                  116,
                  104,
                  100,
                  114,
                  97,
                  119,
                  97,
                  108,
                  95,
                  97,
                  99,
                  99,
                  101,
                  115,
                  115,
                  95,
                  108,
                  105,
                  115,
                  116
                ]
              }
            ]
          }
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
    },
    {
      "name": "rescueStuckTokens",
      "discriminator": [
        104,
        17,
        134,
        60,
        192,
        138,
        94,
        244
      ],
      "accounts": [
        {
          "name": "position",
          "writable": true
        },
        {
          "name": "pool",
          "writable": true
        },
        {
          "name": "nodeWallet",
          "writable": true
        },
        {
          "name": "positionTokenAccount",
          "writable": true
        },
        {
          "name": "traderTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "position.trader",
                "account": "position"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "positionMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "positionMint",
          "writable": true
        },
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenProgram"
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
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
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
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "trader"
              },
              {
                "kind": "account",
                "path": "tradingPool"
              },
              {
                "kind": "account",
                "path": "randomAccountAsId"
              }
            ]
          }
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
          "name": "instructions",
          "address": "Sysvar1nstructions1111111111111111111111111"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "mint"
        },
        {
          "name": "fromTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "positionAccount"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "toTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "trader"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
        },
        {
          "name": "randomAccountAsId"
        }
      ],
      "args": []
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
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "trader"
              },
              {
                "kind": "account",
                "path": "tradingPool"
              },
              {
                "kind": "account",
                "path": "randomAccountAsId"
              }
            ]
          }
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
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
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
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "trader"
              },
              {
                "kind": "account",
                "path": "tradingPool"
              },
              {
                "kind": "account",
                "path": "randomAccountAsId"
              }
            ]
          }
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
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
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
          "type": {
            "option": "u64"
          }
        },
        {
          "name": "referralBps",
          "type": {
            "option": "u64"
          }
        }
      ]
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
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "delegatedAccount"
              }
            ]
          }
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
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
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
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "trader"
              },
              {
                "kind": "account",
                "path": "tradingPool"
              },
              {
                "kind": "account",
                "path": "randomAccountAsId"
              }
            ]
          }
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
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
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
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "trader"
              },
              {
                "kind": "account",
                "path": "original_position.pool",
                "account": "position"
              },
              {
                "kind": "arg",
                "path": "seed1"
              }
            ]
          }
        },
        {
          "name": "newPositionTwo",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "trader"
              },
              {
                "kind": "account",
                "path": "original_position.pool",
                "account": "position"
              },
              {
                "kind": "arg",
                "path": "seed2"
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "originalPositionTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "originalPosition"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "newPositionTokenAccountOne",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "newPositionOne"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "newPositionTokenAccountTwo",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "newPositionTwo"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
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
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
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
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "trader"
              },
              {
                "kind": "account",
                "path": "tradingPool"
              },
              {
                "kind": "account",
                "path": "randomAccountAsId"
              }
            ]
          }
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
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "mint"
        },
        {
          "name": "toTokenAccount",
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "positionAccount"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "randomAccountAsId"
        },
        {
          "name": "oracleQueue",
          "address": "A43DyUGA7s8eXPxqEjJY6EBu1KKbNgfxF8h17VAHn13w"
        },
        {
          "name": "baseOracleQuote"
        },
        {
          "name": "quoteOracleQuote"
        },
        {
          "name": "clockSysvar",
          "address": "SysvarC1ock11111111111111111111111111111111"
        },
        {
          "name": "slotHashesSysvar",
          "address": "SysvarS1otHashes111111111111111111111111111"
        },
        {
          "name": "instructionsSysvar",
          "address": "Sysvar1nstructions1111111111111111111111111"
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
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "trader"
              },
              {
                "kind": "account",
                "path": "tradingPool"
              },
              {
                "kind": "account",
                "path": "randomAccountAsId"
              }
            ]
          }
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
          "name": "instructions",
          "address": "Sysvar1nstructions1111111111111111111111111"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "clock",
          "address": "SysvarC1ock11111111111111111111111111111111"
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
          "name": "positionSize",
          "type": "u64"
        },
        {
          "name": "userPays",
          "type": "u64"
        },
        {
          "name": "discountBps",
          "type": {
            "option": "u64"
          }
        },
        {
          "name": "referralBps",
          "type": {
            "option": "u64"
          }
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
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "delegatedAccount"
              }
            ]
          }
        },
        {
          "name": "originalOperator",
          "writable": true,
          "signer": true,
          "relations": [
            "delegate"
          ]
        },
        {
          "name": "delegatedAccount"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
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
      "name": "accessEntryAlreadyExists",
      "msg": "Access entry already exists"
    },
    {
      "code": 6011,
      "name": "accessEntryNotFound",
      "msg": "Access entry not found"
    },
    {
      "code": 6012,
      "name": "unauthorizedWithdrawal",
      "msg": "Unauthorized Withdrawal"
    },
    {
      "code": 6013,
      "name": "accountAlreadyInitialized",
      "msg": "Account already initialized"
    },
    {
      "code": 6014,
      "name": "invalidSignature",
      "msg": "The provided signature is invalid."
    },
    {
      "code": 6015,
      "name": "invalidOracle",
      "msg": "The provided oracle is invalid."
    },
    {
      "code": 6016,
      "name": "invalidSplitRatio",
      "msg": "Invalid split ratio. Must be between 1 and 99"
    },
    {
      "code": 6017,
      "name": "positionsNotMergeable",
      "msg": "Positions cannot be merged - must have same pool, trader, and interest rate"
    },
    {
      "code": 6018,
      "name": "onlyDelegateOperator",
      "msg": "Only delegate operator can execute TP"
    },
    {
      "code": 6019,
      "name": "invalidDelegateType",
      "msg": "Invalid delegate type"
    },
    {
      "code": 6020,
      "name": "missingRequiredPriceFeed",
      "msg": "Missing required price feed"
    },
    {
      "code": 6021,
      "name": "invalidPrice",
      "msg": "Price must be greater than 0"
    },
    {
      "code": 6022,
      "name": "mathOverflow",
      "msg": "Arithmetic operation overflow"
    }
  ],
  "types": [
    {
      "name": "createTradingPoolArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "interestRate",
            "type": "u8"
          },
          {
            "name": "feedId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "maxExposure",
            "type": "u64"
          },
          {
            "name": "openLtv",
            "type": "u16"
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
            "name": "unused0",
            "docs": [
              "Previously max_borrow. Can be repurposed again."
            ],
            "type": {
              "array": [
                "u8",
                8
              ]
            }
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
          },
          {
            "name": "feedId",
            "docs": [
              "Switchboard Oracle Quote Feed ID"
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "openLtv",
            "docs": [
              "The max loan-to-value (LTV) used to determine how much SOL can be borrowed per token (denoted in basis points)."
            ],
            "type": "u16"
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
    },
    {
      "name": "updatePoolArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "openLtv",
            "type": {
              "option": "u16"
            }
          },
          {
            "name": "interestRate",
            "type": {
              "option": "u8"
            }
          },
          {
            "name": "maxExposure",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "feedId",
            "type": {
              "option": {
                "array": [
                  "u8",
                  32
                ]
              }
            }
          }
        ]
      }
    },
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
    }
  ],
  "constants": [
    {
      "name": "maxBasisPoints",
      "type": "u16",
      "value": "10000"
    },
    {
      "name": "oracleMaxAge",
      "type": "u16",
      "value": "100"
    },
    {
      "name": "oraclePubKey",
      "type": "pubkey",
      "value": "joPUhu4So61QnYoGKy8yPDQsrq5xemKtyByHKwqQ7r4"
    }
  ]
};

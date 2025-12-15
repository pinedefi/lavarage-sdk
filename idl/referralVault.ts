export type UserVault = {
    "version": "0.1.0",
    "name": "user_vault",
    "instructions": [
      {
        "name": "initializeVault",
        "accounts": [
          {
            "name": "userVault",
            "isMut": true,
            "isSigner": false
          },
          {
            "name": "user",
            "isMut": true,
            "isSigner": false
          },
          {
            "name": "funder",
            "isMut": true,
            "isSigner": true
          },
          {
            "name": "systemProgram",
            "isMut": false,
            "isSigner": false
          }
        ],
        "args": []
      },
      {
        "name": "claimSol",
        "accounts": [
          {
            "name": "userVault",
            "isMut": true,
            "isSigner": false
          },
          {
            "name": "signer",
            "isMut": false,
            "isSigner": true
          },
          {
            "name": "recipient",
            "isMut": true,
            "isSigner": false
          },
          {
            "name": "systemProgram",
            "isMut": false,
            "isSigner": false
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
        "name": "claimToken",
        "accounts": [
          {
            "name": "userVault",
            "isMut": false,
            "isSigner": false
          },
          {
            "name": "vaultTokenAccount",
            "isMut": true,
            "isSigner": false
          },
          {
            "name": "recipientTokenAccount",
            "isMut": true,
            "isSigner": false
          },
          {
            "name": "tokenMint",
            "isMut": false,
            "isSigner": false
          },
          {
            "name": "signer",
            "isMut": false,
            "isSigner": true
          },
          {
            "name": "tokenProgram",
            "isMut": false,
            "isSigner": false
          }
        ],
        "args": [
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    ],
    "accounts": [
      {
        "name": "userVault",
        "type": {
          "kind": "struct",
          "fields": [
            {
              "name": "user",
              "type": "publicKey"
            },
            {
              "name": "authority",
              "type": "publicKey"
            },
            {
              "name": "bump",
              "type": "u8"
            },
            {
              "name": "totalSolClaimed",
              "type": "u64"
            }
          ]
        }
      }
    ],
    "errors": [
      {
        "code": 6000,
        "name": "UnauthorizedClaim",
        "msg": "Unauthorized: Only user or authority can claim"
      }
    ]
  };
  
  export const IDL: UserVault = {
    "version": "0.1.0",
    "name": "user_vault",
    "instructions": [
      {
        "name": "initializeVault",
        "accounts": [
          {
            "name": "userVault",
            "isMut": true,
            "isSigner": false
          },
          {
            "name": "user",
            "isMut": true,
            "isSigner": false
          },
          {
            "name": "funder",
            "isMut": true,
            "isSigner": true
          },
          {
            "name": "systemProgram",
            "isMut": false,
            "isSigner": false
          }
        ],
        "args": []
      },
      {
        "name": "claimSol",
        "accounts": [
          {
            "name": "userVault",
            "isMut": true,
            "isSigner": false
          },
          {
            "name": "signer",
            "isMut": false,
            "isSigner": true
          },
          {
            "name": "recipient",
            "isMut": true,
            "isSigner": false
          },
          {
            "name": "systemProgram",
            "isMut": false,
            "isSigner": false
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
        "name": "claimToken",
        "accounts": [
          {
            "name": "userVault",
            "isMut": false,
            "isSigner": false
          },
          {
            "name": "vaultTokenAccount",
            "isMut": true,
            "isSigner": false
          },
          {
            "name": "recipientTokenAccount",
            "isMut": true,
            "isSigner": false
          },
          {
            "name": "tokenMint",
            "isMut": false,
            "isSigner": false
          },
          {
            "name": "signer",
            "isMut": false,
            "isSigner": true
          },
          {
            "name": "tokenProgram",
            "isMut": false,
            "isSigner": false
          }
        ],
        "args": [
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    ],
    "accounts": [
      {
        "name": "userVault",
        "type": {
          "kind": "struct",
          "fields": [
            {
              "name": "user",
              "type": "publicKey"
            },
            {
              "name": "authority",
              "type": "publicKey"
            },
            {
              "name": "bump",
              "type": "u8"
            },
            {
              "name": "totalSolClaimed",
              "type": "u64"
            }
          ]
        }
      }
    ],
    "errors": [
      {
        "code": 6000,
        "name": "UnauthorizedClaim",
        "msg": "Unauthorized: Only user or authority can claim"
      }
    ]
  };
  
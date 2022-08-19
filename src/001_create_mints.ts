import { Provider } from "@project-serum/anchor";
import * as anchor from "@project-serum/anchor";

import {
  WhirlpoolContext, AccountFetcher, buildWhirlpoolClient, ORCA_WHIRLPOOL_PROGRAM_ID,
  PDAUtil, PoolUtil, WhirlpoolIx, InitConfigParams, WhirlpoolsConfigData, InitFeeTierParams, InitPoolParams, WhirlpoolData
} from "@orca-so/whirlpools-sdk";
import {
   EMPTY_INSTRUCTION, deriveATA, resolveOrCreateATA
} from "@orca-so/common-sdk";
import { MathUtil, PDA, Percentage } from "@orca-so/common-sdk";
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Account, Keypair, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction } from "@solana/web3.js";
import Decimal from "decimal.js";
import { TransactionBuilder, Instruction } from "@orca-so/common-sdk";
import { payer } from "./payer";
const defaultInitSqrtPrice = MathUtil.toX64_BN(new anchor.BN(5));

async function main() {
    const provider = Provider.env();
    const ctx = WhirlpoolContext.withProvider(provider, ORCA_WHIRLPOOL_PROGRAM_ID);
    let tokenXMintPubKey = await createMint(ctx.provider, ctx.wallet.publicKey)
    let tokenYMintPubKey = await createMint(ctx.provider, ctx.wallet.publicKey)
    let tokenAMintPubKey, tokenBMintPubKey;
    if (Buffer.compare(tokenXMintPubKey.toBuffer(), tokenYMintPubKey.toBuffer()) < 0) {
      tokenAMintPubKey = tokenXMintPubKey;
      tokenBMintPubKey = tokenYMintPubKey;
    } else {
      tokenAMintPubKey = tokenYMintPubKey;
      tokenBMintPubKey = tokenXMintPubKey;
    }
    console.log('tokenAMintPubKey',tokenAMintPubKey.toBase58(),'tokenBMintPubKey',tokenBMintPubKey.toBase58())
}

export async function createMint(
    provider: Provider,
    authority?: PublicKey
  ): Promise<PublicKey> {
    if (authority === undefined) {
      authority = provider.wallet.publicKey;
    }
    const mint = Keypair.generate();
    const instructions = await createMintInstructions(provider, authority, mint.publicKey);
  
    const tx = new Transaction();
    tx.add(...instructions);
   // console.log(provider.wallet.publicKey.toBase58(),provider.connection)
    //await provider.sendAndConfirm(tx, [mint], { commitment: "confirmed" });
    let x2 = await sendAndConfirmTransaction(
        provider.connection,
        tx,
         [payer,mint],
    );
    console.log("create mint ", x2)
  
    return mint.publicKey;
  }

  export async function createMintInstructions(
    provider: any,
    authority: PublicKey,
    mint: PublicKey
  ) {
    const TEST_TOKEN_PROGRAM_ID = new anchor.web3.PublicKey(TOKEN_PROGRAM_ID.toString());
    let instructions = [
      SystemProgram.createAccount({
        fromPubkey: provider.wallet.publicKey,
        newAccountPubkey: mint,
        space: 82,
        lamports: await provider.connection.getMinimumBalanceForRentExemption(82),
        programId: TEST_TOKEN_PROGRAM_ID,
      }),
      Token.createInitMintInstruction(TEST_TOKEN_PROGRAM_ID, mint, 0, authority, null),
    ];
    return instructions;
  }

  main();
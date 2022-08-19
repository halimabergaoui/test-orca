
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
    //export ANCHOR_WALLET='/Users/macbook/Desktop/halima/tour-de-whirlpool/wallet.json'
    //export ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
    const provider = Provider.env();
    const ctx = WhirlpoolContext.withProvider(provider, ORCA_WHIRLPOOL_PROGRAM_ID);
    const fetcher = new AccountFetcher(ctx.connection);
    const client = buildWhirlpoolClient(ctx, fetcher);
  
    console.log("endpoint:", ctx.connection.rpcEndpoint);
    console.log("wallet pubkey:", ctx.wallet.publicKey.toBase58());

    const price = MathUtil.toX64(new Decimal(5));
    const { configInitInfo} = await initTestPool(
          ctx,
        );
    console.log('config account ',configInitInfo.whirlpoolsConfigKeypair.publicKey.toBase58())
       
}
export const generateDefaultConfigParams = (
    context: WhirlpoolContext,
    funder?: PublicKey
  ): {
    configInitInfo: InitConfigParams;
    configKeypairs: any;
  } => {
    const configKeypairs: any = {
      feeAuthorityKeypair: payer,
      collectProtocolFeesAuthorityKeypair: payer,
      rewardEmissionsSuperAuthorityKeypair: payer,
    };
    const configInitInfo = {
      whirlpoolsConfigKeypair: Keypair.generate(),
      feeAuthority: configKeypairs.feeAuthorityKeypair.publicKey,
      collectProtocolFeesAuthority: configKeypairs.collectProtocolFeesAuthorityKeypair.publicKey,
      rewardEmissionsSuperAuthority: configKeypairs.rewardEmissionsSuperAuthorityKeypair.publicKey,
      defaultProtocolFeeRate: 300,
      funder: funder || context.wallet.publicKey,
    };
    return { configInitInfo, configKeypairs };
  };

  export function toTx(ctx: WhirlpoolContext, ix: Instruction): TransactionBuilder {
    return new TransactionBuilder(ctx.provider).addInstruction(ix);
  }

  export async function initTestPool(
    ctx: WhirlpoolContext,
  ) {
    const { configInitInfo, configKeypairs } = await buildTestPoolParams(
      ctx,
    );
  
    return {
      configInitInfo,
      configKeypairs,
    };
  }
export async function buildTestPoolParams(
  ctx: WhirlpoolContext,
) {
  const { configInitInfo, configKeypairs } = generateDefaultConfigParams(ctx);
  await toTx(ctx, WhirlpoolIx.initializeConfigIx(ctx.program, configInitInfo)).buildAndExecute();
//console.log(configInitInfo)

  return {
    configInitInfo,
    configKeypairs,
  };
}

  main()
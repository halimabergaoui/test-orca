
import { Provider } from "@project-serum/anchor";
import * as anchor from "@project-serum/anchor";

import {
  WhirlpoolContext, AccountFetcher, buildWhirlpoolClient, ORCA_WHIRLPOOL_PROGRAM_ID,
  PDAUtil, PoolUtil, WhirlpoolIx, InitConfigParams, WhirlpoolsConfigData, InitFeeTierParams, InitPoolParams, WhirlpoolData, TickUtil, InitTickArrayParams, PriceMath
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
import { TickSpacing } from "./tick_spacing";
const defaultInitSqrtPrice = MathUtil.toX64_BN(new anchor.BN(1));
const tokenAMintPubKey = new PublicKey("6PfQ8kHe5iYKWKU9ADzY9RC3xNfjEQoRnvKL1eSdNp7p")//await createMint(provider);
const tokenBMintPubKey = new PublicKey("E6BQ3Jya5ibL5nvH5LbQakUcECwmGrnUxpgxYvyBVJks")
const configAccount = new PublicKey('DHXG1yscPCvovnQccrgSykisgwpY2Re6bmKCN2pykWW7')

async function main() {
    //export ANCHOR_WALLET='/Users/macbook/Desktop/halima/tour-de-whirlpool/wallet.json'
    //export ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
    const provider = Provider.env();
    const ctx = WhirlpoolContext.withProvider(provider, ORCA_WHIRLPOOL_PROGRAM_ID);
    const fetcher = new AccountFetcher(ctx.connection);
    const client = buildWhirlpoolClient(ctx, fetcher);
  
    console.log("endpoint:", ctx.connection.rpcEndpoint);
    console.log("wallet pubkey:", ctx.wallet.publicKey.toBase58());

    const price = MathUtil.toX64(new Decimal(1));

    const {poolInitInfo } = await initTestPool(
          ctx,
          TickSpacing.Standard,
          price
        );
        const poolData = (await fetcher.getPool(poolInitInfo.whirlpoolPda.publicKey)) as WhirlpoolData;
    
        const expectedWhirlpoolPda = PDAUtil.getWhirlpool(
          ORCA_WHIRLPOOL_PROGRAM_ID,
          configAccount,
          poolInitInfo.tokenMintA,
          poolInitInfo.tokenMintB,
          TickSpacing.Standard
        );
        console.log("poolInfo ",poolInitInfo.whirlpoolPda.publicKey.toBase58(),expectedWhirlpoolPda.publicKey.toBase58())
        console.log(poolData.tokenMintA,(poolInitInfo.tokenMintA));
        const whirlpool1 = await fetcher.getPool(poolInitInfo.whirlpoolPda.publicKey);
        console.log("pool 1 ",whirlpool1.sqrtPrice, whirlpool1.liquidity,whirlpool1.tickCurrentIndex)
        PriceMath.sqrtPriceX64ToTickIndex(poolInitInfo.initSqrtPrice)
}
export const generateDefaultConfigParams = (
    context: WhirlpoolContext,
    funder?: PublicKey
  ): {
    configInitInfo: InitConfigParams;
    configKeypairs: any;
  } => {
    const configKeypairs: any = {
      feeAuthorityKeypair: Keypair.generate(),
      collectProtocolFeesAuthorityKeypair: Keypair.generate(),
      rewardEmissionsSuperAuthorityKeypair: Keypair.generate(),
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
    tickSpacing: number,
    initSqrtPrice = defaultInitSqrtPrice,
    funder?: Keypair
  ) {

    const { poolInitInfo, feeTierParams } = await buildTestPoolParams(
      ctx,
      tickSpacing,
      3000,
      initSqrtPrice,
      funder?.publicKey
    );
  
    const tx = toTx(ctx, WhirlpoolIx.initializePoolIx(ctx.program, poolInitInfo));
    if (funder) {
      tx.addSigner(funder);
    }
  
    return {
      txId: await tx.buildAndExecute(),
      poolInitInfo,
      feeTierParams,
    };
  }
export async function buildTestPoolParams(
  ctx: WhirlpoolContext,
  tickSpacing: number,
  defaultFeeRate = 3000,
  initSqrtPrice = defaultInitSqrtPrice,
  funder?: PublicKey
) {
  const { params: feeTierParams } = await initFeeTier(
    ctx,
    payer,
    tickSpacing,
    defaultFeeRate
  );
  const poolInitInfo = await generateDefaultInitPoolParams(
    ctx,
    configAccount,
    feeTierParams.feeTierPda.publicKey,
    tickSpacing,
    initSqrtPrice,
    funder
  );
  return {
    poolInitInfo,
    feeTierParams,
  };
}

export async function initFeeTier(
    ctx: WhirlpoolContext,
    feeAuthorityKeypair: Account,
    tickSpacing: number,
    defaultFeeRate: number,
    funder?: Keypair
  ) {
    const params = generateDefaultInitFeeTierParams(
      ctx,
      configAccount,
      feeAuthorityKeypair.publicKey,
      tickSpacing,
      defaultFeeRate,
      funder?.publicKey
    );
  
    const tx = toTx(ctx, WhirlpoolIx.initializeFeeTierIx(ctx.program, params)).addSigner(
      feeAuthorityKeypair
    );
    if (funder) {
      tx.addSigner(funder);
    }
  
    return {
      txId: await tx.buildAndExecute(),
      params,
    };
  }
  export const generateDefaultInitFeeTierParams = (
    context: WhirlpoolContext,
    whirlpoolsConfigKey: PublicKey,
    whirlpoolFeeAuthority: PublicKey,
    tickSpacing: number,
    defaultFeeRate: number,
    funder?: PublicKey
  ): InitFeeTierParams => {
    const feeTierPda = PDAUtil.getFeeTier(
      context.program.programId,
      whirlpoolsConfigKey,
      tickSpacing
    );
    return {
      feeTierPda,
      whirlpoolsConfig: whirlpoolsConfigKey,
      tickSpacing,
      defaultFeeRate,
      feeAuthority: whirlpoolFeeAuthority,
      funder: funder || context.wallet.publicKey,
    };
  };
  
  export const generateDefaultInitPoolParams = async (
    context: WhirlpoolContext,
    configKey: PublicKey,
    feeTierKey: PublicKey,
    tickSpacing: number,
    initSqrtPrice = MathUtil.toX64(new Decimal(5)),
    funder?: PublicKey
  ): Promise<InitPoolParams> => {

    const whirlpoolPda = PDAUtil.getWhirlpool(
      context.program.programId,
      configKey,
      tokenAMintPubKey,
      tokenBMintPubKey,
      tickSpacing
    );
    const tokenVaultAKeypair = Keypair.generate();
    const tokenVaultBKeypair = Keypair.generate();
  
    return {
      initSqrtPrice,
      whirlpoolsConfig: configKey,
      tokenMintA: tokenAMintPubKey,
      tokenMintB: tokenBMintPubKey,
      whirlpoolPda,
      tokenVaultAKeypair,
      tokenVaultBKeypair,
      feeTierKey,
      tickSpacing,
      funder: funder || context.wallet.publicKey,
    };
  };

  main()
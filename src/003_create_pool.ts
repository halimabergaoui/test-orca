
import { Provider } from "@project-serum/anchor";
import * as anchor from "@project-serum/anchor";

import {
  WhirlpoolContext, AccountFetcher, buildWhirlpoolClient, ORCA_WHIRLPOOL_PROGRAM_ID,
  PDAUtil, PoolUtil, WhirlpoolIx, InitConfigParams, WhirlpoolsConfigData, InitFeeTierParams, InitPoolParams, WhirlpoolData, TickUtil, InitTickArrayParams
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
const tokenAMintPubKey = new PublicKey("7p6QmuWHsYRSegWKB8drgLmL2tqrQ7gYyUVC1j7CYVnT")//await createMint(provider);
const tokenBMintPubKey = new PublicKey("F7ksMSuEWqfnK6rXXn8Z7HocP1uYsJVdSzXUzWmFmu5V")
const configAccount = new PublicKey('7oC9NUSbkx3RcwLbBAXmKHP2e47PkHSCquNrrycx8xNo')

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

    const {poolInitInfo } = await initTestPool(
          ctx,
          128,
          price
        );
        const poolData = (await fetcher.getPool(poolInitInfo.whirlpoolPda.publicKey)) as WhirlpoolData;
    
        const expectedWhirlpoolPda = PDAUtil.getWhirlpool(
          ORCA_WHIRLPOOL_PROGRAM_ID,
          configAccount,
          poolInitInfo.tokenMintA,
          poolInitInfo.tokenMintB,
          128
        );
        console.log("poolInfo ",poolInitInfo.whirlpoolPda.publicKey.toBase58(),expectedWhirlpoolPda.publicKey.toBase58())
        console.log(poolData.tokenMintA,(poolInitInfo.tokenMintA));
        const whirlpool1 = await client.getPool(poolInitInfo.whirlpoolPda.publicKey);
        console.log("pool 1 ",whirlpool1.getAddress().toBase58())
        /*assert.ok(poolInitInfo.whirlpoolPda.publicKey.equals(expectedWhirlpoolPda.publicKey));
        assert.equal(expectedWhirlpoolPda.bump, whirlpool.whirlpoolBump[0]);
    
        assert.ok(whirlpool.whirlpoolsConfig.equals(poolInitInfo.whirlpoolsConfig));
        assert.ok(whirlpool.tokenMintA.equals(poolInitInfo.tokenMintA));
        assert.ok(whirlpool.tokenVaultA.equals(poolInitInfo.tokenVaultAKeypair.publicKey));
    
        assert.ok(whirlpool.tokenMintB.equals(poolInitInfo.tokenMintB));
        assert.ok(whirlpool.tokenVaultB.equals(poolInitInfo.tokenVaultBKeypair.publicKey));
    
        assert.equal(whirlpool.feeRate, feeTierParams.defaultFeeRate);
        assert.equal(whirlpool.protocolFeeRate, configInitInfo.defaultProtocolFeeRate);
    
        assert.ok(whirlpool.sqrtPrice.eq(new anchor.BN(poolInitInfo.initSqrtPrice.toString())));
        assert.ok(whirlpool.liquidity.eq(ZERO_BN));
    
        assert.equal(
          whirlpool.tickCurrentIndex,
          PriceMath.sqrtPriceX64ToTickIndex(poolInitInfo.initSqrtPrice)
        );
    
        assert.ok(whirlpool.protocolFeeOwedA.eq(ZERO_BN));
        assert.ok(whirlpool.protocolFeeOwedB.eq(ZERO_BN));
        assert.ok(whirlpool.feeGrowthGlobalA.eq(ZERO_BN));
        assert.ok(whirlpool.feeGrowthGlobalB.eq(ZERO_BN));
    
        assert.ok(whirlpool.tickSpacing === TickSpacing.Standard);
    
        await asyncAssertTokenVault(program, poolInitInfo.tokenVaultAKeypair.publicKey, {
          expectedOwner: poolInitInfo.whirlpoolPda.publicKey,
          expectedMint: poolInitInfo.tokenMintA,
        });
        await asyncAssertTokenVault(program, poolInitInfo.tokenVaultBKeypair.publicKey, {
          expectedOwner: poolInitInfo.whirlpoolPda.publicKey,
          expectedMint: poolInitInfo.tokenMintB,
        });
    
        whirlpool.rewardInfos.forEach((rewardInfo) => {
          assert.equal(rewardInfo.emissionsPerSecondX64, 0);
          assert.equal(rewardInfo.growthGlobalX64, 0);
          assert.ok(rewardInfo.authority.equals(configInitInfo.rewardEmissionsSuperAuthority));
          assert.ok(rewardInfo.mint.equals(anchor.web3.PublicKey.default));
          assert.ok(rewardInfo.vault.equals(anchor.web3.PublicKey.default));
        });*/
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
    //const [tokenAMintPubKey, tokenBMintPubKey] = [new PublicKey("3qkBoHrCvScmyGV3rmSES8GJQvjxNCzwu1DMZFuiPn8Y"),new PublicKey("6p3yxkFZkbwQk5F6SZ9d5eb7BbxQsQGJs8rx3rV1K9wy")]
    //[new PublicKey("DnLM7ojzk6A8iKGNsq2NmGWy43vkBieKGefAUcd78a1U"),new PublicKey("7tNABCvkcrWuw1yPYdXBC2Xty1zedjLFHDKNQVWaAmQf")]
  
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
  export const createInOrderMints = async (context: WhirlpoolContext) => {
    const provider = context.provider;
    const tokenXMintPubKey = new PublicKey("98orpNzdRzFbmi4dy7dUhJVmkpAXybTFENCbz7422Hpa")//await createMint(provider);
    const tokenYMintPubKey = new PublicKey("8abbvizPsQHbb16dSEbt368hsLmMvCV9GnNjsoVqcXJg")//await createMint(provider);
  
    let tokenAMintPubKey, tokenBMintPubKey;
    if (Buffer.compare(tokenXMintPubKey.toBuffer(), tokenYMintPubKey.toBuffer()) < 0) {
      tokenAMintPubKey = tokenXMintPubKey;
      tokenBMintPubKey = tokenYMintPubKey;
    } else {
      tokenAMintPubKey = tokenYMintPubKey;
      tokenBMintPubKey = tokenXMintPubKey;
    }
  
    return [tokenAMintPubKey, tokenBMintPubKey];
  };

 /* export async function createMint(
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
    let payer=new Account([205,62,53,122,36,145,91,159,243,52,151,211,241,72,208,149,27,191,111,144,94,242,0,112,88,217,3,220,231,156,213,208,247,56,95,29,120,8,135,163,36,1,4,39,147,18,117,17,88,15,96,52,110,67,49,166,147,0,103,101,28,54,54,50])
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
  }*/

  
  main()
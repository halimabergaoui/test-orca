
import { Provider, BN } from "@project-serum/anchor";
import { WhirlpoolContext, AccountFetcher, buildWhirlpoolClient, ORCA_WHIRLPOOL_PROGRAM_ID, PDAUtil, PoolUtil, OpenPositionParams, PositionData, PriceMath, TokenAmounts, TickUtil, WhirlpoolIx, InitializeRewardParams} from "@orca-so/whirlpools-sdk";
import { MathUtil} from "@orca-so/common-sdk";
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Account, Keypair, PublicKey, sendAndConfirmTransaction, Transaction, TransactionInstruction } from "@solana/web3.js";
import { TransactionBuilder, Instruction, PDA } from "@orca-so/common-sdk";
import { TickSpacing } from "./tick_spacing";
import { u64 } from "./u64";
import { approve, getOrCreateATA, mintTo } from "./utils";
import { payer } from "./payer";
import { createMint } from "./001_create_mints";



// any one can open a position: have a mint created with no minting authority and 0 liquidity
async function main() {
   
    const provider = Provider.env();
    
    const ctx = WhirlpoolContext.withProvider(provider, ORCA_WHIRLPOOL_PROGRAM_ID);
    const fetcher = new AccountFetcher(ctx.connection);
    const client = buildWhirlpoolClient(ctx, fetcher);
  
    console.log("endpoint:", ctx.connection.rpcEndpoint);
    console.log("wallet pubkey:", ctx.wallet.publicKey.toBase58());

    const devUSDC = {mint: new PublicKey("7p6QmuWHsYRSegWKB8drgLmL2tqrQ7gYyUVC1j7CYVnT"), decimals: 6};
    const devSAMO = {mint: new PublicKey("F7ksMSuEWqfnK6rXXn8Z7HocP1uYsJVdSzXUzWmFmu5V"), decimals: 6};
    let tick_spacing = TickSpacing.Standard
    const NEBULA_WHIRLPOOLS_CONFIG = new PublicKey("AtSGG1e6gx2cistKmhPFUnr8Xy1oJFzPSzSCXKPZ5uNv");
   
    const rewardIndex =0;
  //get pool from corresponding to mints and space
    const whirlpool_pubkey = PDAUtil.getWhirlpool(
        ORCA_WHIRLPOOL_PROGRAM_ID,
        NEBULA_WHIRLPOOLS_CONFIG,
       devUSDC.mint, devSAMO.mint,  tick_spacing).publicKey;


const { params } = await initializeReward(
  ctx,
  payer,
  whirlpool_pubkey,
  rewardIndex
);

        //fetch pool data from fetcher
        let whirlpool = await fetcher.getPool(whirlpool_pubkey)

        console.log(whirlpool.rewardInfos[rewardIndex].mint.toBase58(),(params.rewardMint.toBase58()));
        console.log(whirlpool.rewardInfos[rewardIndex].vault.toBase58(),(params.rewardVaultKeypair.publicKey.toBase58()));
      
}
  export function toTx(ctx: WhirlpoolContext, ix: Instruction): TransactionBuilder {
    return new TransactionBuilder(ctx.provider).addInstruction(ix);
  }

  export async function initializeReward(
    ctx: WhirlpoolContext,
    rewardAuthorityKeypair: Account,
    whirlpool: PublicKey,
    rewardIndex: number,
    funder?: Keypair
  ): Promise<{ txId: string; params: InitializeRewardParams }> {
    const provider = ctx.provider;
    const rewardMint = new PublicKey("8XckyCEZpJfdL9Sj6M4u44PmUA3ZLtWbzqE8yDhAjj5q")
    const rewardVaultKeypair = Keypair.generate();
  
    const params = {
      rewardAuthority: rewardAuthorityKeypair.publicKey,
      funder: funder?.publicKey || ctx.wallet.publicKey,
      whirlpool,
      rewardMint,
      rewardVaultKeypair,
      rewardIndex,
    };
  
    const tx = toTx(ctx, WhirlpoolIx.initializeRewardIx(ctx.program, params)).addSigner(
      rewardAuthorityKeypair
    );
    if (funder) {
      tx.addSigner(funder);
    }
  
    return {
      txId: await tx.buildAndExecute(),
      params,
    };
  }

export type InitTickArrayParams = {
  whirlpool: PublicKey;
  tickArrayPda: PDA;
  startTick: number;
  funder: PublicKey;
}; 

  main()
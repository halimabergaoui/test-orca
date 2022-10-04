
import { Provider, BN } from "@project-serum/anchor";
import { WhirlpoolContext, AccountFetcher, buildWhirlpoolClient, ORCA_WHIRLPOOL_PROGRAM_ID, PDAUtil, PoolUtil, OpenPositionParams, PositionData, PriceMath, TokenAmounts, TickUtil, WhirlpoolIx, InitializeRewardParams, ORCA_WHIRLPOOLS_CONFIG, WhirlpoolData} from "@orca-so/whirlpools-sdk";
import { MathUtil} from "@orca-so/common-sdk";
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Account, Keypair, PublicKey, sendAndConfirmTransaction, Transaction, TransactionInstruction } from "@solana/web3.js";
import { TransactionBuilder, Instruction, PDA } from "@orca-so/common-sdk";
import { TickSpacing } from "./tick_spacing";
import { u64 } from "./u64";
import { approve, getOrCreateATA, mintTo } from "./utils";
import { payer } from "./payer";
import { createMint } from "./001_create_mints";

const devUSDC = {mint: new PublicKey("7p6QmuWHsYRSegWKB8drgLmL2tqrQ7gYyUVC1j7CYVnT"), decimals: 6};
const devSAMO = {mint: new PublicKey("F7ksMSuEWqfnK6rXXn8Z7HocP1uYsJVdSzXUzWmFmu5V"), decimals: 6};
let tick_spacing = TickSpacing.Standard
const NEBULA_WHIRLPOOLS_CONFIG = new PublicKey("AtSGG1e6gx2cistKmhPFUnr8Xy1oJFzPSzSCXKPZ5uNv");

// any one can open a position: have a mint created with no minting authority and 0 liquidity
async function main() {
   
    const provider = Provider.env();
    
    const ctx = WhirlpoolContext.withProvider(provider, ORCA_WHIRLPOOL_PROGRAM_ID);
    const fetcher = new AccountFetcher(ctx.connection);
    const client = buildWhirlpoolClient(ctx, fetcher);
  
    console.log("endpoint:", ctx.connection.rpcEndpoint);
    console.log("wallet pubkey:", ctx.wallet.publicKey.toBase58());
let rewardIndex=0;
  

  //get pool from corresponding to mints and space
    const whirlpool_pubkey = PDAUtil.getWhirlpool(
        ORCA_WHIRLPOOL_PROGRAM_ID,
        NEBULA_WHIRLPOOLS_CONFIG,
       devUSDC.mint, devSAMO.mint,  tick_spacing).publicKey;


        //fetch pool data from fetcher
        let whirlpool = await fetcher.getPool(whirlpool_pubkey)

        console.log(whirlpool.rewardInfos[rewardIndex].mint.toBase58(),"re mint");
        console.log(whirlpool.rewardInfos[rewardIndex].vault.toBase58(),"re vault");
        console.log(NEBULA_WHIRLPOOLS_CONFIG.toBase58(),"ORCA_WHIRLPOOLS_CONFIG");
        console.log(whirlpool_pubkey.toBase58(),"whirlpool_pubkey");

        console.log("///////////////////////////// set fee rate and and rewrd emission //////////////")
        let newFeeRate = 10000
        let program = ctx.program
        let feeTx = await program.rpc.setFeeRate(newFeeRate, {
          accounts: {
            whirlpoolsConfig: NEBULA_WHIRLPOOLS_CONFIG,
            whirlpool: whirlpool_pubkey,
            feeAuthority: payer.publicKey,
          },
          signers: [payer],
        });
      whirlpool = (await fetcher.getPool(whirlpool_pubkey, true)) as WhirlpoolData;
        console.log(whirlpool.feeRate, newFeeRate);
        console.log("fee tx ",feeTx)
       let mint = await mintTo(ctx.connection,whirlpool.rewardInfos[rewardIndex].mint,payer.publicKey,100000000,whirlpool.rewardInfos[rewardIndex].vault)
       const emissionsPerSecondX64 = new BN(10_000).shln(64).div(new BN(60 * 60 * 24));
        let rewardTx = await toTx(
          ctx,
          WhirlpoolIx.setRewardEmissionsIx(ctx.program, {
            rewardAuthority: payer.publicKey,
            whirlpool: whirlpool_pubkey,
            rewardIndex,
            rewardVaultKey: whirlpool.rewardInfos[rewardIndex].vault,
            emissionsPerSecondX64,
          })).buildAndExecute()

          console.log("rewardTx",rewardTx)
}


  export function toTx(ctx: WhirlpoolContext, ix: Instruction): TransactionBuilder {
    return new TransactionBuilder(ctx.provider).addInstruction(ix);
  }

export type InitTickArrayParams = {
  whirlpool: PublicKey;
  tickArrayPda: PDA;
  startTick: number;
  funder: PublicKey;
}; 

  main()

import { Provider, BN } from "@project-serum/anchor";
import { WhirlpoolContext, AccountFetcher, buildWhirlpoolClient, ORCA_WHIRLPOOL_PROGRAM_ID, PDAUtil, PoolUtil, OpenPositionParams, PositionData, PriceMath, TokenAmounts, TickUtil, WhirlpoolIx, SwapUtils} from "@orca-so/whirlpools-sdk";
import { MathUtil} from "@orca-so/common-sdk";
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Account, Keypair, PublicKey, sendAndConfirmTransaction, Transaction, TransactionInstruction } from "@solana/web3.js";
import { TransactionBuilder, Instruction, PDA } from "@orca-so/common-sdk";
import { TickSpacing } from "./tick_spacing";
import { u64 } from "./u64";
import { approve, getOrCreateATA, mintTo } from "./utils";
import { payer } from "./payer";
import Decimal from "decimal.js";


// any one can open a position: have a mint created with no minting authority and 0 liquidity
async function main() {
   
    const provider = Provider.env();
    
    const ctx = WhirlpoolContext.withProvider(provider, ORCA_WHIRLPOOL_PROGRAM_ID);
    const fetcher = new AccountFetcher(ctx.connection);
    const client = buildWhirlpoolClient(ctx, fetcher);
  
    console.log("endpoint:", ctx.connection.rpcEndpoint);
    console.log("wallet pubkey:", ctx.wallet.publicKey.toBase58());

    let defaultParams: OpenPositionParams;
  let defaultMint: Keypair;


  const devUSDC = {mint: new PublicKey("7p6QmuWHsYRSegWKB8drgLmL2tqrQ7gYyUVC1j7CYVnT"), decimals: 6};
  const devSAMO = {mint: new PublicKey("F7ksMSuEWqfnK6rXXn8Z7HocP1uYsJVdSzXUzWmFmu5V"), decimals: 6};
  let tick_spacing = TickSpacing.Standard
  const NEBULA_WHIRLPOOLS_CONFIG = new PublicKey("CcjXapx2zMZ5LJPSwVmy8YcSH957P9h7QXYbrr3Mszob");
  let positionMint = new PublicKey("crPeMcWhQDzjr1d7xroKAoebE52eVCZ3RvGpF1EZ9wQ")

  //let tokenOwnerAccountA= new PublicKey("Hd8pAvEZKFPP1pqGSZy2t7mF8d2LLdxZT5cvUAuVjmib")
  //let tokenOwnerAccountB= new PublicKey("GhfvZhR75fi5AvPPa1Qbma7Ct36qCd5FbSA5xFP8XqbW")
  const tokenOwnerAccountA = await getOrCreateATA(provider.connection, devUSDC.mint, provider.wallet.publicKey)
  const tokenOwnerAccountB = await getOrCreateATA(provider.connection, devSAMO.mint, provider.wallet.publicKey)
  console.log(" mint tokens ", tokenOwnerAccountA.toBase58(),tokenOwnerAccountB.toBase58())
    
  //get pool from corresponding to mints and space
    const whirlpool_pubkey = PDAUtil.getWhirlpool(
        ORCA_WHIRLPOOL_PROGRAM_ID,
        NEBULA_WHIRLPOOLS_CONFIG,
       devUSDC.mint, devSAMO.mint,  tick_spacing).publicKey;

        //fetch pool data from fetcher
        let poolData = await fetcher.getPool(whirlpool_pubkey)
        

   
    /*let tickArrayPda= PDAUtil.getTickArray(
      ctx.program.programId,
      whirlpool_pubkey,
      TickUtil.getStartTickIndex(0, poolData.tickSpacing)
    )

    let tickArrayPda1= PDAUtil.getTickArray(
      ctx.program.programId,
      whirlpool_pubkey,
      TickUtil.getStartTickIndex(88*128, poolData.tickSpacing)
    )

    let tickArrayPda2= PDAUtil.getTickArray(
      ctx.program.programId,
      whirlpool_pubkey,
      TickUtil.getStartTickIndex(2*88*128, poolData.tickSpacing)
    )*/
        const oraclePda = PDAUtil.getOracle(ctx.program.programId, whirlpool_pubkey);

        const tickArrays = await SwapUtils.getTickArrays(
          poolData.tickCurrentIndex,
          poolData.tickSpacing,
          true,
          ORCA_WHIRLPOOL_PROGRAM_ID,
          whirlpool_pubkey,
          fetcher,
          true
        );


        console.log({
          //tickArrayPda:tickArrayPda.publicKey.toBase58(),
          //tickArrayPda1:tickArrayPda1.publicKey.toBase58(),
          //tickArrayPda2:tickArrayPda2.publicKey.toBase58(),
          tickArray0: tickArrays[0].address.toBase58(),
        tickArray1: tickArrays[1].address.toBase58(),
        tickArray2: tickArrays[2].address.toBase58(),
        })
    let tx =await toTx(
      ctx,
      WhirlpoolIx.swapIx(ctx.program, {
        amount: new u64(1),
        otherAmountThreshold: new BN(0),
        sqrtPriceLimit: MathUtil.toX64(new Decimal(4.95)),
        amountSpecifiedIsInput: true,
        aToB: true,
        whirlpool: whirlpool_pubkey,
        tokenAuthority: ctx.wallet.publicKey,
        tokenOwnerAccountA: tokenOwnerAccountA,
        tokenVaultA: poolData.tokenVaultA,
        tokenOwnerAccountB: tokenOwnerAccountB,
        tokenVaultB: poolData.tokenVaultB,
        tickArray0: tickArrays[0].address,
        tickArray1: tickArrays[1].address,
        tickArray2: tickArrays[2].address,
        oracle: oraclePda.publicKey,
      })
    ).buildAndExecute();
    console.log(tx)
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
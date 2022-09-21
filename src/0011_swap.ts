
import { Provider, BN } from "@project-serum/anchor";
import { WhirlpoolContext, AccountFetcher, buildWhirlpoolClient, ORCA_WHIRLPOOL_PROGRAM_ID, PDAUtil, PoolUtil, OpenPositionParams, PositionData, PriceMath, TokenAmounts, TickUtil, WhirlpoolIx, SwapUtils, swapQuoteByInputToken} from "@orca-so/whirlpools-sdk";
import { MathUtil} from "@orca-so/common-sdk";
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Account, Keypair, PublicKey, sendAndConfirmTransaction, Transaction, TransactionInstruction } from "@solana/web3.js";
import { TransactionBuilder, Instruction, PDA } from "@orca-so/common-sdk";
import { TickSpacing } from "./tick_spacing";
import { u64 } from "./u64";
import { approve, getOrCreateATA, mintTo } from "./utils";
import { payer } from "./payer";
import Decimal from "decimal.js";
import { DecimalUtil, Percentage } from "@orca-so/common-sdk";

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


  const devUSDC = {mint: new PublicKey("8wtWsdrhZxd3u18xB9aZJyqmYnbiR81jmz9CM3gUCbf8"), decimals: 6};
  const devSAMO = {mint: new PublicKey("D7oxh2JX9LQGv9FT1a3sEFS897seiY48yF9bTQcrdqwR"), decimals: 6};
  let tick_spacing = TickSpacing.Standard
  const NEBULA_WHIRLPOOLS_CONFIG = new PublicKey("2qMTqKpH4JZqEpw7VfCbJv5f1aDXceH6HvEpitysUfJD"); 
  let positionMint = new PublicKey("GqP3AjipvDxQiDF9tkyNVckipQdEnugTv94GV5Yuj92a")

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
        

   
    let tickArrayPda= PDAUtil.getTickArray(
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
    )
        const oraclePda = PDAUtil.getOracle(ctx.program.programId, whirlpool_pubkey);

        const tickArrays = await SwapUtils.getTickArrays(
          poolData.tickCurrentIndex,
          poolData.tickSpacing,
          false,
          ORCA_WHIRLPOOL_PROGRAM_ID,
          whirlpool_pubkey,
          fetcher,
          true
        );


        console.log({
          tickArrayPda:tickArrayPda.publicKey.toBase58(),
          tickArrayPda1:tickArrayPda1.publicKey.toBase58(),
          tickArrayPda2:tickArrayPda2.publicKey.toBase58(),
          tickArray0: tickArrays[0].address.toBase58(),
        tickArray1: tickArrays[1].address.toBase58(),
        tickArray2: tickArrays[2].address.toBase58(),
        })
        const amount_in = new Decimal("1" /* devUSDC */);
        const whirlpool = await client.getPool(whirlpool_pubkey);
        const quote = await swapQuoteByInputToken(
          whirlpool,
          // 入力するトークン
          devUSDC.mint,
          DecimalUtil.toU64(amount_in, devUSDC.decimals),
          // 許容するスリッページ (10/1000 = 1%)
          Percentage.fromFraction(10, 1000),
          ctx.program.programId,
          fetcher,
          true
        );    
        console.log ("quote ", quote.estimatedAmountIn.toNumber(), quote.estimatedAmountOut.toNumber(), quote.estimatedFeeAmount.toNumber(),quote.otherAmountThreshold.toNumber(),quote.aToB, quote.sqrtPriceLimit.toNumber())
         let tx =await toTx(
      ctx,
      WhirlpoolIx.swapIx(ctx.program, {
        amount: new u64(quote.amount),
        otherAmountThreshold: new BN(quote.otherAmountThreshold),
        sqrtPriceLimit: quote.sqrtPriceLimit,
        amountSpecifiedIsInput: quote.amountSpecifiedIsInput,
        aToB: quote.aToB,
        whirlpool: whirlpool_pubkey,
        tokenAuthority: ctx.wallet.publicKey,
        tokenOwnerAccountA: tokenOwnerAccountA,
        tokenVaultA: poolData.tokenVaultA,
        tokenOwnerAccountB: tokenOwnerAccountB,
        tokenVaultB: poolData.tokenVaultB,
        tickArray0: quote.tickArray0,
        tickArray1: quote.tickArray1,
        tickArray2: quote.tickArray2,
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
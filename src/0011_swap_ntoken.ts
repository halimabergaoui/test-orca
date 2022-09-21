
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
import { solanaConfigPoolMainnet } from "./pools";
import  BufferLayout = require('buffer-layout');
import { u128 } from "./u128";
const uint64 = (property = "uint64") => {
  return BufferLayout.blob(8, property);
};

const uint128 = (property = "uint128") => {
  return BufferLayout.blob(16, property);
};
// any one can open a position: have a mint created with no minting authority and 0 liquidity
async function main() {
  process.env.ANCHOR_PROVIDER_URL = "http://api.mainnet-beta.solana.com"
  process.env.ANCHOR_WALLET = "../wallet.json"
    const provider = Provider.env();
    
    const ctx = WhirlpoolContext.withProvider(provider, ORCA_WHIRLPOOL_PROGRAM_ID);
    const fetcher = new AccountFetcher(ctx.connection);
    const client = buildWhirlpoolClient(ctx, fetcher);
  
    console.log("endpoint:", ctx.connection.rpcEndpoint);
    console.log("wallet pubkey:", ctx.wallet.publicKey.toBase58());

    let defaultParams: OpenPositionParams;
  let defaultMint: Keypair;

  let solanaConfigMainnet = solanaConfigPoolMainnet()
  let poolConfig = solanaConfigMainnet[0].OrcaPoolList['USDCUSDT']
  const tokenA = {mint: new PublicKey(poolConfig.tokenMintA), decimals: poolConfig.decimalA};
  const tokenB = {mint: new PublicKey(poolConfig.tokenMintB), decimals: poolConfig.decimalB};
  let tick_spacing = poolConfig.tickSpacing
  
  //let tokenOwnerAccountA= new PublicKey("Hd8pAvEZKFPP1pqGSZy2t7mF8d2LLdxZT5cvUAuVjmib")
  //let tokenOwnerAccountB= new PublicKey("GhfvZhR75fi5AvPPa1Qbma7Ct36qCd5FbSA5xFP8XqbW")
  const tokenOwnerAccountA = await getOrCreateATA(provider.connection, tokenA.mint, provider.wallet.publicKey)
  const tokenOwnerAccountB = await getOrCreateATA(provider.connection, tokenB.mint, provider.wallet.publicKey)
  console.log(" mint tokens ", tokenOwnerAccountA.toBase58(),tokenOwnerAccountB.toBase58())
    
  //get pool from corresponding to mints and space
    const whirlpool_pubkey = new PublicKey(poolConfig.address)

  /*   const tokenA = {mint: new PublicKey("7p6QmuWHsYRSegWKB8drgLmL2tqrQ7gYyUVC1j7CYVnT"), decimals: 6};
  const tokenB = {mint: new PublicKey("F7ksMSuEWqfnK6rXXn8Z7HocP1uYsJVdSzXUzWmFmu5V"), decimals: 6};
  let tick_spacing = TickSpacing.Standard
  const NEBULA_WHIRLPOOLS_CONFIG = new PublicKey("AtSGG1e6gx2cistKmhPFUnr8Xy1oJFzPSzSCXKPZ5uNv");
  let positionMint = new PublicKey("BCqRYzHMBAEQqT6ERZjt81cmG5g8xHm6nr9jQ5VPTNY3");

  const tokenOwnerAccountA = await getOrCreateATA(provider.connection, tokenA.mint, provider.wallet.publicKey)
  const tokenOwnerAccountB = await getOrCreateATA(provider.connection, tokenB.mint, provider.wallet.publicKey)
  console.log(" mint tokens ", tokenOwnerAccountA.toBase58(),tokenOwnerAccountB.toBase58())
  

  //get pool from corresponding to mints and space
    const whirlpool_pubkey = PDAUtil.getWhirlpool(
        ORCA_WHIRLPOOL_PROGRAM_ID,
        NEBULA_WHIRLPOOLS_CONFIG,
        tokenA.mint, tokenB.mint,  tick_spacing).publicKey;
     */
    /*PDAUtil.getWhirlpool(
        ORCA_WHIRLPOOL_PROGRAM_ID,
        NEBULA_WHIRLPOOLS_CONFIG,
       tokenA.mint, tokenB.mint,  tick_spacing).publicKey;
       */

        //fetch pool data from fetcher
        let poolData = await fetcher.getPool(whirlpool_pubkey)
        

   
   /* let tickArrayPda= PDAUtil.getTickArray(
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
         // tickArrayPda:tickArrayPda.publicKey.toBase58(),
         // tickArrayPda1:tickArrayPda1.publicKey.toBase58(),
         // tickArrayPda2:tickArrayPda2.publicKey.toBase58(),
        tickArray0: tickArrays[0].address.toBase58(),
        tickArray1: tickArrays[1].address.toBase58(),
        tickArray2: tickArrays[2].address.toBase58(),
        })
        const amount_in = new Decimal("0.00001" /* devUSDC */);
        const whirlpool = await client.getPool(whirlpool_pubkey);
        const quote = await swapQuoteByInputToken(
          whirlpool,
          // 入力するトークン
          tokenA.mint,
          DecimalUtil.toU64(amount_in, tokenA.decimals),
          // 許容するスリッページ (10/1000 = 1%)
          Percentage.fromFraction(10, 1000),
          ORCA_WHIRLPOOL_PROGRAM_ID,
          fetcher,
          true
        );  
        
        const dataLayout = BufferLayout.struct([
          BufferLayout.u8('instruction'),
          uint64('amount'),
          uint64('other_amount_threshold'),
          //uint64('sqrt_price_limit'),
          BufferLayout.blob(16, 'sqrt_price_limit'),
      ]);
        const data = Buffer.alloc(dataLayout.span);
        
        dataLayout.encode(
          {
            instruction: 5, // withdraw from quarry
            amount: quote.amount.toBuffer(),
            // amount: new u64(4000000).toBuffer(),
            other_amount_threshold: new u64(quote.otherAmountThreshold.toNumber()).toBuffer(),//quote.otherAmountThreshold.toBuffer(),
            sqrt_price_limit: new u128(quote.sqrtPriceLimit.toNumber()).toBuffer(),
          },
          data
        );
        console.log ("quote ", quote.amount.toNumber(),quote.estimatedAmountIn.toNumber(), quote.estimatedAmountOut.toNumber(), quote.estimatedFeeAmount.toNumber(),quote.otherAmountThreshold.toNumber(),quote.aToB, quote.sqrtPriceLimit.toNumber(),quote.amountSpecifiedIsInput)


        let  keys=[
          {pubkey: ORCA_WHIRLPOOL_PROGRAM_ID, isSigner: false, isWritable: false},
          {pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false},
          {pubkey: whirlpool_pubkey, isSigner: false, isWritable: true},
          {pubkey: ctx.wallet.publicKey, isSigner: true, isWritable: true},
          {pubkey: tokenOwnerAccountA, isSigner: false, isWritable: true},
          {pubkey: poolData.tokenVaultA, isSigner: false, isWritable: true},
          {pubkey: tokenOwnerAccountB, isSigner: false, isWritable: true},
          {pubkey: poolData.tokenVaultB, isSigner: false, isWritable: true},
          {pubkey: quote.tickArray0, isSigner: false, isWritable: true},
          {pubkey: quote.tickArray1, isSigner: false, isWritable: true},
          {pubkey: quote.tickArray2, isSigner: false, isWritable: true},
          {pubkey: oraclePda.publicKey, isSigner: false, isWritable: true},
    
        ];
        
        

    
        let Program_id = new PublicKey("EkiPuMSQNWfX694cBZwtN1t5bHxJ4JBB8d3vfsQYxD9B"); //program for swap
        //let Program_id = new PublicKey("66TwtzF5sjz4w7CLuRE2J6TovEpo5pWd3EE9dMmbKPVo"); //program for reverse swap
        const instruction = new TransactionInstruction({
          // @ts-ignore
         keys,
         programId:Program_id,
         data // All instructions are hellos
       });
  
       let tx = await sendAndConfirmTransaction(
         ctx.connection,
         new Transaction().add(instruction),
         [payer],
       ); 
       console.log("txxx ",tx) 


    /*    let tx =await toTx(
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
    console.log(tx) */
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
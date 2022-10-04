
import { Provider, BN } from "@project-serum/anchor";
import { WhirlpoolContext, AccountFetcher, buildWhirlpoolClient, ORCA_WHIRLPOOL_PROGRAM_ID, PDAUtil, PoolUtil, OpenPositionParams, PositionData, PriceMath, TokenAmounts, TickUtil, WhirlpoolIx, SwapUtils, increaseLiquidityQuoteByInputToken, increaseLiquidityQuoteByInputTokenWithParams} from "@orca-so/whirlpools-sdk";
import { MathUtil} from "@orca-so/common-sdk";
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Account, Keypair, PublicKey, sendAndConfirmTransaction, Transaction, TransactionInstruction } from "@solana/web3.js";
import { TransactionBuilder, Instruction, PDA } from "@orca-so/common-sdk";
import { TickSpacing } from "./tick_spacing";
import { u64 } from "./u64";
import { approve, getOrCreateATA, mintTo } from "./utils";
import { payer } from "./payer";
import { DecimalUtil, Percentage } from "@orca-so/common-sdk";
import Decimal from "decimal.js";
import { LP } from "./LP";
import  BufferLayout = require('buffer-layout');
import { u128 } from "./u128";
import { ORCAConfigPoolMainnet } from "./pools";
const uint64 = (property = "uint64") => {
  return BufferLayout.blob(8, property);
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

  let solanaConfigMainnet = ORCAConfigPoolMainnet()
  let poolConfig = solanaConfigMainnet[0].OrcaPoolList['USDCUSDT']
  const tokenA = { mint: new PublicKey(poolConfig.tokenMintA), decimals: poolConfig.decimalA };
  const tokenB = { mint: new PublicKey(poolConfig.tokenMintB), decimals: poolConfig.decimalB };
  let tick_spacing = poolConfig.tickSpacing
  //const tokenA = {mint: new PublicKey("7p6QmuWHsYRSegWKB8drgLmL2tqrQ7gYyUVC1j7CYVnT"), decimals: 6};
  //const tokenB = {mint: new PublicKey("F7ksMSuEWqfnK6rXXn8Z7HocP1uYsJVdSzXUzWmFmu5V"), decimals: 6};
  //let tick_spacing = TickSpacing.Standard
  //const NEBULA_WHIRLPOOLS_CONFIG = new PublicKey("AtSGG1e6gx2cistKmhPFUnr8Xy1oJFzPSzSCXKPZ5uNv");
  let positionMint = new PublicKey("rot9ER8GHVX7cciCK3dDww5he9CDXhEpLAmtiL7pVnk")


  //let tokenOwnerAccountA= new PublicKey("Hd8pAvEZKFPP1pqGSZy2t7mF8d2LLdxZT5cvUAuVjmib")
  //let tokenOwnerAccountB= new PublicKey("GhfvZhR75fi5AvPPa1Qbma7Ct36qCd5FbSA5xFP8XqbW")
  const tokenOwnerAccountA = await getOrCreateATA(provider.connection, tokenA.mint, provider.wallet.publicKey)
  const tokenOwnerAccountB = await getOrCreateATA(provider.connection, tokenB.mint, provider.wallet.publicKey)
  console.log(" mint tokens ", tokenOwnerAccountA.toBase58(),tokenOwnerAccountB.toBase58())
  //process.exit(-1)
  //await mintTo(provider.connection, tokenA.mint, provider.wallet.publicKey,10000_000000,undefined)
  //await mintTo(provider.connection, tokenB.mint, provider.wallet.publicKey,10000_000000,undefined)
    
  //get pool from corresponding to mints and space
    const whirlpool_pubkey = new PublicKey(poolConfig.address);
    /*PDAUtil.getWhirlpool(
        ORCA_WHIRLPOOL_PROGRAM_ID,
        NEBULA_WHIRLPOOLS_CONFIG,
       tokenA.mint, tokenB.mint,  tick_spacing).publicKey;*/

        // get pool from client
        let pool = await client.getPool(whirlpool_pubkey)
        //fetch pool data from fetcher
        let poolData = await fetcher.getPool(whirlpool_pubkey)
        
//fetch position from position authority
const positionPda = PDAUtil.getPosition(ctx.program.programId, positionMint);
    console.log(positionPda.publicKey.toBase58(),positionPda.bump)
    const positionInitInfo = await fetcher.getPosition(positionPda.publicKey);
    console.log(positionInitInfo.liquidity.toString())
    const currTick = poolData.tickCurrentIndex;
    const tickLowerIndex = positionInitInfo.tickLowerIndex;
    let tickUpperIndex = positionInitInfo.tickUpperIndex;

    console.log(currTick,tickLowerIndex,tickUpperIndex)
    let tokenAmount = {
      tokenA: new u64(1_000_000),
      tokenB: new u64(1_000_000),
    }
    /*const liquidityAmount = PoolUtil.estimateLiquidityFromTokenAmounts(
      currTick,
      tickLowerIndex,
      tickUpperIndex,
      tokenAmount
    );*/

    const positionTokenAccountAddress = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      positionMint,
      ctx.wallet.publicKey
    );
//let approveTx = await approve(ctx.connection,positionTokenAccountAddress,ctx.wallet.publicKey,1)
//console.log("approve tx ", approveTx.toBase58())
    const PositionData = (await fetcher.getPosition(positionPda.publicKey)) as PositionData;

    let tickArrayLower= PDAUtil.getTickArray(
      ctx.program.programId,
      whirlpool_pubkey,
      TickUtil.getStartTickIndex(PositionData.tickLowerIndex, poolData.tickSpacing)
    )
    let tickArrayUpper= PDAUtil.getTickArray(
      ctx.program.programId,
      whirlpool_pubkey,
      TickUtil.getStartTickIndex(PositionData.tickUpperIndex, poolData.tickSpacing)
    );
    console.log({pubkey: positionTokenAccountAddress.toString(), isSigner: false, isWritable: false})
    const slippage = Percentage.fromFraction(10, 1000); // 1%
    const dev_usdc_amount = DecimalUtil.toU64(new Decimal("10" /* devUSDC */), tokenA.decimals);
    const quote = increaseLiquidityQuoteByInputTokenWithParams({
      // プールの定義や状態をそのまま渡す
      tokenMintA: tokenA.mint,
      tokenMintB: tokenB.mint,
      sqrtPrice: poolData.sqrtPrice,
      tickCurrentIndex: poolData.tickCurrentIndex,
      // 価格帯
      tickLowerIndex: positionInitInfo.tickLowerIndex,
      tickUpperIndex: positionInitInfo.tickUpperIndex,
      // 入力にするトークン
      inputTokenMint: tokenA.mint,
      inputTokenAmount: dev_usdc_amount,
      // スリッページ
      slippageTolerance: slippage,
    });
    console.log({pubkey: positionTokenAccountAddress.toString(), isSigner: false, isWritable: false})
    console.log("quote  ",quote.liquidityAmount.toNumber(),quote.tokenEstA.toNumber(),quote.tokenEstB.toNumber(),quote.tokenMaxA.toNumber(),quote.tokenMaxB.toNumber())
let programID=new PublicKey("EkiPuMSQNWfX694cBZwtN1t5bHxJ4JBB8d3vfsQYxD9B");
/*console.log({pubkey: ORCA_WHIRLPOOL_PROGRAM_ID.toString(), isSigner: false, isWritable: false})
console.log({pubkey: ctx.wallet.publicKey.toString(), isSigner: false, isWritable: false})
console.log({pubkey: positionPda.publicKey.toString(), isSigner: false, isWritable: false})
console.log({pubkey: positionTokenAccountAddress.toString(), isSigner: false, isWritable: false})
console.log({pubkey: TOKEN_PROGRAM_ID.toString(), isSigner: false, isWritable: false})
console.log({pubkey: whirlpool_pubkey.toString(), isSigner: false, isWritable: true})
console.log({pubkey: tokenOwnerAccountA.toString(), isSigner: false, isWritable: false})
console.log({pubkey: tokenOwnerAccountB.toString(), isSigner: false, isWritable: false})
console.log({pubkey: poolData.tokenVaultA.toString(), isSigner: false, isWritable: false})
console.log({pubkey: poolData.tokenVaultB.toString(), isSigner: false, isWritable: false})
console.log(PositionData.tickLowerIndex,{pubkey: tickArrayLower.publicKey.toString(), isSigner: false, isWritable: false})
console.log(PositionData.tickUpperIndex,{pubkey: tickArrayUpper.publicKey.toString(), isSigner: false, isWritable: false})
console.log({
  //tickArrayPda:tickArrayPda.publicKey.toBase58(),
  //tickArrayPda1:tickArrayPda1.publicKey.toBase58(),
  //tickArrayPda2:tickArrayPda2.publicKey.toBase58(),
  tickArray0: tickArrays[0].address.toBase58(),
tickArray1: tickArrays[1].address.toBase58(),
tickArray2: tickArrays[2].address.toBase58(),
tickArray3: tickArrays.length
*/
const dataLayout = BufferLayout.struct([
  BufferLayout.u8('instruction'),
  BufferLayout.blob(16, 'liquidity_amount'),
  uint64('token_max_a'),
  uint64('token_max_b'),
]);
const data = Buffer.alloc(dataLayout.span);

dataLayout.encode(
  {
    instruction: 3, // withdraw from quarry
    liquidity_amount: new u128(quote.liquidityAmount.toNumber()).toBuffer(),
    token_max_a: new u64(quote.tokenMaxA.toNumber()).toBuffer(),
    token_max_b: new u64(quote.tokenMaxB.toNumber()).toBuffer(),
  },
  data
);
let  keys=[
  {pubkey: ORCA_WHIRLPOOL_PROGRAM_ID, isSigner: false, isWritable: false},
  {pubkey: ctx.wallet.publicKey, isSigner: true, isWritable: true},
  {pubkey: positionPda.publicKey, isSigner: false, isWritable: true},
  {pubkey: positionTokenAccountAddress, isSigner: false, isWritable: true},
  {pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false},
  {pubkey: whirlpool_pubkey, isSigner: false, isWritable: true},
  {pubkey: tokenOwnerAccountA, isSigner: false, isWritable: true},
  {pubkey: tokenOwnerAccountB, isSigner: false, isWritable: true},
  {pubkey: poolData.tokenVaultA, isSigner: false, isWritable: true},
  {pubkey: poolData.tokenVaultB, isSigner: false, isWritable: true},
  {pubkey: tickArrayLower.publicKey, isSigner: false, isWritable: true},
  {pubkey: tickArrayUpper.publicKey, isSigner: false, isWritable: true},

];
// console.log(keys, SystemProgram.programId)
const instruction = new TransactionInstruction({
 keys,
  programId:programID,
  data// All instructions are hellos
});
/*let tx= await sendAndConfirmTransaction(
  ctx.connection,
  new Transaction().add(instruction),
  [payer],
); 
console.log("txxx ",tx)*/
//console.log(liquidityAmount.toNumber(),PositionData.tickLowerIndex,PositionData.tickUpperIndex)
    /*let tx = await toTx(
      ctx,
      WhirlpoolIx.increaseLiquidityIx(ctx.program, {
        liquidityAmount:quote.liquidityAmount,
        tokenMaxA: quote.tokenMaxA,
        tokenMaxB: quote.tokenMaxB,
        whirlpool: positionInitInfo.whirlpool,
        positionAuthority: provider.wallet.publicKey,
        position: positionPda.publicKey,
        positionTokenAccount: positionTokenAccountAddress,
        tokenOwnerAccountA: tokenOwnerAccountA,
        tokenOwnerAccountB: tokenOwnerAccountB,
        tokenVaultA: poolData.tokenVaultA,
        tokenVaultB: poolData.tokenVaultB,
        tickArrayLower: tickArrayLower.publicKey,
        tickArrayUpper: tickArrayUpper.publicKey,
      })
    ).buildAndExecute();
    console.log("increqse liquidity tx ",tx)*/
}

  export function toTx(ctx: WhirlpoolContext, ix: Instruction): TransactionBuilder {
    return new TransactionBuilder(ctx.provider).addInstruction(ix);
  }

  export function estimateLiquidityFromTokenAmounts(
    currTick: number,
    lowerTick: number,
    upperTick: number,
    tokenAmount: TokenAmounts
  ): BN {
    if (upperTick < lowerTick) {
      throw new Error("upper tick cannot be lower than the lower tick");
    }

    const currSqrtPrice = PriceMath.tickIndexToSqrtPriceX64(currTick);
    const lowerSqrtPrice = PriceMath.tickIndexToSqrtPriceX64(lowerTick);
    const upperSqrtPrice = PriceMath.tickIndexToSqrtPriceX64(upperTick);

    if (currTick >= upperTick) {
      return estLiquidityForTokenB(upperSqrtPrice, lowerSqrtPrice, tokenAmount.tokenB);
    } else if (currTick < lowerTick) {
      return estLiquidityForTokenA(lowerSqrtPrice, upperSqrtPrice, tokenAmount.tokenA);
    } else {
      const estLiquidityAmountA = estLiquidityForTokenA(
        currSqrtPrice,
        upperSqrtPrice,
        tokenAmount.tokenA
      );
      const estLiquidityAmountB = estLiquidityForTokenB(
        currSqrtPrice,
        lowerSqrtPrice,
        tokenAmount.tokenB
      );
      return BN.min(estLiquidityAmountA, estLiquidityAmountB);
    }
  }

  function estLiquidityForTokenB(sqrtPrice1: BN, sqrtPrice2: BN, tokenAmount: u64) {
    const lowerSqrtPriceX64 = BN.min(sqrtPrice1, sqrtPrice2);
    const upperSqrtPriceX64 = BN.max(sqrtPrice1, sqrtPrice2);
  
    const delta = upperSqrtPriceX64.sub(lowerSqrtPriceX64);
  
    return tokenAmount.shln(64).div(delta);
  }

  // Convert this function based on Delta A = Delta L * (1/sqrt(lower) - 1/sqrt(upper))
function estLiquidityForTokenA(sqrtPrice1: BN, sqrtPrice2: BN, tokenAmount: u64) {
  const lowerSqrtPriceX64 = BN.min(sqrtPrice1, sqrtPrice2);
  const upperSqrtPriceX64 = BN.max(sqrtPrice1, sqrtPrice2);

  const num = MathUtil.fromX64_BN(tokenAmount.mul(upperSqrtPriceX64).mul(lowerSqrtPriceX64));
  const dem = upperSqrtPriceX64.sub(lowerSqrtPriceX64);

  return num.div(dem);
}

export type InitTickArrayParams = {
  whirlpool: PublicKey;
  tickArrayPda: PDA;
  startTick: number;
  funder: PublicKey;
}; 

  main()

import { Provider, BN } from "@project-serum/anchor";
import { WhirlpoolContext, AccountFetcher, buildWhirlpoolClient, ORCA_WHIRLPOOL_PROGRAM_ID, PDAUtil, PoolUtil, OpenPositionParams, PositionData, PriceMath, TokenAmounts, TickUtil, WhirlpoolIx} from "@orca-so/whirlpools-sdk";
import { MathUtil} from "@orca-so/common-sdk";
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Account, Keypair, PublicKey, sendAndConfirmTransaction, Transaction, TransactionInstruction } from "@solana/web3.js";
import { TransactionBuilder, Instruction, PDA } from "@orca-so/common-sdk";
import { TickSpacing } from "./tick_spacing";
import { u64 } from "./u64";
import { approve, getOrCreateATA, mintTo } from "./utils";
import { payer } from "./payer";



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
  const NEBULA_WHIRLPOOLS_CONFIG = new PublicKey("7oC9NUSbkx3RcwLbBAXmKHP2e47PkHSCquNrrycx8xNo");
  let positionMint = new PublicKey("838iNBrq8UvfMubAa8ibR5cVKxjWjYecXQD9RVmRAj1Z")

  //let tokenOwnerAccountA= new PublicKey("Hd8pAvEZKFPP1pqGSZy2t7mF8d2LLdxZT5cvUAuVjmib")
  //let tokenOwnerAccountB= new PublicKey("GhfvZhR75fi5AvPPa1Qbma7Ct36qCd5FbSA5xFP8XqbW")
  const tokenOwnerAccountA = await getOrCreateATA(provider.connection, devUSDC.mint, provider.wallet.publicKey)
  const tokenOwnerAccountB = await getOrCreateATA(provider.connection, devSAMO.mint, provider.wallet.publicKey)
  console.log(" mint tokens ", tokenOwnerAccountA.toBase58(),tokenOwnerAccountB.toBase58())
  //process.exit(-1)
  await mintTo(provider.connection, devUSDC.mint, provider.wallet.publicKey,10000_000000)
  await mintTo(provider.connection, devSAMO.mint, provider.wallet.publicKey,10000_000000)
    
  //get pool from corresponding to mints and space
    const whirlpool_pubkey = PDAUtil.getWhirlpool(
        ORCA_WHIRLPOOL_PROGRAM_ID,
        NEBULA_WHIRLPOOLS_CONFIG,
       devUSDC.mint, devSAMO.mint,  tick_spacing).publicKey;

        // get pool from client
        let pool = await client.getPool(whirlpool_pubkey)
        //fetch pool data from fetcher
        let poolData = await fetcher.getPool(whirlpool_pubkey)
        
//fetch position from position authority
const positionPda = PDAUtil.getPosition(ctx.program.programId, positionMint);
    console.log(positionPda.publicKey.toBase58(),positionPda.bump)
    const positionInitInfo = await fetcher.getPosition(positionPda.publicKey);
    console.log(positionInitInfo.liquidity.toString())
    const currTick = 128;
    const tickLowerIndex = -1280;
    let tickUpperIndex = 1280;
    let tokenAmount = {
      tokenA: new u64(167_000),
      tokenB: new u64(167_000),
    }
    const liquidityAmount = PoolUtil.estimateLiquidityFromTokenAmounts(
      currTick,
      tickLowerIndex,
      tickUpperIndex,
      tokenAmount
    );

    const positionTokenAccountAddress = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      positionMint,
      new PublicKey("He3ZHVNWSpfqGxxSS61YWgUYRzkdQHxQUAeHDh94jqpD")
    );

    //await approve(provider.connection,positionTokenAccountAddress,provider.wallet.publicKey,1)
    const tick_array_lower_pubkey = PDAUtil.getTickArrayFromTickIndex(positionInitInfo.tickLowerIndex, tick_spacing, whirlpool_pubkey, ctx.program.programId).publicKey;
    const tick_array_upper_pubkey = PDAUtil.getTickArrayFromTickIndex(positionInitInfo.tickUpperIndex, tick_spacing, whirlpool_pubkey, ctx.program.programId).publicKey;
    
    

    let tickArrayLower= PDAUtil.getTickArray(
      ctx.program.programId,
      whirlpool_pubkey,
      TickUtil.getStartTickIndex(0, poolData.tickSpacing)
    )
    let tickArrayUpper= PDAUtil.getTickArray(
      ctx.program.programId,
      whirlpool_pubkey,
      TickUtil.getStartTickIndex(128, poolData.tickSpacing)
    );

    let tichArrayDataLower:InitTickArrayParams = {
      whirlpool:whirlpool_pubkey,
      tickArrayPda: tickArrayLower,
      startTick:positionInitInfo.tickLowerIndex,
      funder: ctx.wallet.publicKey,
    };

    let tichArrayDataUpper: InitTickArrayParams = {
      whirlpool:whirlpool_pubkey,
      tickArrayPda: tickArrayUpper,
      startTick:positionInitInfo.tickUpperIndex,
      funder: ctx.wallet.publicKey,
    };
    //let tATx1 = await toTx(ctx, WhirlpoolIx.initTickArrayIx(ctx.program, tichArrayDataLower)).buildAndExecute();
    //let tATx2 = await toTx(ctx, WhirlpoolIx.initTickArrayIx(ctx.program, tichArrayDataUpper)).buildAndExecute();

   // console.log(tATx1)

    console.log({
      liquidityAmount,
      tokenMaxA: tokenAmount.tokenA.toString(),
      tokenMaxB: tokenAmount.tokenB.toString(),
      whirlpool: whirlpool_pubkey.toBase58(),
      positionAuthority: provider.wallet.publicKey.toBase58(),
      position: positionInitInfo.whirlpool.toBase58(),
      positionTokenAccount: positionTokenAccountAddress.toBase58(),
      tokenOwnerAccountA: tokenOwnerAccountB.toBase58(),
      tokenOwnerAccountB: tokenOwnerAccountA.toBase58(),
      tokenVaultA: poolData.tokenVaultA.toBase58(),
      tokenVaultB: poolData.tokenVaultB.toBase58(),
      tickArrayLower: tickArrayLower.publicKey.toBase58(),
      tickArrayUpper: tickArrayUpper.publicKey.toBase58(),
      mintA:poolData.tokenMintA.toBase58(),
      mintB:poolData.tokenMintB.toBase58()
    })

    //HHBmz3fgxEs1QNPsznDJEWkJS3QtdKkNsVWabrjkw3Q5
let programID=new PublicKey("ENzAqkGsKtTmgoNj2kWBjeHdvu8XoKrgHbzYSxneXpfQ");
console.log({pubkey: ORCA_WHIRLPOOL_PROGRAM_ID.toString(), isSigner: false, isWritable: false})
console.log({pubkey: ctx.wallet.publicKey.toString(), isSigner: false, isWritable: false})
console.log({pubkey: positionPda.publicKey.toString(), isSigner: false, isWritable: false})
console.log({pubkey: positionTokenAccountAddress.toString(), isSigner: false, isWritable: false})
console.log({pubkey: TOKEN_PROGRAM_ID.toString(), isSigner: false, isWritable: false})
console.log({pubkey: whirlpool_pubkey.toString(), isSigner: false, isWritable: true})
console.log({pubkey: tokenOwnerAccountA.toString(), isSigner: false, isWritable: false})
console.log({pubkey: tokenOwnerAccountB.toString(), isSigner: false, isWritable: false})
console.log({pubkey: poolData.tokenVaultA.toString(), isSigner: false, isWritable: false})
console.log({pubkey: poolData.tokenVaultB.toString(), isSigner: false, isWritable: false})
console.log({pubkey: tickArrayLower.publicKey.toString(), isSigner: false, isWritable: false})
console.log({pubkey: tickArrayUpper.publicKey.toString(), isSigner: false, isWritable: false})


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
  data: Buffer.from([]), // All instructions are hellos
});
let tx= await sendAndConfirmTransaction(
  ctx.connection,
  new Transaction().add(instruction),
  [payer],
); 
console.log("txxx ",tx)
   /* let tx = await toTx(
      ctx,
      WhirlpoolIx.increaseLiquidityIx(ctx.program, {
        liquidityAmount,
        tokenMaxA: tokenAmount.tokenA,
        tokenMaxB: tokenAmount.tokenB,
        whirlpool: positionInitInfo.whirlpool,
        positionAuthority: provider.wallet.publicKey,
        position: positionPda.publicKey,
        positionTokenAccount: positionTokenAccountAddress,
        tokenOwnerAccountA: tokenOwnerAccountB,
        tokenOwnerAccountB: tokenOwnerAccountA,
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
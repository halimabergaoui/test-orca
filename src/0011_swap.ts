
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
import { ORCAConfigPoolMainnet } from "./pools";
import  BufferLayout = require('buffer-layout');
import { u128 } from "./u128";
import { TokenOrigin } from "./client-origin/token";

const uint64 = (property = "uint64") => {
  return BufferLayout.blob(8, property);
};

const uint128 = (property = "uint128") => {
  return BufferLayout.blob(16, property);
};
// any one can open a position: have a mint created with no minting authority and 0 liquidity
async function main() {
  let solanaConfigMainnet = ORCAConfigPoolMainnet()
  let tokenList = solanaConfigMainnet[0].token
  let fixTicker = "WSOL";
  for(let ticker in tokenList){
    if(ticker !=fixTicker)
      {let selectedToken = tokenList[ticker]
      let usdcToken = tokenList[fixTicker]
      let pool = ticker.concat(fixTicker)
      let tokenA = selectedToken
      let tokenB = usdcToken
      let atob = false
      let way="swap reverse"
      let poolConfig = solanaConfigMainnet[0].OrcaPoolList[pool]
      if(!poolConfig){
        pool = fixTicker.concat(ticker)
        poolConfig = solanaConfigMainnet[0].OrcaPoolList[pool]
        tokenA = usdcToken
        tokenB = selectedToken
        atob = true
        way = "swap"
      }
console.log(ticker,way)
      //console.log(pool," - ",atob,tokenA,tokenB)
      if(poolConfig){
      //let tx = await orcaSwap(tokenA,tokenB,poolConfig,atob,fixTicker,ticker)
      //console.log(pool," - ",atob," - ", tx, )
    }
      else{
       // console.log(fixTicker,",",0,",",ticker,",--",",",0,",There is no pool with ",fixTicker)
       }
    }
  }
}

export async function orcaSwap(tokenA:any,tokenB:any,poolConfig:any,atob:any,fixTicker:any,ticker:any){
  process.env.ANCHOR_PROVIDER_URL = "http://api.mainnet-beta.solana.com"
  process.env.ANCHOR_WALLET = "../wallet.json"
    const provider = Provider.env();
    
    const ctx = WhirlpoolContext.withProvider(provider, ORCA_WHIRLPOOL_PROGRAM_ID);
    const fetcher = new AccountFetcher(ctx.connection);
    const client = buildWhirlpoolClient(ctx, fetcher);
  
    //console.log("endpoint:", ctx.connection.rpcEndpoint);
   // console.log("wallet pubkey:", ctx.wallet.publicKey.toBase58());

    let defaultParams: OpenPositionParams;
  let defaultMint: Keypair;
  
  const tokenOwnerAccountA = await getOrCreateATA(provider.connection, new PublicKey(tokenA.mint), provider.wallet.publicKey)
  const tokenOwnerAccountB = await getOrCreateATA(provider.connection, new PublicKey(tokenB.mint), provider.wallet.publicKey)
  const whirlpool_pubkey = new PublicKey(poolConfig.address)

        let poolData = await fetcher.getPool(whirlpool_pubkey)
        
        const oraclePda = PDAUtil.getOracle(ctx.program.programId, whirlpool_pubkey);

        const amount_in = new Decimal("0.001" /* devUSDC */);
        const whirlpool = await client.getPool(whirlpool_pubkey);
        
        let quoteToken=tokenA
        let secondToken=tokenB
        let quoteAccount=tokenOwnerAccountB
        if(!atob) {
          quoteAccount=tokenOwnerAccountA
          quoteToken=tokenB
          secondToken=tokenA
        }
        let details =""
       let Result = ""
       let amount = 0
       try{
       // console.log("computing quore ....",quoteToken)
        const quote = await swapQuoteByInputToken(
          whirlpool,
          quoteToken.mint,
          DecimalUtil.toU64(amount_in,quoteToken.decimal),
          Percentage.fromFraction(10, 1000),
          ORCA_WHIRLPOOL_PROGRAM_ID,
          fetcher,
          true
        );  
        //console.log ("quote ", quote.amount.toNumber(),quote.estimatedAmountIn.toNumber(), quote.estimatedAmountOut.toNumber(), quote.estimatedFeeAmount.toNumber(),quote.otherAmountThreshold.toNumber(),quote.aToB, quote.sqrtPriceLimit.toString(),quote.amountSpecifiedIsInput)

        const dataLayout = BufferLayout.struct([
          BufferLayout.u8('instruction'),
          uint64('amount'),
          uint64('other_amount_threshold'),
          BufferLayout.blob(16, 'sqrt_price_limit'),
      ]);
        const data = Buffer.alloc(dataLayout.span);
        let instructionNumber=5;
        if(!atob)instructionNumber=6
        dataLayout.encode(
          {
            instruction: instructionNumber, // withdraw from quarry
            amount: quote.amount.toBuffer(),
            other_amount_threshold: new u64(quote.otherAmountThreshold.toNumber()).toBuffer(),//quote.otherAmountThreshold.toBuffer(),
            sqrt_price_limit: new u128(quote.sqrtPriceLimit.toString()).toBuffer(),
          },
          data
        );


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
        const instruction = new TransactionInstruction({
         keys,
         programId:Program_id,
         data 
       });
       
        let infoBefore = await TokenOrigin.getAccountInfo(quoteAccount,ctx.connection)

        let tx = await sendAndConfirmTransaction(
         ctx.connection,
         new Transaction().add(instruction),
         [payer],
       ); 
       Result= "success"
       details = tx
       //let info = ctx.connection.getAccountInfo(tokenOwnerAccountB)
       //console.log(quoteAccount.toBase58())
       await new Promise(r => setTimeout(r, 15000));

       let info = await TokenOrigin.getAccountInfo(quoteAccount,ctx.connection)
       amount = info.amount?.toNumber()-infoBefore.amount?.toNumber()
        }
        catch(err){
           details = err
           Result = "failed"
        }

       let way = "swap"
       if(!atob) way = "swap reverse"




       console.log(fixTicker,",",amount_in.toNumber(),",",ticker,",",Result,",",amount/10**secondToken.decimal,",",details) 

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
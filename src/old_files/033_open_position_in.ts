import { Account, PublicKey, sendAndConfirmTransaction, Transaction } from "@solana/web3.js";
import { Provider } from "@project-serum/anchor";
import {
  WhirlpoolContext, AccountFetcher, buildWhirlpoolClient, ORCA_WHIRLPOOL_PROGRAM_ID,
  PDAUtil, PriceMath, increaseLiquidityQuoteByInputTokenWithParams
} from "@orca-so/whirlpools-sdk";
import { DecimalUtil, Percentage } from "@orca-so/common-sdk";
import Decimal from "decimal.js";
let { Token, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } = require('@solana/spl-token');
// スクリプト実行前に環境変数定義が必要です
// ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
// ANCHOR_WALLET=wallet.json

async function main() {
  // WhirlpoolClient 作成
  const provider = Provider.env();
  const ctx = WhirlpoolContext.withProvider(provider, ORCA_WHIRLPOOL_PROGRAM_ID);
  const fetcher = new AccountFetcher(ctx.connection);
  const client = buildWhirlpoolClient(ctx, fetcher);

  console.log("endpoint:", ctx.connection.rpcEndpoint);
  console.log("wallet pubkey:", ctx.wallet.publicKey.toBase58());

  // トークン定義
  // devToken specification
  // https://everlastingsong.github.io/nebula/
  /*const devUSDC = {mint: new PublicKey("BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k"), decimals: 6};
  const devSAMO = {mint: new PublicKey("Jd4M8bfJG3sAkd82RsGWyEXoaBXQP7njFzBwEaCTuDa"), decimals: 9};

  // Whirlpool の Config アカウント
  // devToken ecosystem / Orca Whirlpools
  const NEBULA_WHIRLPOOLS_CONFIG = new PublicKey("FcrweFY1G9HJAHG5inkGB6pKg1HZ6x9UC2WioAfWrGkR");*/
  const devUSDC = {mint: new PublicKey("98orpNzdRzFbmi4dy7dUhJVmkpAXybTFENCbz7422Hpa"), decimals: 6};
  const devSAMO = {mint: new PublicKey("8abbvizPsQHbb16dSEbt368hsLmMvCV9GnNjsoVqcXJg"), decimals: 6};
 /*let ATA1 = await findAssociatedTokenAddress(ctx.wallet.publicKey,devUSDC.mint)
 let ATA2 =await findAssociatedTokenAddress(ctx.wallet.publicKey,devSAMO.mint)
 let usdcToken = new Token(
  ctx.connection,
  devUSDC.mint,
  TOKEN_PROGRAM_ID,
  ctx.wallet);


  let instruction = await Token.createAssociatedTokenAccountInstruction(ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, devSAMO.mint, ATA2, ctx.wallet.publicKey, ctx.wallet.publicKey)
  let payer=new Account([205,62,53,122,36,145,91,159,243,52,151,211,241,72,208,149,27,191,111,144,94,242,0,112,88,217,3,220,231,156,213,208,247,56,95,29,120,8,135,163,36,1,4,39,147,18,117,17,88,15,96,52,110,67,49,166,147,0,103,101,28,54,54,50])
    let x2 = await sendAndConfirmTransaction(
        provider.connection,
        new Transaction().add(instruction),
         [payer],
    );
    console.log("create ATA ", x2)
  
  //.getOrCreateAssociatedAccountInfo(new PublicKey("He3ZHVNWSpfqGxxSS61YWgUYRzkdQHxQUAeHDh94jqpD"))
 console.log(ATA1.toBase58(),ATA2.toBase58())*/
  // Whirlpool の Config アカウント
  // devToken ecosystem / Orca Whirlpools
  //Fa4RXcZXUr1htZHeACLKpkY29MCankxQ1PpKUQSSjYnx
  const NEBULA_WHIRLPOOLS_CONFIG = new PublicKey("AW3sJoQdMEBXq27tSALqw7tWi9i9HT2rGv8WoJ6ncDqd");

  // devSAMO/devUSDC プール取得
  const tick_spacing = 128;
  const whirlpool_pubkey = PDAUtil.getWhirlpool(
      ORCA_WHIRLPOOL_PROGRAM_ID,
      NEBULA_WHIRLPOOLS_CONFIG,
      devSAMO.mint, devUSDC.mint, tick_spacing).publicKey;
  console.log("whirlpool_key:", whirlpool_pubkey.toBase58());
  const whirlpool = await client.getPool(whirlpool_pubkey);

  // プールにおける現在価格を取得
  const sqrt_price_x64 = whirlpool.getData().sqrtPrice;
  const price = PriceMath.sqrtPriceX64ToPrice(sqrt_price_x64, devSAMO.decimals, devUSDC.decimals);
  console.log("price:", price.toFixed(devUSDC.decimals));

  // 価格帯とデポジットするトークンの量、許容するスリッページを設定
  const lower_price = new Decimal("0.005");
  const upper_price = new Decimal("0.02");
  const dev_usdc_amount = DecimalUtil.toU64(new Decimal("0.000001" /* devUSDC */), devUSDC.decimals);
  const slippage = Percentage.fromFraction(10, 1000); // 1%

  // 価格帯を調整 (全ての価格が設定可能ではなく、範囲指定に利用できる価格は決まっている(InitializableTickIndexに対応する価格))
  const whirlpool_data = whirlpool.getData();
  const token_a = whirlpool.getTokenAInfo();
  const token_b = whirlpool.getTokenBInfo();
  const lower_tick_index = PriceMath.priceToInitializableTickIndex(lower_price, token_a.decimals, token_b.decimals, whirlpool_data.tickSpacing);
  const upper_tick_index = PriceMath.priceToInitializableTickIndex(upper_price, token_a.decimals, token_b.decimals, whirlpool_data.tickSpacing);
  console.log("lower & upper tick_index", lower_tick_index, upper_tick_index);
  console.log("lower & upper price",
    PriceMath.tickIndexToPrice(lower_tick_index, token_a.decimals, token_b.decimals).toFixed(token_b.decimals),
    PriceMath.tickIndexToPrice(upper_tick_index, token_a.decimals, token_b.decimals).toFixed(token_b.decimals)
  );

  // 見積もりを取得
  const quote = increaseLiquidityQuoteByInputTokenWithParams({
    // プールの定義や状態をそのまま渡す
    tokenMintA: token_a.mint,
    tokenMintB: token_b.mint,
    sqrtPrice: whirlpool_data.sqrtPrice,
    tickCurrentIndex: whirlpool_data.tickCurrentIndex,
    // 価格帯
    tickLowerIndex: lower_tick_index,
    tickUpperIndex: upper_tick_index,
    // 入力にするトークン
    inputTokenMint: devUSDC.mint,
    inputTokenAmount: dev_usdc_amount,
    // スリッページ
    slippageTolerance: slippage,
  });

  // 見積もり結果表示
  console.log("devSAMO max input", DecimalUtil.fromU64(quote.tokenMaxA, token_a.decimals).toFixed(token_a.decimals));
  console.log("devUSDC max input", DecimalUtil.fromU64(quote.tokenMaxB, token_b.decimals).toFixed(token_b.decimals));

  // トランザクションを作成
  const open_position_tx = await whirlpool.openPositionWithMetadata(
    lower_tick_index,
    upper_tick_index,
    quote
  );

  // トランザクションを送信
  const signature = await open_position_tx.tx.buildAndExecute();
  console.log("signature:", signature);
  console.log("position NFT:", open_position_tx.positionMint.toBase58());

  // トランザクション完了待ち
  await ctx.connection.confirmTransaction(signature, "confirmed");
}


async function findAssociatedTokenAddress(
  walletAddress: PublicKey,
  tokenMintAddress: PublicKey
): Promise<PublicKey> {
  return (
    await PublicKey.findProgramAddress(
      [
        walletAddress.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        tokenMintAddress.toBuffer(),
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID
    )
  )[0];
}

main();
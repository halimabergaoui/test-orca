import { Provider, BN } from "@project-serum/anchor";
import {
  WhirlpoolContext, AccountFetcher, buildWhirlpoolClient, ORCA_WHIRLPOOL_PROGRAM_ID,
  PDAUtil, PriceMath, PoolUtil
} from "@orca-so/whirlpools-sdk";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { DecimalUtil, TokenUtil } from "@orca-so/common-sdk";

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

  // 全てのトークンアカウントを取得
  const token_accounts = (await ctx.connection.getTokenAccountsByOwner(ctx.wallet.publicKey, {programId: TOKEN_PROGRAM_ID})).value;

  // ポジションのアドレス候補を取得
  const whirlpool_position_candidate_pubkeys = token_accounts.map((ta) => {
    const parsed = TokenUtil.deserializeTokenAccount(ta.account.data);

    // ミントアドレスから Whirlpool のポジションのアドレスを導出(実在するかは問わない)
    const pda = PDAUtil.getPosition(ctx.program.programId, parsed.mint);

    // トークン数が 1 の場合のみ Whirlpool のポジションのアドレスを返す(空のトークンアカウントやNFTではないものは無視)
    return (parsed.amount as BN).eq(new BN(1)) ? pda.publicKey : undefined;
  }).filter(pubkey => pubkey !== undefined);

  // Whirlpool のポジションのアドレスからデータを取得
  const whirlpool_position_candidate_datas = await fetcher.listPositions(whirlpool_position_candidate_pubkeys, true);
  // 正しくデータ取得できたアドレスのみポジションのアドレスとして残す
  const whirlpool_positions = whirlpool_position_candidate_pubkeys.filter((pubkey, i) => 
    whirlpool_position_candidate_datas[i] !== null
  );

  // 状態表示
  for (let i=0; i < whirlpool_positions.length; i++ ) {
    const p = whirlpool_positions[i];

    // ポジションの情報取得
    const position = await client.getPosition(p);
    const data = position.getData();

    // ポジションが属しているプールを取得
    const pool = await client.getPool(data.whirlpool);
    const token_a = pool.getTokenAInfo();
    const token_b = pool.getTokenBInfo();
    const price = PriceMath.sqrtPriceX64ToPrice(pool.getData().sqrtPrice, token_a.decimals, token_b.decimals);

    // 価格帯を取得
    const lower_price = PriceMath.tickIndexToPrice(data.tickLowerIndex, token_a.decimals, token_b.decimals);
    const upper_price = PriceMath.tickIndexToPrice(data.tickUpperIndex, token_a.decimals, token_b.decimals);

    // ポジション内のトークンの量を計算
    const amounts = PoolUtil.getTokenAmountsFromLiquidity(
      data.liquidity,
      pool.getData().sqrtPrice,
      PriceMath.tickIndexToSqrtPriceX64(data.tickLowerIndex),
      PriceMath.tickIndexToSqrtPriceX64(data.tickUpperIndex),
      true
    );

    // ポジションの情報表示
    console.log("position:", i, p.toBase58());
    console.log("\twhirlpool address:", data.whirlpool.toBase58());
    console.log("\twhirlpool price:", price.toFixed(token_b.decimals));
    console.log("\ttokenA:", token_a.mint.toBase58());
    console.log("\ttokenB:", token_b.mint.toBase58());
    console.log("\tliquidity:", data.liquidity.toString());
    console.log("\tlower:", data.tickLowerIndex, lower_price.toFixed(token_b.decimals));
    console.log("\tupper:", data.tickUpperIndex, upper_price.toFixed(token_b.decimals));
    console.log("\tamountA:", DecimalUtil.fromU64(amounts.tokenA, token_a.decimals).toString());
    console.log("\tamountB:", DecimalUtil.fromU64(amounts.tokenB, token_b.decimals).toString());
  }
}

main();
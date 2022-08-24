
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


  const devUSDC = {mint: new PublicKey("7p6QmuWHsYRSegWKB8drgLmL2tqrQ7gYyUVC1j7CYVnT"), decimals: 6};
  const devSAMO = {mint: new PublicKey("F7ksMSuEWqfnK6rXXn8Z7HocP1uYsJVdSzXUzWmFmu5V"), decimals: 6};
  let tick_spacing = TickSpacing.Standard
  const NEBULA_WHIRLPOOLS_CONFIG = new PublicKey("CcjXapx2zMZ5LJPSwVmy8YcSH957P9h7QXYbrr3Mszob");  
    
  //get pool from corresponding to mints and space
    const whirlpool_pubkey = PDAUtil.getWhirlpool(
        ORCA_WHIRLPOOL_PROGRAM_ID,
        NEBULA_WHIRLPOOLS_CONFIG,
       devUSDC.mint, devSAMO.mint,  tick_spacing).publicKey;


let startTick=128*88
const tickArrays = await initTickArrayRange(
  ctx,
  whirlpool_pubkey,
  0, // to 28160, 28864
  5,
  TickSpacing.Standard,
  false
);
tickArrays.forEach(el => console.log(el.publicKey.toBase58()))

}

export async function initTickArrayRange(
  ctx: WhirlpoolContext,
  whirlpool: PublicKey,
  startTickIndex: number,
  arrayCount: number,
  tickSpacing: number,
  aToB: boolean
): Promise<PDA[]> {
  const ticksInArray = tickSpacing * 88;
  const direction = aToB ? -1 : 1;
  const result: PDA[] = [];

  for (let i = 0; i < arrayCount; i++) {
    const { params } = await initTickArray(
      ctx,
      whirlpool,
      startTickIndex + direction * ticksInArray * i
    );
    result.push(params.tickArrayPda);
  }

  return result;
}

export async function initTickArray(
  ctx: WhirlpoolContext,
  whirlpool: PublicKey,
  startTickIndex: number,
  funder?: Keypair
): Promise<{ txId: string; params: InitTickArrayParams }> {
  const params = generateDefaultInitTickArrayParams(
    ctx,
    whirlpool,
    startTickIndex,
    funder?.publicKey
  );
  const tx = toTx(ctx, WhirlpoolIx.initTickArrayIx(ctx.program, params));
  if (funder) {
    tx.addSigner(funder);
  }
  return { txId: await tx.buildAndExecute(), params };
}

export const generateDefaultInitTickArrayParams = (
  context: WhirlpoolContext,
  whirlpool: PublicKey,
  startTick: number,
  funder?: PublicKey
): InitTickArrayParams => {
  const tickArrayPda = PDAUtil.getTickArray(context.program.programId, whirlpool, startTick);

  return {
    whirlpool,
    tickArrayPda: tickArrayPda,
    startTick,
    funder: funder || context.wallet.publicKey,
  };
};

export type InitTickArrayParams = {
  whirlpool: PublicKey;
  tickArrayPda: PDA;
  startTick: number;
  funder: PublicKey;
}; 
export function toTx(ctx: WhirlpoolContext, ix: Instruction): TransactionBuilder {
  return new TransactionBuilder(ctx.provider).addInstruction(ix);
}

  main()
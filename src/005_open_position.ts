
import { Provider } from "@project-serum/anchor";
import * as anchor from "@project-serum/anchor";
const BN = anchor.BN
import {
  WhirlpoolContext, AccountFetcher, buildWhirlpoolClient, ORCA_WHIRLPOOL_PROGRAM_ID,
  PDAUtil, PoolUtil, WhirlpoolIx, InitConfigParams, WhirlpoolsConfigData, OpenPositionParams, InitPoolParams, PositionData, TickUtil, InitTickArrayParams
} from "@orca-so/whirlpools-sdk";
import {
  EMPTY_INSTRUCTION, deriveATA, resolveOrCreateATA
} from "@orca-so/common-sdk";
import { MathUtil, PDA, Percentage } from "@orca-so/common-sdk";
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Account, Keypair, PublicKey, sendAndConfirmTransaction, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction, TransactionInstruction } from "@solana/web3.js";
import Decimal from "decimal.js";
import { TransactionBuilder, Instruction } from "@orca-so/common-sdk";
import { TickSpacing } from "./tick_spacing";
import { payer } from "./payer";
import { ORCAConfigPoolMainnet } from "./pools";
import BufferLayout = require('buffer-layout');
import { u32 } from "./u32";
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

  // funder should have sol
  const funderKeypair = payer
  let solanaConfigMainnet = ORCAConfigPoolMainnet()
  let poolConfig = solanaConfigMainnet[0].OrcaPoolList['USDCUSDT']
  const tokenA = { mint: new PublicKey(poolConfig.tokenMintA), decimals: poolConfig.decimalA };
  const tokenB = { mint: new PublicKey(poolConfig.tokenMintB), decimals: poolConfig.decimalB };
  let tick_spacing = poolConfig.tickSpacing
  //const NEBULA_WHIRLPOOLS_CONFIG = new PublicKey("AtSGG1e6gx2cistKmhPFUnr8Xy1oJFzPSzSCXKPZ5uNv");

  //get pool corresponding to mints and space
  const whirlpool_pubkey = new PublicKey(poolConfig.address)

  let poolData = await fetcher.getPool(whirlpool_pubkey)
  console.log("current index",poolData.tickCurrentIndex)
let tickLowerIndex = -88 * 1 * tick_spacing * poolData.tickCurrentIndex;
let tickUpperIndex = 88 * 1 * tick_spacing * poolData.tickCurrentIndex;
  // generate position params
  const { params, mint } = await generateDefaultOpenPositionParams(
    ctx,
    whirlpool_pubkey,
    tickLowerIndex,
    tickUpperIndex,
    provider.wallet.publicKey,
    funderKeypair.publicKey
  );
  defaultParams = params;
  defaultMint = mint;
  let withMetadata = false
  //await systemTransferTx(provider, funderKeypair.publicKey, ONE_SOL).buildAndExecute();
  /* let tx = withMetadata
  ? toTx(ctx, WhirlpoolIx.openPositionWithMetadataIx(ctx.program, params))
  : toTx(ctx, WhirlpoolIx.openPositionIx(ctx.program, params));
tx.addSigner(mint);
if (funderKeypair) {
  tx.addSigner(funderKeypair);
}
const txId = await tx.buildAndExecute();
console.log("open position txn ", txId) */
  /*funder: funder || context.wallet.publicKey,
      owner: owner,
      positionPda,
      metadataPda,
      positionMintAddress: positionMintKeypair.publicKey,
      positionTokenAccount: positionTokenAccountAddress,
      whirlpool: whirlpool,
      tickLowerIndex,
      tickUpperIndex,*/
  let bumps = params.positionPda.bump
  let programID = new PublicKey("EkiPuMSQNWfX694cBZwtN1t5bHxJ4JBB8d3vfsQYxD9B");
  console.log({ pubkey: ORCA_WHIRLPOOL_PROGRAM_ID.toString(), isSigner: false, isWritable: false })
  console.log({ pubkey: params.positionPda.publicKey.toString(), isSigner: false, isWritable: true })
  console.log({ pubkey: params.positionMintAddress.toString(), isSigner: true, isWritable: true })
  console.log({ pubkey: params.positionTokenAccount.toString(), isSigner: false, isWritable: true })
  console.log({ pubkey: TOKEN_PROGRAM_ID.toString(), isSigner: false, isWritable: false })
  console.log({ pubkey: params.funder.toString(), isSigner: true, isWritable: false })
  console.log({ pubkey: params.owner.toString(), isSigner: true, isWritable: false })
  console.log({ pubkey: params.whirlpool.toString(), isSigner: false, isWritable: false })
  console.log({ pubkey: SystemProgram.programId.toString(), isSigner: false, isWritable: false })
  console.log({ pubkey: SYSVAR_RENT_PUBKEY.toString(), isSigner: false, isWritable: false })
  console.log({ pubkey: ASSOCIATED_TOKEN_PROGRAM_ID.toString(), isSigner: false, isWritable: false })
  const dataLayout = BufferLayout.struct([
    BufferLayout.u8('instruction'),
    BufferLayout.u8('position_bump'),
    BufferLayout.blob(4, 'tick_lower_index'),
    BufferLayout.blob(4, 'tick_upper_index'),
  ]);
  const data = Buffer.alloc(dataLayout.span);

  dataLayout.encode(
    {
      instruction: 1, // withdraw from quarry
      position_bump: bumps,
      // amount: new u64(4000000).toBuffer(),
      tick_lower_index: new u32(tickLowerIndex).toBuffer(),//quote.otherAmountThreshold.toBuffer(),
      tick_upper_index: new u32(tickUpperIndex).toBuffer(),
    },
    data
  );
  let keys = [
    { pubkey: ORCA_WHIRLPOOL_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: params.positionPda.publicKey, isSigner: false, isWritable: true },
    { pubkey: params.positionMintAddress, isSigner: true, isWritable: true },
    { pubkey: params.positionTokenAccount, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: params.funder, isSigner: true, isWritable: true },
    { pubkey: params.owner, isSigner: true, isWritable: false },
    { pubkey: params.whirlpool, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },

  ];
  // console.log(keys, SystemProgram.programId)

  const instruction = new TransactionInstruction({
    keys,
    programId: programID,
    data, // All instructions are hellos
  });
  let tx= await sendAndConfirmTransaction(
     ctx.connection,
     new Transaction().add(instruction),
     [payer,funderKeypair,defaultMint],
   ); 
   console.log("txxx ",tx)    
}

export async function generateDefaultOpenPositionParams(
  context: WhirlpoolContext,
  whirlpool: PublicKey,
  tickLowerIndex: number,
  tickUpperIndex: number,
  owner: PublicKey,
  funder?: PublicKey
): Promise<any> {
  const positionMintKeypair = Keypair.generate();
  console.log("position pk ", positionMintKeypair.publicKey.toBase58())
  // get cpi auth position and metada programs
  const positionPda = PDAUtil.getPosition(context.program.programId, positionMintKeypair.publicKey);
  console.log(positionPda.publicKey.toBase58(), positionPda.bump)
  const metadataPda = PDAUtil.getPositionMetadata(positionMintKeypair.publicKey);
  console.log(metadataPda.publicKey.toBase58(), metadataPda.bump)

  const positionTokenAccountAddress = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    positionMintKeypair.publicKey,
    owner
  );
  console.log(positionTokenAccountAddress.toBase58())

  const params: Required<OpenPositionParams & { metadataPda: PDA }> = {
    funder: funder || context.wallet.publicKey,
    owner: owner,
    positionPda,
    metadataPda,
    positionMintAddress: positionMintKeypair.publicKey,
    positionTokenAccount: positionTokenAccountAddress,
    whirlpool: whirlpool,
    tickLowerIndex,
    tickUpperIndex,
  };
  //funder? mm peut etre
  console.log(params.funder.toBase58())
  //auth metadata
  console.log(params.metadataPda.publicKey.toBase58())
  //owner
  console.log(params.owner.toBase58())
  //posistion mint : new keypair
  console.log(params.positionMintAddress.toBase58())
  //position ATA of owner
  console.log(params.positionTokenAccount.toBase58())
  //0
  console.log(params.tickLowerIndex.toString())
  //128
  console.log(params.tickUpperIndex.toString())
  // pool address
  console.log(params.whirlpool.toBase58())

  return {
    params,
    mint: positionMintKeypair,
  };
}



export function toTx(ctx: WhirlpoolContext, ix: Instruction): TransactionBuilder {
  return new TransactionBuilder(ctx.provider).addInstruction(ix);
}

main()
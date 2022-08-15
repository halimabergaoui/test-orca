
import { Provider } from "@project-serum/anchor";
import * as anchor from "@project-serum/anchor";
const BN = anchor.BN
import {
  WhirlpoolContext, AccountFetcher, buildWhirlpoolClient, ORCA_WHIRLPOOL_PROGRAM_ID,
  PDAUtil, PoolUtil, WhirlpoolIx, InitConfigParams, WhirlpoolsConfigData, OpenPositionParams, InitPoolParams, PositionData
} from "@orca-so/whirlpools-sdk";
import {
   EMPTY_INSTRUCTION, deriveATA, resolveOrCreateATA
} from "@orca-so/common-sdk";
import { MathUtil, PDA, Percentage } from "@orca-so/common-sdk";
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Account, Keypair, PublicKey } from "@solana/web3.js";
import Decimal from "decimal.js";
import { TransactionBuilder, Instruction } from "@orca-so/common-sdk";
import { TickSpacing } from "./tick_spacing";
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

  // funder should have sol
  const funderKeypair = new Account([
    29, 152, 251,  98, 180, 233, 207,  49, 167, 119, 143,
   121, 179,  73,  74, 248, 220, 152, 105,  60,  59, 176,
   191, 128,  21,  99, 136, 244,   5, 195,  26, 252, 204,
   130,  85, 108, 248, 117,   3, 154,  92,  78, 183, 121,
   185, 219, 142,  77, 218,   3,  90, 119, 253, 137, 123,
   236, 114, 170,  55,   9, 226, 162,  59,  76])
   //anchor.web3.Keypair.generate();
  //console.log("funder",funderKeypair.publicKey.toBase58())
  const devUSDC = {mint: new PublicKey("98orpNzdRzFbmi4dy7dUhJVmkpAXybTFENCbz7422Hpa"), decimals: 6};
  const devSAMO = {mint: new PublicKey("8abbvizPsQHbb16dSEbt368hsLmMvCV9GnNjsoVqcXJg"), decimals: 6};
  let tick_spacing = TickSpacing.Standard
  const NEBULA_WHIRLPOOLS_CONFIG = new PublicKey("AW3sJoQdMEBXq27tSALqw7tWi9i9HT2rGv8WoJ6ncDqd");
    
  //get pool corresponding to mints and space
    const whirlpool_pubkey = PDAUtil.getWhirlpool(
        ORCA_WHIRLPOOL_PROGRAM_ID,
        NEBULA_WHIRLPOOLS_CONFIG,
        devSAMO.mint, devUSDC.mint, tick_spacing).publicKey;

  // generate position params
    const { params, mint } = await generateDefaultOpenPositionParams(
      ctx,
      whirlpool_pubkey,
      0,
      TickSpacing.Standard,
      provider.wallet.publicKey,
      funderKeypair.publicKey
    );
    defaultParams = params;
    defaultMint = mint;
    let withMetadata = false
    //await systemTransferTx(provider, funderKeypair.publicKey, ONE_SOL).buildAndExecute();
    let tx = withMetadata
    ? toTx(ctx, WhirlpoolIx.openPositionWithMetadataIx(ctx.program, params))
    : toTx(ctx, WhirlpoolIx.openPositionIx(ctx.program, params));
  tx.addSigner(mint);
  if (funderKeypair) {
    tx.addSigner(funderKeypair);
  }
  const txId = await tx.buildAndExecute();
  console.log("open position txn ", txId)

//fetch position  
    //  const position = (await fetcher.getPosition(mint)) as PositionData;

}

export async function generateDefaultOpenPositionParams(
    context: WhirlpoolContext,
    whirlpool: PublicKey,
    tickLowerIndex: number,
    tickUpperIndex: number,
    owner: PublicKey,
    funder?: PublicKey
  ): Promise< any > {
    const positionMintKeypair = Keypair.generate();
    console.log("position pk ", positionMintKeypair.publicKey.toBase58())
    // get cpi auth position and metada programs
    const positionPda = PDAUtil.getPosition(context.program.programId, positionMintKeypair.publicKey);
    console.log(positionPda.publicKey.toBase58(),positionPda.bump)
    const metadataPda = PDAUtil.getPositionMetadata(positionMintKeypair.publicKey);
    console.log(metadataPda.publicKey.toBase58(),metadataPda.bump)

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
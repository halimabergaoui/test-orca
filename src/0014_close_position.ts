
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
import { Account, Keypair, PublicKey, sendAndConfirmTransaction, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction, TransactionInstruction } from "@solana/web3.js";
import Decimal from "decimal.js";
import { TransactionBuilder, Instruction } from "@orca-so/common-sdk";
import { TickSpacing } from "./tick_spacing";
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

  // funder should have sol

   //anchor.web3.Keypair.generate();
  //console.log("funder",funderKeypair.publicKey.toBase58())
  const devUSDC = {mint: new PublicKey("7p6QmuWHsYRSegWKB8drgLmL2tqrQ7gYyUVC1j7CYVnT"), decimals: 6};
  const devSAMO = {mint: new PublicKey("F7ksMSuEWqfnK6rXXn8Z7HocP1uYsJVdSzXUzWmFmu5V"), decimals: 6};
  let tick_spacing = TickSpacing.Standard
  const NEBULA_WHIRLPOOLS_CONFIG = new PublicKey("AtSGG1e6gx2cistKmhPFUnr8Xy1oJFzPSzSCXKPZ5uNv");
  let positionMint = new PublicKey("BCqRYzHMBAEQqT6ERZjt81cmG5g8xHm6nr9jQ5VPTNY3")
  const positionPda = PDAUtil.getPosition(ctx.program.programId, positionMint);
  const positionTokenAccountAddress = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    positionMint,
    payer.publicKey
  );



    
  //get pool corresponding to mints and space
    const whirlpool_pubkey = PDAUtil.getWhirlpool(
        ORCA_WHIRLPOOL_PROGRAM_ID,
        NEBULA_WHIRLPOOLS_CONFIG,
        devSAMO.mint, devUSDC.mint, tick_spacing).publicKey;

    let programID=new PublicKey("7m8rA1npZfiKeF1DE3PGgT4w73gmT7hnHho4C5yKTBaw");
    
    let  keys=[
      {pubkey: ORCA_WHIRLPOOL_PROGRAM_ID, isSigner: false, isWritable: false},
      {pubkey: payer.publicKey, isSigner: true, isWritable: false},
      {pubkey: payer.publicKey, isSigner: false, isWritable: true},
      {pubkey: positionPda.publicKey, isSigner: false, isWritable: true},
      {pubkey: positionMint, isSigner: false, isWritable: true},
      {pubkey: positionTokenAccountAddress, isSigner: false, isWritable: true},
      {pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false},
    ];
   // console.log(keys, SystemProgram.programId)
    
    const instruction = new TransactionInstruction({
       // @ts-ignore
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
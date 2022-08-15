import { ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Keypair, PublicKey, sendAndConfirmTransaction, Transaction } from "@solana/web3.js";
import secret from "../wallet.json";

export async function getOrCreateATA(connection:any,mint:PublicKey,owner:PublicKey){
    let payer = Keypair.fromSecretKey(new Uint8Array(secret));
    let ATA = await findAssociatedTokenAddress(owner,mint)
    try{
     let instruction = await Token.createAssociatedTokenAccountInstruction(ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, mint, ATA, owner, payer.publicKey)
       let x2 = await sendAndConfirmTransaction(
           connection,
           new Transaction().add(instruction),
            [payer],
       );
       console.log("mint in ATA ", x2)
    }
    catch(error){}
       return ATA
}

export async function mintTo(connection:any,mint:PublicKey,owner:PublicKey,amount:number){
  let payer = Keypair.fromSecretKey(new Uint8Array(secret));
  let ATA = await findAssociatedTokenAddress(owner,mint)

   let instruction = await Token.createMintToInstruction(TOKEN_PROGRAM_ID, mint, ATA, payer.publicKey,[],amount)
     let x2 = await sendAndConfirmTransaction(
         connection,
         new Transaction().add(instruction),
          [payer],
     );
     console.log("create ATA ", x2)
     return ATA
}

export async function approve(connection:any,ATA:PublicKey,delegate:PublicKey,amount:number){
  let payer = Keypair.fromSecretKey(new Uint8Array(secret));

   let instruction = await Token.createApproveInstruction(TOKEN_PROGRAM_ID,ATA,delegate,payer.publicKey,[],amount)
     let x2 = await sendAndConfirmTransaction(
         connection,
         new Transaction().add(instruction),
          [payer],
     );
     console.log("create ATA ", x2)
     return ATA
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


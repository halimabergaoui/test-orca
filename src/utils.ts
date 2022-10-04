import { ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Account, Keypair, PublicKey, sendAndConfirmTransaction, Transaction } from "@solana/web3.js";
import secret from "../wallet.json";
import { payer } from "./payer";

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
     //  console.log("create ATA ", x2)
    }
    catch(error){}
       return ATA
}

export async function mintTo(connection:any,mint:PublicKey,owner:PublicKey,amount:number,vault:PublicKey){
  //let payer = Keypair.fromSecretKey(new Uint8Array(secret));
  let payer1= new Account([205,62,53,122,36,145,91,159,243,52,151,211,241,72,208,149,27,191,111,144,94,242,0,112,88,217,3,220,231,156,213,208,247,56,95,29,120,8,135,163,36,1,4,39,147,18,117,17,88,15,96,52,110,67,49,166,147,0,103,101,28,54,54,50])
  let ATA = await findAssociatedTokenAddress(owner,mint)
  if(vault) ATA =vault

  console.log("ATA??? ",ATA.toBase58())
   let instruction = await Token.createMintToInstruction(TOKEN_PROGRAM_ID, mint, ATA, payer1.publicKey,[],amount)
     let x2 = await sendAndConfirmTransaction(
         connection,
         new Transaction().add(instruction),
          [payer1],
     );
     console.log("mint to ATA ", x2)
     return ATA
}

export async function approve(connection:any,ATA:PublicKey,delegate:PublicKey,amount:number){
  //let payer = Keypair.fromSecretKey(new Uint8Array(secret));

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


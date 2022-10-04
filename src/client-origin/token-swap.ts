/**
 * @flow
 */

 import assert from 'assert';
 import BN from 'bn.js';
 import {Buffer} from 'buffer';
  //@ts-ignore
 import * as BufferLayout from 'buffer-layout';
 import type {Connection, TransactionSignature} from '@solana/web3.js';
 import {
   Account,
   PublicKey,
   SystemProgram,
   Transaction,
   TransactionInstruction,
 } from '@solana/web3.js';
 
 import * as Layout from './layout';
 import {sendAndConfirmTransaction} from './util/send-and-confirm-transaction';
 import {loadAccount} from './account';
 
 export const TOKEN_SWAP_PROGRAM_ID: PublicKey = new PublicKey(
   'SwaPpA9LAaLfeLi3a68M4DjnLqgtticKg6CnyNwgAC8',
 );
 
 /**
  * Some amount of tokens
  */
  export class Numberu64 extends BN {
    /**
     * Convert to Buffer representation
     */
    toBuffer(): Buffer {
      const a = super.toArray().reverse();
      const b = Buffer.from(a);
      if (b.length === 8) {
        return b;
      }
      assert(b.length < 8, 'Numberu64 too large');
  
      const zeroPad = Buffer.alloc(8);
      b.copy(zeroPad);
      return zeroPad;
    }
  
    /**
     * Construct a Numberu64 from Buffer representation
     */
    static fromBuffer(buffer: any): Numberu64 {
      assert(buffer.length === 8, `Invalid buffer length: ${buffer.length}`);
      return new Numberu64(
        //@ts-ignore
        [...buffer]
          .reverse()
          .map(i => `00${i.toString(16)}`.slice(-2))
          .join(''),
        16,
      );
    }
  }
  
 
 /**
  * @private
  */
 export const TokenSwapLayout: typeof BufferLayout.Structure = BufferLayout.struct(
   [
     BufferLayout.u8('version'),
     BufferLayout.u8('isInitialized'),
     BufferLayout.u8('nonce'),
     Layout.publicKey('tokenProgramId'),
     Layout.publicKey('tokenAccountA'),
     Layout.publicKey('tokenAccountB'),
     Layout.publicKey('tokenPool'),
     Layout.publicKey('mintA'),
     Layout.publicKey('mintB'),
     Layout.publicKey('feeAccount'),
     Layout.uint64('tradeFeeNumerator'),
     Layout.uint64('tradeFeeDenominator'),
     Layout.uint64('ownerTradeFeeNumerator'),
     Layout.uint64('ownerTradeFeeDenominator'),
     Layout.uint64('ownerWithdrawFeeNumerator'),
     Layout.uint64('ownerWithdrawFeeDenominator'),
     Layout.uint64('hostFeeNumerator'),
     Layout.uint64('hostFeeDenominator'),
     BufferLayout.u8('curveType'),
     BufferLayout.blob(32, 'curveParameters'),
   ],
 );
 
 export const CurveType = Object.freeze({
   ConstantProduct: 0, // Constant product curve, Uniswap-style
   ConstantPrice: 1, // Constant price curve, always X amount of A token for 1 B token, where X is defined at init
   Offset: 3, // Offset curve, like Uniswap, but with an additional offset on the token B side
 });
 
 /**
  * A program to exchange tokens against a pool of liquidity
  */
  
 export class TokenSwap {
   /**
    * @private
    */
   //@ts-ignore
   connection: Connection;
 
   /**
    * Program Identifier for the Swap program
    */
    //@ts-ignore
   swapProgramId: PublicKey;
 
   /**
    * Program Identifier for the Token program
    */
    //@ts-ignore
   tokenProgramId: PublicKey;
 
   /**
    * The public key identifying this swap program
    */
    //@ts-ignore
   tokenSwap: PublicKey;
 
   /**
    * The public key for the liquidity pool token mint
    */
    //@ts-ignore
   poolToken: PublicKey;
 
   /**
    * The public key for the fee account receiving trade and/or withdrawal fees
    */
    //@ts-ignore
   feeAccount: PublicKey;
 
   /**
    * Authority
    */
    //@ts-ignore
   authority: PublicKey;
 
   /**
    * The public key for the first token account of the trading pair
    */
    //@ts-ignore
   tokenAccountA: PublicKey;
 
   /**
    * The public key for the second token account of the trading pair
    */
    //@ts-ignore
   tokenAccountB: PublicKey;
 
   /**
    * The public key for the mint of the first token account of the trading pair
    */
    //@ts-ignore
   mintA: PublicKey;
 
   /**
    * The public key for the mint of the second token account of the trading pair
    */
    //@ts-ignore
   mintB: PublicKey;
 
   /**
    * Trading fee numerator
    */
    //@ts-ignore
   tradeFeeNumerator: Numberu64;
 
   /**
    * Trading fee denominator
    */
    //@ts-ignore
   tradeFeeDenominator: Numberu64;
 
   /**
    * Owner trading fee numerator
    */
    //@ts-ignore
   ownerTradeFeeNumerator: Numberu64;
 
   /**
    * Owner trading fee denominator
    */
    //@ts-ignore
   ownerTradeFeeDenominator: Numberu64;
 
   /**
    * Owner withdraw fee numerator
    */
    //@ts-ignore
   ownerWithdrawFeeNumerator: Numberu64;
 
   /**
    * Owner withdraw fee denominator
    */
    //@ts-ignore
   ownerWithdrawFeeDenominator: Numberu64;
 
   /**
    * Host trading fee numerator
    */
    //@ts-ignore
   hostFeeNumerator: Numberu64;
 
   /**
    * Host trading fee denominator
    */
    //@ts-ignore
   hostFeeDenominator: Numberu64;
 
   /**
    * CurveType, current options are:
    */
    //@ts-ignore
   curveType: number;
 
   /**
    * Fee payer
    */
    //@ts-ignore
   payer: Account;
 
   /**
    * Create a Token object attached to the specific token
    *
    * @param connection The connection to use
    * @param tokenSwap The token swap account
    * @param swapProgramId The program ID of the token-swap program
    * @param tokenProgramId The program ID of the token program
    * @param poolToken The pool token
    * @param authority The authority over the swap and accounts
    * @param tokenAccountA: The token swap's Token A account
    * @param tokenAccountB: The token swap's Token B account
    * @param payer Pays for the transaction
    */
   constructor(
     connection: Connection,
     tokenSwap: PublicKey,
     swapProgramId: PublicKey,
     tokenProgramId: PublicKey,
     poolToken: PublicKey,
     feeAccount: PublicKey,
     authority: PublicKey,
     tokenAccountA: PublicKey,
     tokenAccountB: PublicKey,
     mintA: PublicKey,
     mintB: PublicKey,
     tradeFeeNumerator: Numberu64,
     tradeFeeDenominator: Numberu64,
     ownerTradeFeeNumerator: Numberu64,
     ownerTradeFeeDenominator: Numberu64,
     ownerWithdrawFeeNumerator: Numberu64,
     ownerWithdrawFeeDenominator: Numberu64,
     hostFeeNumerator: Numberu64,
     hostFeeDenominator: Numberu64,
     curveType: number,
     payer: Account,
   ) {
     Object.assign(this, {
       connection,
       tokenSwap,
       swapProgramId,
       tokenProgramId,
       poolToken,
       feeAccount,
       authority,
       tokenAccountA,
       tokenAccountB,
       mintA,
       mintB,
       tradeFeeNumerator,
       tradeFeeDenominator,
       ownerTradeFeeNumerator,
       ownerTradeFeeDenominator,
       ownerWithdrawFeeNumerator,
       ownerWithdrawFeeDenominator,
       hostFeeNumerator,
       hostFeeDenominator,
       curveType,
       payer,
     });
   }
 
   /**
    * Get the minimum balance for the token swap account to be rent exempt
    *
    * @return Number of lamports required
    */
   static async getMinBalanceRentForExemptTokenSwap(
     connection: Connection,
   ): Promise<number> {
     return await connection.getMinimumBalanceForRentExemption(
       TokenSwapLayout.span,
     );
   }
 
   static createInitSwapInstruction(
     tokenSwapAccount: Account,
     authority: PublicKey,
     tokenAccountA: PublicKey,
     tokenAccountB: PublicKey,
     tokenPool: PublicKey,
     feeAccount: PublicKey,
     tokenAccountPool: PublicKey,
     tokenProgramId: PublicKey,
     swapProgramId: PublicKey,
     nonce: number,
     tradeFeeNumerator: number,
     tradeFeeDenominator: number,
     ownerTradeFeeNumerator: number,
     ownerTradeFeeDenominator: number,
     ownerWithdrawFeeNumerator: number,
     ownerWithdrawFeeDenominator: number,
     hostFeeNumerator: number,
     hostFeeDenominator: number,
     curveType: number,
     connection: Connection
   ): TransactionInstruction {
     const keys = [
       {pubkey: tokenSwapAccount.publicKey, isSigner: false, isWritable: true},
       {pubkey: authority, isSigner: false, isWritable: false},
       {pubkey: tokenAccountA, isSigner: false, isWritable: false},
       {pubkey: tokenAccountB, isSigner: false, isWritable: false},
       {pubkey: tokenPool, isSigner: false, isWritable: true},
       {pubkey: feeAccount, isSigner: false, isWritable: false},
       {pubkey: tokenAccountPool, isSigner: false, isWritable: true},
       {pubkey: tokenProgramId, isSigner: false, isWritable: false},
     ];
 
 /*console.log(" calling init swap");
     connection.getAccountInfo(tokenPool, 'confirmed')
     .then(
       info => {
         if ((info)  && (info.owner)) {
           const data = Buffer.from(info.data);
           const accountInfo = MintLayout.decode(data);
           if (accountInfo.mintAuthority) {
             console.log( " token pool => " + new PublicKey(accountInfo.mintAuthority).toBase58());
           }
         }
       }
     ).catch(a => {})
 
     var self = this;
     keys.forEach((element,i) => {
       connection.getAccountInfo(element.pubkey, 'confirmed')
       .then(
         info => {
           if ((info)  && (info.owner)) {
             const data = Buffer.from(info.data);
             const accountInfo = AccountLayout.decode(data);
             if (accountInfo.owner) {
               console.log( i + " => " + new PublicKey(accountInfo.owner).toBase58());
             }
           }
         }
       ).catch(a => {})
       
     });*/
     const commandDataLayout = BufferLayout.struct([
       BufferLayout.u8('instruction'),
       BufferLayout.u8('nonce'),
       BufferLayout.nu64('tradeFeeNumerator'),
       BufferLayout.nu64('tradeFeeDenominator'),
       BufferLayout.nu64('ownerTradeFeeNumerator'),
       BufferLayout.nu64('ownerTradeFeeDenominator'),
       BufferLayout.nu64('ownerWithdrawFeeNumerator'),
       BufferLayout.nu64('ownerWithdrawFeeDenominator'),
       BufferLayout.nu64('hostFeeNumerator'),
       BufferLayout.nu64('hostFeeDenominator'),
       BufferLayout.u8('curveType'),
       BufferLayout.blob(32, 'curveParameters'),
     ]);
     let data = Buffer.alloc(1024);
     {
       const encodeLength = commandDataLayout.encode(
         {
           instruction: 0, // InitializeSwap instruction
           nonce,
           tradeFeeNumerator,
           tradeFeeDenominator,
           ownerTradeFeeNumerator,
           ownerTradeFeeDenominator,
           ownerWithdrawFeeNumerator,
           ownerWithdrawFeeDenominator,
           hostFeeNumerator,
           hostFeeDenominator,
           curveType,
         },
         data,
       );
       data = data.slice(0, encodeLength);
     }
     return new TransactionInstruction({
       keys,
       programId: swapProgramId,
       data,
     });
   }
 
   static async loadTokenSwap(
     connection: Connection,
     address: PublicKey,
     programId: PublicKey,
     payer: Account,
   ): Promise<TokenSwap> {
     const data = await loadAccount(connection, address, programId);
     const tokenSwapData = TokenSwapLayout.decode(data);
     if (!tokenSwapData.isInitialized) {
       throw new Error(`Invalid token swap state`);
     }
 
     const [authority] = await PublicKey.findProgramAddress(
       [address.toBuffer()],
       programId,
     );
 
     const poolToken = new PublicKey(tokenSwapData.tokenPool);
     const feeAccount = new PublicKey(tokenSwapData.feeAccount);
     const tokenAccountA = new PublicKey(tokenSwapData.tokenAccountA);
     const tokenAccountB = new PublicKey(tokenSwapData.tokenAccountB);
     const mintA = new PublicKey(tokenSwapData.mintA);
     const mintB = new PublicKey(tokenSwapData.mintB);
     const tokenProgramId = new PublicKey(tokenSwapData.tokenProgramId);
 
     const tradeFeeNumerator = Numberu64.fromBuffer(
       tokenSwapData.tradeFeeNumerator,
     );
     const tradeFeeDenominator = Numberu64.fromBuffer(
       tokenSwapData.tradeFeeDenominator,
     );
     const ownerTradeFeeNumerator = Numberu64.fromBuffer(
       tokenSwapData.ownerTradeFeeNumerator,
     );
     const ownerTradeFeeDenominator = Numberu64.fromBuffer(
       tokenSwapData.ownerTradeFeeDenominator,
     );
     const ownerWithdrawFeeNumerator = Numberu64.fromBuffer(
       tokenSwapData.ownerWithdrawFeeNumerator,
     );
     const ownerWithdrawFeeDenominator = Numberu64.fromBuffer(
       tokenSwapData.ownerWithdrawFeeDenominator,
     );
     const hostFeeNumerator = Numberu64.fromBuffer(
       tokenSwapData.hostFeeNumerator,
     );
     const hostFeeDenominator = Numberu64.fromBuffer(
       tokenSwapData.hostFeeDenominator,
     );
     const curveType = tokenSwapData.curveType;
 
     return new TokenSwap(
       connection,
       address,
       programId,
       tokenProgramId,
       poolToken,
       feeAccount,
       authority,
       tokenAccountA,
       tokenAccountB,
       mintA,
       mintB,
       tradeFeeNumerator,
       tradeFeeDenominator,
       ownerTradeFeeNumerator,
       ownerTradeFeeDenominator,
       ownerWithdrawFeeNumerator,
       ownerWithdrawFeeDenominator,
       hostFeeNumerator,
       hostFeeDenominator,
       curveType,
       payer,
     );
   }
 
   /**
    * Create a new Token Swap
    *
    * @param connection The connection to use
    * @param payer Pays for the transaction
    * @param tokenSwapAccount The token swap account
    * @param authority The authority over the swap and accounts
    * @param nonce The nonce used to generate the authority
    * @param tokenAccountA: The token swap's Token A account
    * @param tokenAccountB: The token swap's Token B account
    * @param poolToken The pool token
    * @param tokenAccountPool The token swap's pool token account
    * @param tokenProgramId The program ID of the token program
    * @param swapProgramId The program ID of the token-swap program
    * @param feeNumerator Numerator of the fee ratio
    * @param feeDenominator Denominator of the fee ratio
    * @return Token object for the newly minted token, Public key of the account holding the total supply of new tokens
    */
   static async createTokenSwap(
     connection: Connection,
     payer: Account,
     tokenSwapAccount: Account,
     authority: PublicKey,
     tokenAccountA: PublicKey,
     tokenAccountB: PublicKey,
     poolToken: PublicKey,
     mintA: PublicKey,
     mintB: PublicKey,
     feeAccount: PublicKey,
     tokenAccountPool: PublicKey,
     swapProgramId: PublicKey,
     tokenProgramId: PublicKey,
     nonce: number,
     tradeFeeNumerator: number,
     tradeFeeDenominator: number,
     ownerTradeFeeNumerator: number,
     ownerTradeFeeDenominator: number,
     ownerWithdrawFeeNumerator: number,
     ownerWithdrawFeeDenominator: number,
     hostFeeNumerator: number,
     hostFeeDenominator: number,
     curveType: number,
   ): Promise<TokenSwap> {
     let transaction;
     const tokenSwap = new TokenSwap(
       connection,
       tokenSwapAccount.publicKey,
       swapProgramId,
       tokenProgramId,
       poolToken,
       feeAccount,
       authority,
       tokenAccountA,
       tokenAccountB,
       mintA,
       mintB,
       new Numberu64(tradeFeeNumerator),
       new Numberu64(tradeFeeDenominator),
       new Numberu64(ownerTradeFeeNumerator),
       new Numberu64(ownerTradeFeeDenominator),
       new Numberu64(ownerWithdrawFeeNumerator),
       new Numberu64(ownerWithdrawFeeDenominator),
       new Numberu64(hostFeeNumerator),
       new Numberu64(hostFeeDenominator),
       curveType,
       payer,
     );
 
     // Allocate memory for the account
     const balanceNeeded = await TokenSwap.getMinBalanceRentForExemptTokenSwap(
       connection,
     );
     transaction = new Transaction();
     transaction.add(
       SystemProgram.createAccount({
         fromPubkey: payer.publicKey,
         newAccountPubkey: tokenSwapAccount.publicKey,
         lamports: balanceNeeded,
         space: TokenSwapLayout.span,
         programId: swapProgramId,
       }),
     );
 
     const instruction = TokenSwap.createInitSwapInstruction(
       tokenSwapAccount,
       authority,
       tokenAccountA,
       tokenAccountB,
       poolToken,
       feeAccount,
       tokenAccountPool,
       tokenProgramId,
       swapProgramId,
       nonce,
       tradeFeeNumerator,
       tradeFeeDenominator,
       ownerTradeFeeNumerator,
       ownerTradeFeeDenominator,
       ownerWithdrawFeeNumerator,
       ownerWithdrawFeeDenominator,
       hostFeeNumerator,
       hostFeeDenominator,
       curveType,
       connection
     );
 
  transaction.add(instruction);
     await sendAndConfirmTransaction(
       'createAccount and InitializeSwap',
       connection,
       transaction,
       payer,
       tokenSwapAccount,
     );
 
     return tokenSwap;
   }
 
   /**
    * Swap token A for token B
    *
    * @param userSource User's source token account
    * @param poolSource Pool's source token account
    * @param poolDestination Pool's destination token account
    * @param userDestination User's destination token account
    * @param hostFeeAccount Host account to gather fees
    * @param userTransferAuthority Account delegated to transfer user's tokens
    * @param amountIn Amount to transfer from source account
    * @param minimumAmountOut Minimum amount of tokens the user will receive
    */
   async swap(
     userSource: PublicKey,
     poolSource: PublicKey,
     poolDestination: PublicKey,
     userDestination: PublicKey,
     hostFeeAccount: PublicKey,
     userTransferAuthority: Account,
     amountIn: number | Numberu64,
     minimumAmountOut: number | Numberu64,
     connection:Connection,
     selectedWallet:any
   ): Promise<any> {

    const transaction = new Transaction();
    transaction.add(
      TokenSwap.swapInstruction(
        this.tokenSwap,
        this.authority,
        userTransferAuthority.publicKey,
        userSource,
        poolSource,
        poolDestination,
        userDestination,
        this.poolToken,
        this.feeAccount,
        hostFeeAccount,
        this.swapProgramId,
        this.tokenProgramId,
        amountIn,
        minimumAmountOut,
      ),
    )
    transaction.recentBlockhash = (
      await connection.getRecentBlockhash()
    ).blockhash;
    transaction.feePayer = selectedWallet.publicKey;

    console.log(transaction);
   
   
    transaction.partialSign(userTransferAuthority);
 
    let signed=await selectedWallet.signTransaction(transaction);
   
    
  
    let signature = await connection.sendRawTransaction(signed.serialize());

    let res=await connection.confirmTransaction(signature, 'max');
    return res;
     /*return await sendAndConfirmTransaction(
       'swap',
       this.connection,
       new Transaction().add(
         TokenSwap.swapInstruction(
           this.tokenSwap,
           this.authority,
           userTransferAuthority.publicKey,
           userSource,
           poolSource,
           poolDestination,
           userDestination,
           this.poolToken,
           this.feeAccount,
           hostFeeAccount,
           this.swapProgramId,
           this.tokenProgramId,
           amountIn,
           minimumAmountOut,
         ),
       ),
       this.payer,
       userTransferAuthority,
     );*/
   }
 
   static swapInstruction(
     tokenSwap: PublicKey,
     authority: PublicKey,
     userTransferAuthority: PublicKey,
     userSource: PublicKey,
     poolSource: PublicKey,
     poolDestination: PublicKey,
     userDestination: PublicKey,
     poolMint: PublicKey,
     feeAccount: PublicKey,
     hostFeeAccount: PublicKey,
     swapProgramId: PublicKey,
     tokenProgramId: PublicKey,
     amountIn: number | Numberu64,
     minimumAmountOut: number | Numberu64,
   ): TransactionInstruction {
     const dataLayout = BufferLayout.struct([
       BufferLayout.u8('instruction'),
       Layout.uint64('amountIn'),
       Layout.uint64('minimumAmountOut'),
     ]);
 
     const data = Buffer.alloc(dataLayout.span);
     dataLayout.encode(
       {
         instruction: 1, // Swap instruction
         amountIn: new Numberu64(amountIn).toBuffer(),
         minimumAmountOut: new Numberu64(minimumAmountOut).toBuffer(),
       },
       data,
     );
 
     const keys = [
       {pubkey: tokenSwap, isSigner: false, isWritable: false},
       {pubkey: authority, isSigner: false, isWritable: false},
       {pubkey: userTransferAuthority, isSigner: true, isWritable: false},
       {pubkey: userSource, isSigner: false, isWritable: true},
       {pubkey: poolSource, isSigner: false, isWritable: true},
       {pubkey: poolDestination, isSigner: false, isWritable: true},
       {pubkey: userDestination, isSigner: false, isWritable: true},
       {pubkey: poolMint, isSigner: false, isWritable: true},
       {pubkey: feeAccount, isSigner: false, isWritable: true},
       {pubkey: tokenProgramId, isSigner: false, isWritable: false},
     ];
     if (hostFeeAccount != null) {
       keys.push({pubkey: hostFeeAccount, isSigner: false, isWritable: true});
     }
     return new TransactionInstruction({
       keys,
       programId: swapProgramId,
       data,
     });
   }
 
   /**
    * Deposit tokens into the pool
    * @param userAccountA User account for token A
    * @param userAccountB User account for token B
    * @param poolAccount User account for pool token
    * @param userTransferAuthority Account delegated to transfer user's tokens
    * @param poolTokenAmount Amount of pool tokens to mint
    * @param maximumTokenA The maximum amount of token A to deposit
    * @param maximumTokenB The maximum amount of token B to deposit
    */
   async depositAllTokenTypes(
     userAccountA: PublicKey,
     userAccountB: PublicKey,
     poolAccount: PublicKey,
     userTransferAuthority: Account,
     poolTokenAmount: number | Numberu64,
     maximumTokenA: number | Numberu64,
     maximumTokenB: number | Numberu64,
   ): Promise<TransactionSignature> {
     return await sendAndConfirmTransaction(
       'depositAllTokenTypes',
       this.connection,
       new Transaction().add(
         TokenSwap.depositAllTokenTypesInstruction(
           this.tokenSwap,
           this.authority,
           userTransferAuthority.publicKey,
           userAccountA,
           userAccountB,
           this.tokenAccountA,
           this.tokenAccountB,
           this.poolToken,
           poolAccount,
           this.swapProgramId,
           this.tokenProgramId,
           poolTokenAmount,
           maximumTokenA,
           maximumTokenB,
         ),
       ),
       this.payer,
       userTransferAuthority,
     );
   }
 
   static depositAllTokenTypesInstruction(
     tokenSwap: PublicKey,
     authority: PublicKey,
     userTransferAuthority: PublicKey,
     sourceA: PublicKey,
     sourceB: PublicKey,
     intoA: PublicKey,
     intoB: PublicKey,
     poolToken: PublicKey,
     poolAccount: PublicKey,
     swapProgramId: PublicKey,
     tokenProgramId: PublicKey,
     poolTokenAmount: number | Numberu64,
     maximumTokenA: number | Numberu64,
     maximumTokenB: number | Numberu64,
   ): TransactionInstruction {
     const dataLayout = BufferLayout.struct([
       BufferLayout.u8('instruction'),
       Layout.uint64('poolTokenAmount'),
       Layout.uint64('maximumTokenA'),
       Layout.uint64('maximumTokenB'),
     ]);
 
     const data = Buffer.alloc(dataLayout.span);
     dataLayout.encode(
       {
         instruction: 2, // Deposit instruction
         poolTokenAmount: new Numberu64(poolTokenAmount).toBuffer(),
         maximumTokenA: new Numberu64(maximumTokenA).toBuffer(),
         maximumTokenB: new Numberu64(maximumTokenB).toBuffer(),
       },
       data,
     );
 
     const keys = [
       {pubkey: tokenSwap, isSigner: false, isWritable: false},
       {pubkey: authority, isSigner: false, isWritable: false},
       {pubkey: userTransferAuthority, isSigner: true, isWritable: false},
       {pubkey: sourceA, isSigner: false, isWritable: true},
       {pubkey: sourceB, isSigner: false, isWritable: true},
       {pubkey: intoA, isSigner: false, isWritable: true},
       {pubkey: intoB, isSigner: false, isWritable: true},
       {pubkey: poolToken, isSigner: false, isWritable: true},
       {pubkey: poolAccount, isSigner: false, isWritable: true},
       {pubkey: tokenProgramId, isSigner: false, isWritable: false},
     ];
     return new TransactionInstruction({
       keys,
       programId: swapProgramId,
       data,
     });
   }
 
   /**
    * Withdraw tokens from the pool
    *
    * @param userAccountA User account for token A
    * @param userAccountB User account for token B
    * @param poolAccount User account for pool token
    * @param userTransferAuthority Account delegated to transfer user's tokens
    * @param poolTokenAmount Amount of pool tokens to burn
    * @param minimumTokenA The minimum amount of token A to withdraw
    * @param minimumTokenB The minimum amount of token B to withdraw
    */
   async withdrawAllTokenTypes(
     userAccountA: PublicKey,
     userAccountB: PublicKey,
     poolAccount: PublicKey,
     userTransferAuthority: Account,
     poolTokenAmount: number | Numberu64,
     minimumTokenA: number | Numberu64,
     minimumTokenB: number | Numberu64,
   ): Promise<TransactionSignature> {
     return await sendAndConfirmTransaction(
       'withdraw',
       this.connection,
       new Transaction().add(
         TokenSwap.withdrawAllTokenTypesInstruction(
           this.tokenSwap,
           this.authority,
           userTransferAuthority.publicKey,
           this.poolToken,
           this.feeAccount,
           poolAccount,
           this.tokenAccountA,
           this.tokenAccountB,
           userAccountA,
           userAccountB,
           this.swapProgramId,
           this.tokenProgramId,
           poolTokenAmount,
           minimumTokenA,
           minimumTokenB,
         ),
       ),
       this.payer,
       userTransferAuthority,
     );
   }
 
   static withdrawAllTokenTypesInstruction(
     tokenSwap: PublicKey,
     authority: PublicKey,
     userTransferAuthority: PublicKey,
     poolMint: PublicKey,
     feeAccount: PublicKey,
     sourcePoolAccount: PublicKey,
     fromA: PublicKey,
     fromB: PublicKey,
     userAccountA: PublicKey,
     userAccountB: PublicKey,
     swapProgramId: PublicKey,
     tokenProgramId: PublicKey,
     poolTokenAmount: number | Numberu64,
     minimumTokenA: number | Numberu64,
     minimumTokenB: number | Numberu64,
   ): TransactionInstruction {
     const dataLayout = BufferLayout.struct([
       BufferLayout.u8('instruction'),
       Layout.uint64('poolTokenAmount'),
       Layout.uint64('minimumTokenA'),
       Layout.uint64('minimumTokenB'),
     ]);
 
     const data = Buffer.alloc(dataLayout.span);
     dataLayout.encode(
       {
         instruction: 3, // Withdraw instruction
         poolTokenAmount: new Numberu64(poolTokenAmount).toBuffer(),
         minimumTokenA: new Numberu64(minimumTokenA).toBuffer(),
         minimumTokenB: new Numberu64(minimumTokenB).toBuffer(),
       },
       data,
     );
 
     const keys = [
       {pubkey: tokenSwap, isSigner: false, isWritable: false},
       {pubkey: authority, isSigner: false, isWritable: false},
       {pubkey: userTransferAuthority, isSigner: true, isWritable: false},
       {pubkey: poolMint, isSigner: false, isWritable: true},
       {pubkey: sourcePoolAccount, isSigner: false, isWritable: true},
       {pubkey: fromA, isSigner: false, isWritable: true},
       {pubkey: fromB, isSigner: false, isWritable: true},
       {pubkey: userAccountA, isSigner: false, isWritable: true},
       {pubkey: userAccountB, isSigner: false, isWritable: true},
       {pubkey: feeAccount, isSigner: false, isWritable: true},
       {pubkey: tokenProgramId, isSigner: false, isWritable: false},
     ];
     return new TransactionInstruction({
       keys,
       programId: swapProgramId,
       data,
     });
   }
 
   /**
    * Deposit one side of tokens into the pool
    * @param userAccount User account to deposit token A or B
    * @param poolAccount User account to receive pool tokens
    * @param userTransferAuthority Account delegated to transfer user's tokens
    * @param sourceTokenAmount The amount of token A or B to deposit
    * @param minimumPoolTokenAmount Minimum amount of pool tokens to mint
    */
   async depositSingleTokenTypeExactAmountIn(
     userAccount: PublicKey,
     poolAccount: PublicKey,
     userTransferAuthority: Account,
     sourceTokenAmount: number | Numberu64,
     minimumPoolTokenAmount: number | Numberu64,
   ): Promise<TransactionSignature> {
     return await sendAndConfirmTransaction(
       'depositSingleTokenTypeExactAmountIn',
       this.connection,
       new Transaction().add(
         TokenSwap.depositSingleTokenTypeExactAmountInInstruction(
           this.tokenSwap,
           this.authority,
           userTransferAuthority.publicKey,
           userAccount,
           this.tokenAccountA,
           this.tokenAccountB,
           this.poolToken,
           poolAccount,
           this.swapProgramId,
           this.tokenProgramId,
           sourceTokenAmount,
           minimumPoolTokenAmount,
         ),
       ),
       this.payer,
       userTransferAuthority,
     );
   }
 
   static depositSingleTokenTypeExactAmountInInstruction(
     tokenSwap: PublicKey,
     authority: PublicKey,
     userTransferAuthority: PublicKey,
     source: PublicKey,
     intoA: PublicKey,
     intoB: PublicKey,
     poolToken: PublicKey,
     poolAccount: PublicKey,
     swapProgramId: PublicKey,
     tokenProgramId: PublicKey,
     sourceTokenAmount: number | Numberu64,
     minimumPoolTokenAmount: number | Numberu64,
   ): TransactionInstruction {
     const dataLayout = BufferLayout.struct([
       BufferLayout.u8('instruction'),
       Layout.uint64('sourceTokenAmount'),
       Layout.uint64('minimumPoolTokenAmount'),
     ]);
 
     const data = Buffer.alloc(dataLayout.span);
     dataLayout.encode(
       {
         instruction: 4, // depositSingleTokenTypeExactAmountIn instruction
         sourceTokenAmount: new Numberu64(sourceTokenAmount).toBuffer(),
         minimumPoolTokenAmount: new Numberu64(
           minimumPoolTokenAmount,
         ).toBuffer(),
       },
       data,
     );
 
     const keys = [
       {pubkey: tokenSwap, isSigner: false, isWritable: false},
       {pubkey: authority, isSigner: false, isWritable: false},
       {pubkey: userTransferAuthority, isSigner: true, isWritable: false},
       {pubkey: source, isSigner: false, isWritable: true},
       {pubkey: intoA, isSigner: false, isWritable: true},
       {pubkey: intoB, isSigner: false, isWritable: true},
       {pubkey: poolToken, isSigner: false, isWritable: true},
       {pubkey: poolAccount, isSigner: false, isWritable: true},
       {pubkey: tokenProgramId, isSigner: false, isWritable: false},
     ];
     return new TransactionInstruction({
       keys,
       programId: swapProgramId,
       data,
     });
   }
 
   /**
    * Withdraw tokens from the pool
    *
    * @param userAccount User account to receive token A or B
    * @param poolAccount User account to burn pool token
    * @param userTransferAuthority Account delegated to transfer user's tokens
    * @param destinationTokenAmount The amount of token A or B to withdraw
    * @param maximumPoolTokenAmount Maximum amount of pool tokens to burn
    */
   async withdrawSingleTokenTypeExactAmountOut(
     userAccount: PublicKey,
     poolAccount: PublicKey,
     userTransferAuthority: Account,
     destinationTokenAmount: number | Numberu64,
     maximumPoolTokenAmount: number | Numberu64,
   ): Promise<TransactionSignature> {
     return await sendAndConfirmTransaction(
       'withdrawSingleTokenTypeExactAmountOut',
       this.connection,
       new Transaction().add(
         TokenSwap.withdrawSingleTokenTypeExactAmountOutInstruction(
           this.tokenSwap,
           this.authority,
           userTransferAuthority.publicKey,
           this.poolToken,
           this.feeAccount,
           poolAccount,
           this.tokenAccountA,
           this.tokenAccountB,
           userAccount,
           this.swapProgramId,
           this.tokenProgramId,
           destinationTokenAmount,
           maximumPoolTokenAmount,
         ),
       ),
       this.payer,
       userTransferAuthority,
     );
   }
 
   static withdrawSingleTokenTypeExactAmountOutInstruction(
     tokenSwap: PublicKey,
     authority: PublicKey,
     userTransferAuthority: PublicKey,
     poolMint: PublicKey,
     feeAccount: PublicKey,
     sourcePoolAccount: PublicKey,
     fromA: PublicKey,
     fromB: PublicKey,
     userAccount: PublicKey,
     swapProgramId: PublicKey,
     tokenProgramId: PublicKey,
     destinationTokenAmount: number | Numberu64,
     maximumPoolTokenAmount: number | Numberu64,
   ): TransactionInstruction {
     const dataLayout = BufferLayout.struct([
       BufferLayout.u8('instruction'),
       Layout.uint64('destinationTokenAmount'),
       Layout.uint64('maximumPoolTokenAmount'),
     ]);
 
     const data = Buffer.alloc(dataLayout.span);
     dataLayout.encode(
       {
         instruction: 5, // withdrawSingleTokenTypeExactAmountOut instruction
         destinationTokenAmount: new Numberu64(
           destinationTokenAmount,
         ).toBuffer(),
         maximumPoolTokenAmount: new Numberu64(
           maximumPoolTokenAmount,
         ).toBuffer(),
       },
       data,
     );
 
     const keys = [
       {pubkey: tokenSwap, isSigner: false, isWritable: false},
       {pubkey: authority, isSigner: false, isWritable: false},
       {pubkey: userTransferAuthority, isSigner: true, isWritable: false},
       {pubkey: poolMint, isSigner: false, isWritable: true},
       {pubkey: sourcePoolAccount, isSigner: false, isWritable: true},
       {pubkey: fromA, isSigner: false, isWritable: true},
       {pubkey: fromB, isSigner: false, isWritable: true},
       {pubkey: userAccount, isSigner: false, isWritable: true},
       {pubkey: feeAccount, isSigner: false, isWritable: true},
       {pubkey: tokenProgramId, isSigner: false, isWritable: false},
     ];
     return new TransactionInstruction({
       keys,
       programId: swapProgramId,
       data,
     });
   }
 }
 
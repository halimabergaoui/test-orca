// @flow

import {
  Account,
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import {AccountLayout, TOKEN_PROGRAM_ID} from '@solana/spl-token';

import {
  TokenSwap,
  CurveType,
  TOKEN_SWAP_PROGRAM_ID,
} from '../client/token-swap';
import {sendAndConfirmTransaction} from '../client/util/send-and-confirm-transaction';
import {newAccountWithLamports, newAccountWithLamports1, newAccountWithLamports2, newAccountWithLamportSwap} from '../client/util/new-account-with-lamports';
import {url} from './url';
import {sleep} from '../client/util/sleep';
import { ORIGINE_PROGRAMM_ID } from '../../../pages/WalletUtils';
import { Token } from '../client/token';

// The following globals are created by `createTokenSwap` and used by subsequent tests
// Token swap
let tokenSwap: TokenSwap;
// authority of the token and accounts
let authority: PublicKey;
// nonce used to generate the authority public key
let nonce: number;
// owner of the user accounts
let owner: Account;
// Token pool
let tokenPool: Token;
let tokenAccountPool: PublicKey;
let feeAccount: PublicKey;
// Tokens swapped
let mintA: Token;
let mintB: Token;
let tokenAccountA: PublicKey;
let tokenAccountB: PublicKey;

// Hard-coded fee address, for testing production mode
const SWAP_PROGRAM_OWNER_FEE_ADDRESS =
  process.env.SWAP_PROGRAM_OWNER_FEE_ADDRESS;

// Pool fees
const TRADING_FEE_NUMERATOR = 25;
const TRADING_FEE_DENOMINATOR = 10000;
const OWNER_TRADING_FEE_NUMERATOR = 5;
const OWNER_TRADING_FEE_DENOMINATOR = 10000;
const OWNER_WITHDRAW_FEE_NUMERATOR = SWAP_PROGRAM_OWNER_FEE_ADDRESS ? 0 : 1;
const OWNER_WITHDRAW_FEE_DENOMINATOR = SWAP_PROGRAM_OWNER_FEE_ADDRESS ? 0 : 6;
const HOST_FEE_NUMERATOR = 20;
const HOST_FEE_DENOMINATOR = 100;

// curve type used to calculate swaps and deposits
const CURVE_TYPE = CurveType.ConstantProduct;

// Initial amount in each swap token
let currentSwapTokenA = 1000000;
let currentSwapTokenB = 1000000;
let currentFeeAmount = 0;

// Swap instruction constants
// Because there is no withdraw fee in the production version, these numbers
// need to get slightly tweaked in the two cases.
const SWAP_AMOUNT_IN = 100000;
const SWAP_AMOUNT_OUT = SWAP_PROGRAM_OWNER_FEE_ADDRESS ? 90661 : 90674;
const SWAP_FEE = SWAP_PROGRAM_OWNER_FEE_ADDRESS ? 22273 : 22276;
const HOST_SWAP_FEE = SWAP_PROGRAM_OWNER_FEE_ADDRESS
  ? Math.floor((SWAP_FEE * HOST_FEE_NUMERATOR) / HOST_FEE_DENOMINATOR)
  : 0;
const OWNER_SWAP_FEE = SWAP_FEE - HOST_SWAP_FEE;

// Pool token amount minted on init
const DEFAULT_POOL_TOKEN_AMOUNT = 1000000000;
// Pool token amount to withdraw / deposit
const POOL_TOKEN_AMOUNT = 10000000;

function assert(condition:any, message:any) {
  if (!condition) {
    console.log(Error().stack + ':token-test.js');
    throw message || 'Assertion failed';
  }
}

let connection :any;
async function getConnection(): Promise<Connection> {
  if (connection) return connection;

  connection = new Connection(url, 'recent');
  const version = await connection.getVersion();

  return connection;
}

export async function createTokenSwap(): Promise<void> {
  const connection = await getConnection();
  const payer = await newAccountWithLamports2(connection, 1000000000);
  console.log("payer publicKey -- "+payer.publicKey+" --")
  owner = await newAccountWithLamports1(connection, 1000000000);
  console.log("owner publicKey -- "+owner.publicKey+" --")
 const tokenSwapAccount = new Account([213,92,95,30,183,94,255,53,238,181,251,106,217,117,87,161,161,47,143,10,123,223,81,123,125,80,76,110,25,245,175,147,136,172,139,177,103,223,45,173,84,25,118,238,129,77,48,49,2,224,217,128,49,19,72,244,29,112,18,184,187,37,199,42]);
 //const tokenSwapAccount = new Account(); 
 let infoToken;
/*  [authority, nonce] = await PublicKey.findProgramAddress(
    [tokenSwapAccount.publicKey.toBuffer()],
    TOKEN_SWAP_PROGRAM_ID,
  ); */ 
  console.log( [tokenSwapAccount.publicKey.toBase58()])
  let authority=new PublicKey("9Wcsb1nnvFDHbxm8d66uK5TFvVXuthioygho1PuQVCVG");
  let nonce=253;  
  console.log("authority :- "+authority+" - nonce :- "+ nonce+" -")

  console.log('creating pool mint');
/* tokenPool = await Token.createMint(
    connection,
    payer,
    authority,
    null,
    2,
    TOKEN_PROGRAM_ID,
  );  */ 
   tokenPool=new Token(
    connection,
    new PublicKey("FdhdPJrHH18QK3mG7UVtZkXq25S4LeKXLoQybMJ5HYEk"),
    TOKEN_PROGRAM_ID,
    payer
  ) 
  
  console.log("tokenPool Address - "+tokenPool.publicKey+" -")
  console.log('creating pool account');
 //tokenAccountPool = await tokenPool.createAccount(owner.publicKey);
  tokenAccountPool=new PublicKey("98UipRj47BpLzxQMfsqaovoit2jKCKJvhCxrnRRGH6rt")
  console.log("tokenAccountPool - "+tokenAccountPool)
  console.log("info Account Pool before swap ")
  infoToken=await tokenPool.getAccountInfo(tokenAccountPool);
  console.log("mint - "+infoToken.mint+" - owner - "+infoToken.owner+" - amount - "+infoToken.amount)
  const ownerKey = SWAP_PROGRAM_OWNER_FEE_ADDRESS || owner.publicKey.toString();
 //feeAccount = await tokenPool.createAccount(new PublicKey(ownerKey));
  feeAccount=new PublicKey("9CwSqPJtvyoUBH3vx2eNSQezdySCEYsvvrzbwQyD1s7D")
  console.log("ownerkey - "+ownerKey+" -")
  console.log("feeAccount - "+feeAccount+" -");

  console.log('creating token A');
 /*  mintA = await Token.createMint(
    connection,
    payer,
    owner.publicKey,
    null,
    2,
    TOKEN_PROGRAM_ID,
  );  */ 
  mintA=new Token(
    connection,
    new PublicKey("EdNcp4DP7swu18NMUcmm1bchVyGqkQdseMQ8mnDM95EG"),
    TOKEN_PROGRAM_ID,
    payer
  ) 
  console.log("Address mintA - "+ mintA.publicKey+" -")
  console.log('creating token A account');
  //tokenAccountA = await mintA.createAccount(authority);
  tokenAccountA=new PublicKey("BAB4HMcAJbyeprad49XpjmWt4xZCCgPD9DDsw7xnMdwp");
  console.log("tokenAccountA - "+tokenAccountA+" - authoruty - "+authority)
  console.log('minting token A to swap');
// await mintA.mintTo(tokenAccountA, owner, [], 200000);
  infoToken=await mintA.getAccountInfo(tokenAccountA)
  console.log("info Account Token A before swap ")
  console.log("mint token A - "+infoToken.mint+" - owner Token A- "+infoToken.owner+" - amount token A - "+infoToken.amount)

  console.log('creating token B');
 /* mintB = await Token.createMint(
    connection,
    payer,
    owner.publicKey,
    null,
    2,
    TOKEN_PROGRAM_ID,
  ); */   
  mintB=new Token(
    connection,
    new PublicKey("AQaaCFhV9qqajY9mgnzkgpzdiuRnhnwWDTvrkXCxXmYf"),
    TOKEN_PROGRAM_ID,
    payer
  ) 
  console.log("Address mintB - "+ mintB.publicKey+" -")
  console.log('creating token B account');
  //tokenAccountB = await mintB.createAccount(authority);
 tokenAccountB=new PublicKey("FyQRsSS6S3nEECp5QkN1SAiXeufwudG377agWwpUEB1F")
  console.log("tokenAccountB - "+tokenAccountB+" - authoruty - "+authority)
  console.log('minting token B to swap');
 // await mintB.mintTo(tokenAccountB, owner, [], 200000);
  infoToken=await mintB.getAccountInfo(tokenAccountB)
  console.log("info Account Token B before swap ");
  console.log("mint token b - "+infoToken.mint+" - owner Token b- "+infoToken.owner+" - amount token b - "+infoToken.amount)

  console.log('creating token swap');
  const swapPayer = await newAccountWithLamportSwap(connection, 10000000000);
  console.log("publickey SwapPayer - "+swapPayer.publicKey)
   /* tokenSwap = await TokenSwap.createTokenSwap(
    connection,
    swapPayer,
    tokenSwapAccount,
    authority,
    tokenAccountA,
    tokenAccountB,
    tokenPool.publicKey,
    mintA.publicKey,
    mintB.publicKey,
    feeAccount,
    tokenAccountPool,
    TOKEN_SWAP_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    nonce,
    TRADING_FEE_NUMERATOR,
    TRADING_FEE_DENOMINATOR,
    OWNER_TRADING_FEE_NUMERATOR,
    OWNER_TRADING_FEE_DENOMINATOR,
    OWNER_WITHDRAW_FEE_NUMERATOR,
    OWNER_WITHDRAW_FEE_DENOMINATOR,
    HOST_FEE_NUMERATOR,
    HOST_FEE_DENOMINATOR,
    CURVE_TYPE,
  );  
 console.log("token swap publickey - "+tokenSwap.tokenSwap)
  */ 
  tokenSwap=new TokenSwap(
    connection,
    new PublicKey("ACX3jfdGN598DPRHQfcpC57ECAf22uhmAh3uCRaLWciV"),
    TOKEN_SWAP_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    tokenPool.publicKey,
    feeAccount,
    authority,
    tokenAccountA,
    tokenAccountB,
    mintA.publicKey,
    mintB.publicKey,
    //@ts-ignore
    TRADING_FEE_NUMERATOR,
    TRADING_FEE_DENOMINATOR,
    OWNER_TRADING_FEE_NUMERATOR,
    OWNER_TRADING_FEE_DENOMINATOR,
    OWNER_WITHDRAW_FEE_NUMERATOR,
    OWNER_WITHDRAW_FEE_DENOMINATOR,
    HOST_FEE_NUMERATOR,
    HOST_FEE_DENOMINATOR,
    CURVE_TYPE,
    payer
  )  

  console.log('loading token swap');
  const fetchedTokenSwap = await TokenSwap.loadTokenSwap(
    connection,
    tokenSwapAccount.publicKey,
    TOKEN_SWAP_PROGRAM_ID,
    swapPayer,
  ); 
  console.log("mint token swap -"+fetchedTokenSwap.tokenSwap+ " -owner - "+tokenSwap.authority)
}

export async function depositAllTokenTypes(): Promise<void> {
  console.log("****************depositAllTokenTypes*******************")
  const poolMintInfo = await tokenPool.getMintInfo();
  console.log("pool Mint Info mint authority -- "+poolMintInfo.mintAuthority+" - supply - "+poolMintInfo.supply.toNumber())
  const supply = poolMintInfo.supply.toNumber();
  const swapTokenA = await mintA.getAccountInfo(tokenAccountA);
  console.log("swapTokenA - "+swapTokenA.mint+" - owner Token b- "+swapTokenA.owner+" - amount token b - "+swapTokenA.amount)

  const tokenA = Math.floor(
    (swapTokenA.amount.toNumber() * 20000000) / supply,
  );
  console.log("tokenA - "+tokenA)
  const swapTokenB = await mintB.getAccountInfo(tokenAccountB);
  console.log("swapTokenB - "+swapTokenB.mint+" - owner Token b- "+swapTokenB.owner+" - amount token b - "+swapTokenB.amount)

  const tokenB = Math.floor(
    (swapTokenB.amount.toNumber() * 20000000) / supply,
  );
  console.log("tokenB - "+tokenB)
  let info;
  let allowance;
  const userTransferAuthority = new Account();
  console.log("userTransferAuthority Publickey "+userTransferAuthority.publicKey)
  console.log('Creating depositor token a account');
 const userAccountA = await mintA.createAccount(owner.publicKey);
 console.log("deposit user Account A - "+userAccountA)
  //const userAccountA=new PublicKey("8G5Z4d1YuMG6eXi8EpJoUYRYfUu6J3hErGv7bTWAV5B7")
  await mintA.mintTo(userAccountA, owner, [], tokenA);
  await mintA.approve(
    userAccountA,
    userTransferAuthority.publicKey,
    owner,
    [],
    tokenA,
    connection
  );
   info=await mintA.getAccountInfo(userAccountA);
  allowance=info.delegatedAmount.toNumber()
  console.log(" deposit allowance after approve -"+allowance+" mint a publickey - "+info.mint +" -amount mint A "+info.amount)
  console.log('Creating depositor token b account');
 const userAccountB = await mintB.createAccount(owner.publicKey);
 console.log("userAccountB - "+userAccountB)
 //const userAccountB=new PublicKey("3SPubojcybqfDbr5863DeBDx7PXesUvN8hFq1eSsouic")
  await mintB.mintTo(userAccountB, owner, [], tokenB);
  await mintB.approve(
    userAccountB,
    userTransferAuthority.publicKey,
    owner,
    [],
    tokenB,
    connection
  );
   info=await mintB.getAccountInfo(userAccountB);
  allowance=info.delegatedAmount.toNumber()
  console.log(" deposit allowance after approve  minTB-"+allowance+" mint b publickey - "+info.mint +" -amount mint B "+info.amount)
 
  console.log('Creating depositor pool token account');
  const newAccountPool = await tokenPool.createAccount(owner.publicKey);
  console.log("new accountPool - "+newAccountPool)
  //const newAccountPool=new PublicKey("8bSMBywQJF1SKEuax7Av4mm783Xnnpio1eDKoCe5c2Ec")

  console.log('Depositing into swap');
  await tokenSwap.depositAllTokenTypes(
    userAccountA,
    userAccountB,
    newAccountPool,
    userTransferAuthority,
    POOL_TOKEN_AMOUNT,
    tokenA,
    tokenB,
  );

  
  info = await mintA.getAccountInfo(userAccountA);
  console.log("after deposit allowance   mintA-"+allowance+" mint A publickey - "+info.mint +" -amount mint A "+info.amount)
console.log("***********End Depositttttttttt**************")
/*   assert(info.amount.toNumber() == 0);
  info = await mintB.getAccountInfo(userAccountB);
  assert(info.amount.toNumber() == 0);
  info = await mintA.getAccountInfo(tokenAccountA);
  assert(info.amount.toNumber() == currentSwapTokenA + tokenA); */
  currentSwapTokenA += tokenA;
  /* info = await mintB.getAccountInfo(tokenAccountB);
  assert(info.amount.toNumber() == currentSwapTokenB + tokenB); */
  currentSwapTokenB += tokenB;
  /* info = await tokenPool.getAccountInfo(newAccountPool);
  assert(info.amount.toNumber() == POOL_TOKEN_AMOUNT); */
}

export async function withdrawAllTokenTypes(): Promise<void> {
  console.log("********************WithdrawAllTokenTypes*******************")
  const poolMintInfo = await tokenPool.getMintInfo();
  console.log("pool Mint Info mint authority -- "+poolMintInfo.mintAuthority+" - supply - "+poolMintInfo.supply.toNumber())

  const supply = poolMintInfo.supply.toNumber();
  let swapTokenA = await mintA.getAccountInfo(tokenAccountA);
  console.log("swapTokenA - "+swapTokenA.mint+" - owner Token A- "+swapTokenA.owner+" - amount token A - "+swapTokenA.amount)

  let swapTokenB = await mintB.getAccountInfo(tokenAccountB);
  console.log("swapTokenB - "+swapTokenB.mint+" - owner Token b- "+swapTokenB.owner+" - amount token b - "+swapTokenB.amount)

  let feeAmount = 0;
  if (OWNER_WITHDRAW_FEE_NUMERATOR !== 0) {
    feeAmount = Math.floor(
      (20000000 * OWNER_WITHDRAW_FEE_NUMERATOR) /
        OWNER_WITHDRAW_FEE_DENOMINATOR,
    );
  }
  const poolTokenAmount = 20000000 - feeAmount;
  console.log("pool token amount - "+poolTokenAmount)
  const tokenA = Math.floor(
    (swapTokenA.amount.toNumber() * poolTokenAmount) / supply,
  );
  console.log("tokenA - "+tokenA)
  const tokenB = Math.floor(
    (swapTokenB.amount.toNumber() * poolTokenAmount) / supply,
  );
  console.log("tokenB - "+tokenB)

  console.log('Creating withdraw token A account');
  let userAccountA = await mintA.createAccount(owner.publicKey);
  console.log("userAccountA - "+userAccountA)
  //let userAccountA=new PublicKey("8G5Z4d1YuMG6eXi8EpJoUYRYfUu6J3hErGv7bTWAV5B7")
  console.log('Creating withdraw token B account');
  let userAccountB = await mintB.createAccount(owner.publicKey);
  console.log("userAccountB - "+userAccountB)

  //let userAccountB=new PublicKey("3SPubojcybqfDbr5863DeBDx7PXesUvN8hFq1eSsouic")
  const userTransferAuthority = new Account();
  console.log("userTransferAuthority Publickey "+userTransferAuthority.publicKey)
  let info ;
  console.log('Approving withdrawal from pool account');
  info = await tokenPool.getAccountInfo(tokenAccountPool);
  console.log("info token pool before approve pool-token-amount- "+POOL_TOKEN_AMOUNT+" - mint tokenPool - "+info.mint+" -amount - "+info.amount.toNumber()+" allowance - "+info.delegatedAmount.toNumber())
  await tokenPool.approve(
    tokenAccountPool,
    userTransferAuthority.publicKey,
    owner,
    [],
    20000000,
    connection
  );
  info = await tokenPool.getAccountInfo(tokenAccountPool);
  console.log("info token pool after approve pool-token-amount- "+POOL_TOKEN_AMOUNT+" - mint tokenPool - "+info.mint+" -amount - "+info.amount.toNumber()+" allowance - "+info.delegatedAmount.toNumber())

  console.log('Withdrawing pool tokens for A and B tokens');
  await tokenSwap.withdrawAllTokenTypes(
    userAccountA,
    userAccountB,
    tokenAccountPool,
    userTransferAuthority,
    20000000,
    tokenA,
    tokenB,
  );

  //const poolMintInfo = await tokenPool.getMintInfo();
  swapTokenA = await mintA.getAccountInfo(tokenAccountA);
  console.log("swapTokenA allownace - "+swapTokenA.delegatedAmount+" - amount -"+swapTokenA.amount+" mint - "+swapTokenA.mint)
  swapTokenB = await mintB.getAccountInfo(tokenAccountB);
  console.log("swapTokenB allownace - "+swapTokenB.delegatedAmount+" - amount -"+swapTokenB.amount+" mint - "+swapTokenB.mint)

  info = await tokenPool.getAccountInfo(tokenAccountPool);
  console.log("info allownace - "+info.delegatedAmount+" - amount -"+info.amount+" mint - "+info.mint)

  /* assert(info.amount.toNumber() == DEFAULT_POOL_TOKEN_AMOUNT - POOL_TOKEN_AMOUNT,);
 assert(swapTokenA.amount.toNumber() == currentSwapTokenA - tokenA); */
  currentSwapTokenA -= tokenA;
  //assert(swapTokenB.amount.toNumber() == currentSwapTokenB - tokenB);
  currentSwapTokenB -= tokenB;
  info = await mintA.getAccountInfo(userAccountA);
  //assert(info.amount.toNumber() == tokenA);
  info = await mintB.getAccountInfo(userAccountB);
  //assert(info.amount.toNumber() == tokenB);
  info = await tokenPool.getAccountInfo(feeAccount);
 // assert(info.amount.toNumber() == feeAmount);
  currentFeeAmount = feeAmount;
}

export async function createAccountAndSwapAtomic(): Promise<void> {
  console.log('Creating swap token a account');
  let userAccountA = await mintA.createAccount(owner.publicKey);
  await mintA.mintTo(userAccountA, owner, [], SWAP_AMOUNT_IN);

  // $FlowFixMe[prop-missing]
  const balanceNeeded = await Token.getMinBalanceRentForExemptAccount(
    connection,
  );
  const newAccount = new Account();
  const transaction = new Transaction();
  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: owner.publicKey,
      newAccountPubkey: newAccount.publicKey,
      lamports: balanceNeeded,
      space: AccountLayout.span,
      programId: mintB.programId,
    }),
  );

  transaction.add(
    Token.createInitAccountInstruction(
      mintB.programId,
      mintB.publicKey,
      newAccount.publicKey,
      owner.publicKey,
    ),
  );

  const userTransferAuthority = new Account();
  transaction.add(
    Token.createApproveInstruction(
      mintA.programId,
      userAccountA,
      userTransferAuthority.publicKey,
      owner.publicKey,
      [owner],
      SWAP_AMOUNT_IN,
    ),
  );

  transaction.add(
    TokenSwap.swapInstruction(
      tokenSwap.tokenSwap,
      tokenSwap.authority,
      userTransferAuthority.publicKey,
      userAccountA,
      tokenSwap.tokenAccountA,
      tokenSwap.tokenAccountB,
      newAccount.publicKey,
      tokenSwap.poolToken,
      tokenSwap.feeAccount,
      //@ts-ignore
      null,
      tokenSwap.swapProgramId,
      tokenSwap.tokenProgramId,
      SWAP_AMOUNT_IN,
      0,
    ),
  );

  // Send the instructions
  console.log('sending big instruction');
  await sendAndConfirmTransaction(
    'create account, approve transfer, swap',
    connection,
    transaction,
    owner,
    newAccount,
    userTransferAuthority,
  );

  let info;
  info = await mintA.getAccountInfo(tokenAccountA);
  currentSwapTokenA = info.amount.toNumber();
  info = await mintB.getAccountInfo(tokenAccountB);
  currentSwapTokenB = info.amount.toNumber();
}

export async function swap(connection:any,selectedWallet:any): Promise<void> {
  let info;
  let owner = selectedWallet
  let payer = selectedWallet
  let userAccountA=new PublicKey("Akb9aRfX3ePNvPBsk7VvsoKHwowVgFvqTnHoeD6VZjqn")
  //let userAccountA = new PublicKey("9zmWBzWmcZqHZu7WN8PjX9UQRk1V58sTLooSrWfpQQRe")
  let mintA = new Token(
    connection,
    new PublicKey("3YzpJsxmE8dBoUyKzPWNgeLQS8W4Q1xVYjjcE6xDXU8A"),
    new PublicKey(ORIGINE_PROGRAMM_ID),
    payer
  )

  const userTransferAuthority = new Account();
  await mintA.approve(
    userAccountA,
    userTransferAuthority.publicKey,
    owner,
    [],
    1000,
    connection
  );

  let mintB = new Token(
    connection,
    new PublicKey("8Y2uqJjk9D9KaqFo7exFR1XQDU2bkxkHbNX3y9M8iTHS"),
    new PublicKey(ORIGINE_PROGRAMM_ID),
    selectedWallet
  )
  let userAccountB = new PublicKey("3SPubojcybqfDbr5863DeBDx7PXesUvN8hFq1eSsouic")

  let tokenPool = new Token(
    connection,
    new PublicKey("HQqAoeRLWcy8DEwHM8vDGfi9cjLeRdg2dpe4czVvrUWM"),
    new PublicKey(ORIGINE_PROGRAMM_ID),
    selectedWallet
  )

  let poolAccount = "98UipRj47BpLzxQMfsqaovoit2jKCKJvhCxrnRRGH6rt"

  tokenAccountA = new PublicKey("9CiHkRaoLtr1QrxMx6P1ukeKEHKtYihJJeEWEuiNCEtQ");
  tokenAccountB = new PublicKey("5GCWYqzWCNcCnaH8eLCdKK1uJgbQ6BGZaC8FGJSXTVLr")


  // const ownerKey = SWAP_PROGRAM_OWNER_FEE_ADDRESS || selectedWallet.publicKey.toString();
  // let feeAccount = await tokenPool.createAccount(new PublicKey(ownerKey));


   let feeAccount = new PublicKey("AbaVfYMHx8p781ipy3JKbq6G4p7pPgrQu4oEucUqSGtV")

  console.log("connection", new PublicKey("6msDbzTiY6pHBt9RbPfavkfPz1qYUrfr8XTXcPET6cWh").toBase58(), TOKEN_SWAP_PROGRAM_ID.toBase58(),
    new PublicKey(ORIGINE_PROGRAMM_ID).toBase58(), tokenPool.publicKey.toBase58(),
    "feeAcount: "+feeAccount.toBase58(), selectedWallet.publicKey.toBase58(),
    tokenAccountA.toBase58(),
    tokenAccountB.toBase58(),
    mintA.publicKey.toBase58(),
    mintB.publicKey.toBase58()
  )

  const tokenSwapAccount = new Account();

  
  // const tokenSwapAccount = new Account([213, 92, 95, 30, 183, 94, 255, 53, 238, 181, 251, 106, 217, 117, 87, 161, 161, 47, 143, 10, 123, 223, 81, 123, 125, 80, 76, 110, 25, 245, 175, 147, 136, 172, 139, 177, 103, 223, 45, 173, 84, 25, 118, 238, 129, 77, 48, 49, 2, 224, 217, 128, 49, 19, 72, 244, 29, 112, 18, 184, 187, 37, 199, 42]);

  let [authority, nonce] = await PublicKey.findProgramAddress(
    [tokenSwapAccount.publicKey.toBuffer()],
    TOKEN_SWAP_PROGRAM_ID,
  ); 
  //let authority = new PublicKey("9Wcsb1nnvFDHbxm8d66uK5TFvVXuthioygho1PuQVCVG")// "DoA3GSRfNMcaHWX6QWd1QmDgVSDg9WwMP4Y3mnQiimfo");

  console.log("authority "+authority.toBase58())
  let tokenSwap = new TokenSwap(
    connection,
    new PublicKey("6msDbzTiY6pHBt9RbPfavkfPz1qYUrfr8XTXcPET6cWh"),
    TOKEN_SWAP_PROGRAM_ID,
    new PublicKey(ORIGINE_PROGRAMM_ID),
    tokenPool.publicKey,
    feeAccount,
    authority,
    tokenAccountA,
    tokenAccountB,
    mintA.publicKey,
    mintB.publicKey,
    TRADING_FEE_NUMERATOR,
    TRADING_FEE_DENOMINATOR,
    OWNER_TRADING_FEE_NUMERATOR,
    OWNER_TRADING_FEE_DENOMINATOR,
    OWNER_WITHDRAW_FEE_NUMERATOR,
    OWNER_WITHDRAW_FEE_DENOMINATOR,
    HOST_FEE_NUMERATOR,
    HOST_FEE_DENOMINATOR,
    CURVE_TYPE,
    selectedWallet
  )

  await tokenSwap.swap(
    userAccountA,
    tokenAccountA,
    tokenAccountB,
    userAccountB,
    new PublicKey(poolAccount),
    userTransferAuthority,
    2000,
    1000,
    connection,
    selectedWallet
  );

}

function tradingTokensToPoolTokens(
  sourceAmount: number,
  swapSourceAmount: number,
  poolAmount: number,
): number {
  const tradingFee =
    (sourceAmount / 2) * (TRADING_FEE_NUMERATOR / TRADING_FEE_DENOMINATOR);
  const sourceAmountPostFee = sourceAmount - tradingFee;
  const root = Math.sqrt(sourceAmountPostFee / swapSourceAmount + 1);
  return Math.floor(poolAmount * (root - 1));
}

export async function depositSingleTokenTypeExactAmountIn(): Promise<void> {
  // Pool token amount to deposit on one side
  const depositAmount = 10000;

  const poolMintInfo = await tokenPool.getMintInfo();
  const supply = poolMintInfo.supply.toNumber();
  const swapTokenA = await mintA.getAccountInfo(tokenAccountA);
  const poolTokenA = tradingTokensToPoolTokens(
    depositAmount,
    swapTokenA.amount.toNumber(),
    supply,
  );
  const swapTokenB = await mintB.getAccountInfo(tokenAccountB);
  const poolTokenB = tradingTokensToPoolTokens(
    depositAmount,
    swapTokenB.amount.toNumber(),
    supply,
  );

  const userTransferAuthority = new Account();
  console.log('Creating depositor token a account');
  const userAccountA = await mintA.createAccount(owner.publicKey);
  await mintA.mintTo(userAccountA, owner, [], depositAmount);
  await mintA.approve(
    userAccountA,
    userTransferAuthority.publicKey,
    owner,
    [],
    depositAmount,
    connection
  );
  console.log('Creating depositor token b account');
  const userAccountB = await mintB.createAccount(owner.publicKey);
  await mintB.mintTo(userAccountB, owner, [], depositAmount);
  await mintB.approve(
    userAccountB,
    userTransferAuthority.publicKey,
    owner,
    [],
    depositAmount,
    connection
  );
  console.log('Creating depositor pool token account');
  const newAccountPool = await tokenPool.createAccount(owner.publicKey);

  console.log('Depositing token A into swap');
  await tokenSwap.depositSingleTokenTypeExactAmountIn(
    userAccountA,
    newAccountPool,
    userTransferAuthority,
    depositAmount,
    poolTokenA,
  );

  let info;
  info = await mintA.getAccountInfo(userAccountA);
  // assert(info.amount.toNumber() == 0);
  info = await mintA.getAccountInfo(tokenAccountA);
  // assert(info.amount.toNumber() == currentSwapTokenA + depositAmount);
  currentSwapTokenA += depositAmount;

  console.log('Depositing token B into swap');
  await tokenSwap.depositSingleTokenTypeExactAmountIn(
    userAccountB,
    newAccountPool,
    userTransferAuthority,
    depositAmount,
    poolTokenB,
  );

  info = await mintB.getAccountInfo(userAccountB);
  // assert(info.amount.toNumber() == 0);
  info = await mintB.getAccountInfo(tokenAccountB);
  // assert(info.amount.toNumber() == currentSwapTokenB + depositAmount);
  currentSwapTokenB += depositAmount;
  info = await tokenPool.getAccountInfo(newAccountPool);
  // assert(info.amount.toNumber() >= poolTokenA + poolTokenB);
}

export async function withdrawSingleTokenTypeExactAmountOut(): Promise<void> {
  // Pool token amount to withdraw on one side
  const withdrawAmount = 50000;
  const roundingAmount = 1.0001; // make math a little easier

  const poolMintInfo = await tokenPool.getMintInfo();
  const supply = poolMintInfo.supply.toNumber();

  const swapTokenA = await mintA.getAccountInfo(tokenAccountA);
  const swapTokenAPost = swapTokenA.amount.toNumber() - withdrawAmount;
  const poolTokenA = tradingTokensToPoolTokens(
    withdrawAmount,
    swapTokenAPost,
    supply,
  );
  let adjustedPoolTokenA = poolTokenA * roundingAmount;
  if (OWNER_WITHDRAW_FEE_NUMERATOR !== 0) {
    adjustedPoolTokenA *=
      1 + OWNER_WITHDRAW_FEE_NUMERATOR / OWNER_WITHDRAW_FEE_DENOMINATOR;
  }

  const swapTokenB = await mintB.getAccountInfo(tokenAccountB);
  const swapTokenBPost = swapTokenB.amount.toNumber() - withdrawAmount;
  const poolTokenB = tradingTokensToPoolTokens(
    withdrawAmount,
    swapTokenBPost,
    supply,
  );
  let adjustedPoolTokenB = poolTokenB * roundingAmount;
  if (OWNER_WITHDRAW_FEE_NUMERATOR !== 0) {
    adjustedPoolTokenB *=
      1 + OWNER_WITHDRAW_FEE_NUMERATOR / OWNER_WITHDRAW_FEE_DENOMINATOR;
  }

  const userTransferAuthority = new Account();
  console.log('Creating withdraw token a account');
  const userAccountA = await mintA.createAccount(owner.publicKey);
  console.log('Creating withdraw token b account');
  const userAccountB = await mintB.createAccount(owner.publicKey);
  console.log('Creating withdraw pool token account');
  const poolAccount = await tokenPool.getAccountInfo(tokenAccountPool);
  const poolTokenAmount = poolAccount.amount.toNumber();
  await tokenPool.approve(
    tokenAccountPool,
    userTransferAuthority.publicKey,
    owner,
    [],
    adjustedPoolTokenA + adjustedPoolTokenB,
    connection
  );

  console.log('Withdrawing token A only');
  await tokenSwap.withdrawSingleTokenTypeExactAmountOut(
    userAccountA,
    tokenAccountPool,
    userTransferAuthority,
    withdrawAmount,
    adjustedPoolTokenA,
  );

  let info;
  info = await mintA.getAccountInfo(userAccountA);
  // assert(info.amount.toNumber() == withdrawAmount);
  info = await mintA.getAccountInfo(tokenAccountA);
  // assert(info.amount.toNumber() == currentSwapTokenA - withdrawAmount);
  currentSwapTokenA += withdrawAmount;
  info = await tokenPool.getAccountInfo(tokenAccountPool);
  // assert(info.amount.toNumber() >= poolTokenAmount - adjustedPoolTokenA);

  console.log('Withdrawing token B only');
  await tokenSwap.withdrawSingleTokenTypeExactAmountOut(
    userAccountB,
    tokenAccountPool,
    userTransferAuthority,
    withdrawAmount,
    adjustedPoolTokenB,
  );

  info = await mintB.getAccountInfo(userAccountB);
  // assert(info.amount.toNumber() == withdrawAmount);
  info = await mintB.getAccountInfo(tokenAccountB);
  // assert(info.amount.toNumber() == currentSwapTokenB - withdrawAmount);
  currentSwapTokenB += withdrawAmount;
  info = await tokenPool.getAccountInfo(tokenAccountPool);
 /* assert(
    info.amount.toNumber() >=
      poolTokenAmount - adjustedPoolTokenA - adjustedPoolTokenB,
  );*/
}

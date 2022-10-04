// @flow

import {Account, Connection} from '@solana/web3.js';

import {sleep} from './sleep';

export async function newAccountWithLamports(
  connection: Connection,
  lamports: number = 1000000,
): Promise<Account> {
  const account = new Account();

  let retries = 30;
  await connection.requestAirdrop(account.publicKey, lamports);
  for (;;) {
    await sleep(500);
    if (lamports == (await connection.getBalance(account.publicKey))) {
      return account;
    }
    if (--retries <= 0) {
      break;
    }
  }
  throw new Error(`Airdrop of ${lamports} failed`);
}

//id.json
export async function newAccountWithLamports1(
  connection: Connection,
  lamports: number = 1000000,
): Promise<Account> {
  const account = new Account([222,81,173,154,237,211,245,63,46,254,242,23,39,249,201,213,131,98,69,80,203,91,157,182,31,239,177,97,254,192,76,114,58,163,72,217,86,52,243,133,238,130,77,241,86,129,7,222,123,233,30,192,77,114,249,18,59,84,145,87,39,41,190,35]);
return account;
}
//key.json
export async function newAccountWithLamports2(
  connection: Connection,
  lamports: number = 1000000,
): Promise<Account> {
  const account = new Account([62,195,210,177,197,176,134,132,110,92,54,216,229,80,172,101,235,85,201,229,60,187,2,178,246,82,24,182,147,239,242,136,124,233,75,157,118,173,162,102,95,69,33,188,29,91,89,108,112,141,240,88,136,16,69,56,48,204,124,169,232,62,99,82]);
return account;
}
//keyH.json
export async function newAccountWithLamportSwap(
  connection: Connection,
  lamports: number = 1000000,
): Promise<Account> {
  const account = new Account([126,33,60,171,190,57,96,98,207,11,22,149,251,129,175,119,98,182,200,0,239,229,90,31,70,60,71,131,211,36,225,44,6,171,60,193,112,106,41,243,217,179,82,171,226,149,26,52,12,255,115,85,20,241,202,76,96,242,68,102,25,234,108,199]);
return account;
}
//keyTokenSwapAccount.json
export async function newAccountWithLamportSwapAccount(
  connection: Connection,
  lamports: number = 1000000,
): Promise<Account> {
  const account = new Account([55,243,47,66,118,105,43,25,173,114,16,82,70,191,79,10,218,253,122,31,196,40,235,38,105,35,75,7,155,20,36,69,121,215,118,253,168,51,63,241,205,242,227,202,113,216,107,17,139,234,100,243,0,5,158,179,8,211,205,22,158,23,25,115]);
return account;
}

import { Provider } from "@project-serum/anchor";
import {
  WhirlpoolContext, AccountFetcher, buildWhirlpoolClient, ORCA_WHIRLPOOL_PROGRAM_ID,
  WhirlpoolIx, InitConfigParams, WhirlpoolsConfigData
} from "@orca-so/whirlpools-sdk";
import { Keypair, PublicKey } from "@solana/web3.js";
import { TransactionBuilder, Instruction } from "@orca-so/common-sdk";

async function main() {

    const provider = Provider.env();
    
    const ctx = WhirlpoolContext.withProvider(provider, ORCA_WHIRLPOOL_PROGRAM_ID);
    const fetcher = new AccountFetcher(ctx.connection);
  
    console.log("endpoint:", ctx.connection.rpcEndpoint);
    console.log("wallet pubkey:", ctx.wallet.publicKey.toBase58());

const { configInitInfo } = generateDefaultConfigParams(ctx);
    let tx = await toTx(ctx, WhirlpoolIx.initializeConfigIx(ctx.program, configInitInfo)).buildAndExecute();
    console.log(tx, configInitInfo.whirlpoolsConfigKeypair.publicKey.toBase58())
   
    const configAccount = (await fetcher.getConfig(
      configInitInfo.whirlpoolsConfigKeypair.publicKey
    )) as WhirlpoolsConfigData;
    
    console.log("config ",configAccount.collectProtocolFeesAuthority.toBase58(),
    configAccount.defaultFeeRate,
    configAccount.defaultProtocolFeeRate,
    configAccount.feeAuthority.toBase58(),
    configAccount.rewardEmissionsSuperAuthority.toBase58()
)
}
export const generateDefaultConfigParams = (
    context: WhirlpoolContext,
    funder?: PublicKey
  ): {
    configInitInfo: InitConfigParams;
    configKeypairs: any;
  } => {
    const configKeypairs: any = {
      feeAuthorityKeypair: Keypair.generate(),
      collectProtocolFeesAuthorityKeypair: Keypair.generate(),
      rewardEmissionsSuperAuthorityKeypair: Keypair.generate(),
    };
    const configInitInfo = {
      whirlpoolsConfigKeypair: Keypair.generate(),
      feeAuthority: configKeypairs.feeAuthorityKeypair.publicKey,
      collectProtocolFeesAuthority: configKeypairs.collectProtocolFeesAuthorityKeypair.publicKey,
      rewardEmissionsSuperAuthority: configKeypairs.rewardEmissionsSuperAuthorityKeypair.publicKey,
      defaultProtocolFeeRate: 300,
      funder: funder || context.wallet.publicKey,
    };
    return { configInitInfo, configKeypairs };
  };

  export function toTx(ctx: WhirlpoolContext, ix: Instruction): TransactionBuilder {
    return new TransactionBuilder(ctx.provider).addInstruction(ix);
  }

  main()
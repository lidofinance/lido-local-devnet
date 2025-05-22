import { command } from "@devnet/command";

import { GitCheckout } from "../git/checkout.js";

export const OracleUp = command.cli({
  description: "Start Oracle(s)",
  params: {},
  async handler({ dre: { state, network, services }, dre }) {
    const { oracle } = services;
    await dre.runCommand(GitCheckout, {
      service: "oracle",
      ref: "feat/oracle-v6",
    });

    const { elPrivate, clPrivate } = await state.getChain();
    // TODO: Uncomment when CL1,2,3 is available
    // const { clPrivate1 } = await state.getChain();

    const { locator } = await state.getLido();
    const { module: csmModule } = await state.getCSM();
    const { oracle1, oracle2, oracle3 } = await state.getNamedWallet();

    const env = {
      CHAIN_ID: "32382",
      EXECUTION_CLIENT_URI: elPrivate,
      CONSENSUS_CLIENT_URI: clPrivate,
      CONSENSUS_CLIENT_URI_2: clPrivate,
      LIDO_LOCATOR_ADDRESS: locator,
      CSM_MODULE_ADDRESS: csmModule,
      MEMBER_PRIV_KEY_1: oracle1.privateKey,
      MEMBER_PRIV_KEY_2: oracle2.privateKey,
      MEMBER_PRIV_KEY_3: oracle3.privateKey,
      PINATA_JWT: process.env.CSM_ORACLE_PINATA_JWT ?? "",
      DOCKER_NETWORK_NAME: `kt-${network.name}`,
      COMPOSE_PROJECT_NAME: `oracles-${network.name}`,
    };

    await oracle.writeENV(".env", env);

    await oracle.sh`docker compose -f docker-compose.devnet.yml up --build -d`;
  },
});

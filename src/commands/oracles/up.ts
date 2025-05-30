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

    const { elPrivate } = await state.getChain();
    const { clNodesSpecs } = await state.getNodes();

    const distinctConsensusUris = Object.values(
      Object.fromEntries(
        new Map(
          clNodesSpecs.map((c) => {
            const port = c.ports.find((p) => p.privateUrl);
            if (!port || !port.privateUrl) {
              throw new Error(`Missing privateUrl for client: ${c.client} (${c.name})`);
            }
            return [c.client, port.privateUrl];
          })
        )
      )
    );


    const { locator } = await state.getLido();
    const { module: csmModule } = await state.getCSM();
    const { oracle1, oracle2, oracle3 } = await state.getNamedWallet();

    const env = {
      CHAIN_ID: "32382",
      EXECUTION_CLIENT_URI_1: elPrivate,
      EXECUTION_CLIENT_URI_2: elPrivate,
      EXECUTION_CLIENT_URI_3: elPrivate,
      CONSENSUS_CLIENT_URI_1: distinctConsensusUris[0],
      CONSENSUS_CLIENT_URI_2: distinctConsensusUris[1],
      CONSENSUS_CLIENT_URI_3: distinctConsensusUris[2],
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

import { command } from "@devnet/command";

export const OracleUp = command.cli({
  description: "Start Oracle(s)",
  params: {},
  async handler({ dre: { state, network, services } }) {
    const { oracle } = services;

    const { elPrivate, clPrivate } = await state.getChain();
    // const cl1 = state.getOrError("network.binding.clNodesPrivate.1");
    // const cl2 = state.getOrError("network.binding.clNodesPrivate.2");
    // const name = state.getOrError("network.name");

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
      PINATA_JWT: "",
      GW3_ACCESS_KEY: process.env.CSM_ORACLE_GW3_ACCESS_KEY ?? "",
      GW3_SECRET_KEY: process.env.CSM_ORACLE_GW3_SECRET_KEY ?? "",
      DOCKER_NETWORK_NAME: `kt-${network.name}`,
      COMPOSE_PROJECT_NAME: `oracles-${network.name}`,
    };

    await oracle.writeENV(".env", env);

    await oracle.sh`docker compose -f docker-compose.devnet.yml up --build -d`;
  },
});

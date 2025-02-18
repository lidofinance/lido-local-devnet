/* eslint-disable unicorn/numeric-separators-style */
/* eslint-disable perfectionist/sort-object-types */
import { assert, command } from "@devnet/command";
import * as YAML from "yaml";

export const PreparePectraVoting = command.cli({
  description: "Prepare pectra voting",
  params: {},
  async handler({
    dre: {
      state,
      services: { voting: votingService },
    },
  }) {
    const { elPublic } = await state.getChain();
    const {
      agent,
      voting,
      tokenManager,
      sanityChecker,
      accountingOracle,
      validatorExitBus,
      acl,
      oracleDaemonConfig,
      
      finance,
      withdrawalVault,
      withdrawalQueue,

      validatorExitBusImpl,
      withdrawalVaultImpl
    } = await state.getLido();

    const {
      module: csmModule,
      feeOracle,
      verifier,
      accounting: CS_ACCOUNTING_ADDRESS,
    } = await state.getCSM();

    const { CSVerifier } = await state.getNewVerifier();

    const config = {
      ACCOUNTING_ORACLE: accountingOracle,
      AGENT: agent,
      CHAIN_NETWORK_NAME: "holesky", // fix needed
      CS_FEE_ORACLE_ADDRESS: feeOracle,
      CS_VERIFIER_ADDRESS: CSVerifier,
      CS_VERIFIER_ADDRESS_OLD: verifier,
      CSM_ADDRESS: csmModule,
      ORACLE_REPORT_SANITY_CHECKER: sanityChecker,
      TOKEN_MANAGER: tokenManager,
      VALIDATORS_EXIT_BUS_ORACLE: validatorExitBus,
      VOTING: voting,
      ACL: acl,
      ORACLE_DAEMON_CONFIG: oracleDaemonConfig,
      WITHDRAWAL_QUEUE: withdrawalQueue,
      CS_ACCOUNTING_ADDRESS,
      FINANCE: finance,
      WITHDRAWAL_VAULT: withdrawalVault,

      VALIDATORS_EXIT_BUS_ORACLE_IMPL: validatorExitBusImpl,
      WITHDRAWAL_VAULT_IMPL: withdrawalVaultImpl,
    };

    const configContent = Object.entries({ ...config })
      .map(([key, value]) => `${key}="${value}"`)
      .join("\n");

    await votingService.writeFile("./configs/config_holesky.py", configContent);

    const configTemplateYaml = YAML.parse(
      await votingService.readFile("network-config.yaml"),
    );

    assert(
      Array.isArray(configTemplateYaml.development),
      "'development' must be an array",
    );
    console.log(configTemplateYaml.development);

    // - cmd: ./ganache.sh
    // cmd_settings:
    //   accounts: 10
    //   chain_id: 32382
    //   gas_limit: 30000000
    //   mnemonic: brownie
    //   port: 49697
    // host: http://127.0.0.1
    // id: devnet4
    // name: Devnet4
    // timeout: 360

    assert(
      typeof elPublic === "string" && elPublic.includes(":"),
      "Invalid elPublic format",
    );
    const parsedPort = elPublic.split(":").at(-1);
    assert(parsedPort !== undefined, "Invalid Port format");

    const port = Number.parseInt(parsedPort, 10);
    assert(!Number.isNaN(port), "Failed to parse port");
    delete configTemplateYaml.live;
    configTemplateYaml.development.filter((d: any) => d.id !== "holesky");
    configTemplateYaml.development.push({
      cmd: "./ganache.sh",
      cmd_settings: {
        accounts: 10,
        chain_id: 32382,
        gas_limit: 30000000,
        mnemonic: "brownie",
        port,
      },
      host: "http://127.0.0.1",
      id: "holesky",
      name: "Local devnet (holesky)",
      timeout: 360,
    });

    await votingService.writeFile(
      "network-config.yaml",
      YAML.stringify(configTemplateYaml),
    );
    // poetry run brownie networks delete holesky
    await votingService.sh`poetry run brownie networks import network-config.yaml True`;
  },
});

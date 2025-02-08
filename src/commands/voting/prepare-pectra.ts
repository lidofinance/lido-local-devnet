import { assert, command } from "@devnet/command";
import * as YAML from "yaml";

interface Config {
  ACCOUNTING_ORACLE: string;
  AGENT: string;
  CHAIN_NETWORK_NAME: string;
  CS_FEE_ORACLE_ADDRESS: string;
  CS_VERIFIER_ADDRESS: string;
  CS_VERIFIER_ADDRESS_OLD: string;
  CSM_ADDRESS: string;
  ORACLE_REPORT_SANITY_CHECKER: string;
  TOKEN_MANAGER: string;
  VALIDATORS_EXIT_BUS_ORACLE: string;
  VOTING: string;
}

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
    } = await state.getLido();

    const { module: csmModule, feeOracle, verifier } = await state.getCSM();

    const { CSVerifier } = await state.getNewVerifier();

    const config: Config = {
      ACCOUNTING_ORACLE: accountingOracle,
      AGENT: agent,
      CHAIN_NETWORK_NAME: "mainnet", // fix needed
      CS_FEE_ORACLE_ADDRESS: feeOracle,
      CS_VERIFIER_ADDRESS: CSVerifier,
      CS_VERIFIER_ADDRESS_OLD: verifier,
      CSM_ADDRESS: csmModule,
      ORACLE_REPORT_SANITY_CHECKER: sanityChecker,
      TOKEN_MANAGER: tokenManager,
      VALIDATORS_EXIT_BUS_ORACLE: validatorExitBus,
      VOTING: voting,
    };

    const configContent = Object.entries(config)
      .map(([key, value]) => `${key}="${value}"`)
      .join("\n");

    await votingService.writeFile("./configs/config_devnet4.py", configContent);

    const configTemplateYaml = YAML.parse(
      await votingService.readFile("network-config.yaml"),
    );

    assert(
      Array.isArray(configTemplateYaml.development),
      "'development' must be an array",
    );

    const devnet4Config = configTemplateYaml.development.find(
      (c: { name: string }) => c.name === "Devnet4",
    );
    assert(devnet4Config, "Devnet4 configuration not found");

    assert(
      typeof elPublic === "string" && elPublic.includes(":"),
      "Invalid elPublic format",
    );
    const parsedPort = elPublic.split(":").at(-1);
    assert(parsedPort !== undefined, "Invalid Port format");

    const port = Number.parseInt(parsedPort, 10);
    assert(!Number.isNaN(port), "Failed to parse port");

    devnet4Config.cmd_settings.port = port;

    await votingService.writeFile(
      "network-config.yaml",
      YAML.stringify(configTemplateYaml),
    );

    await votingService.sh`poetry run brownie networks import network-config.yaml True`;
  },
});

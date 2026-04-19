import { DevNetLogger } from "@devnet/logger";
import { Network } from "@devnet/types";
import { applyColor, getCachedColor } from "@devnet/ui";
import chalk from "chalk";
import { ExecaMethod, execa } from "execa";

import { DevnetServiceArtifact } from "./devnet-service-artifact.js";
import { DevNetServicesConfigs } from "./services-configs.js";

export const createShellWrapper = <Name extends keyof DevNetServicesConfigs>(
  serviceConfig: DevNetServicesConfigs[Name],
  serviceArtifact: DevnetServiceArtifact,
  network: Network,
  commandName: string
) => {
  const { env, name } = serviceConfig;
  const { root: serviceArtifactRoot } = serviceArtifact;

  const nestedCommandColor = getCachedColor(`${network}/${name}`);
  const commandColor = DevNetLogger.getColor(network, commandName);


  const rawSh = execa({
    cwd: serviceArtifactRoot,
    env: { TERM: "xterm", ...env },
    shell: true,
    stdout: [
      // async function* (chunk: any) {
      //   yield* transformCMDOutput(color, "||", chunk);
      // },
      "inherit",
    ],
    stderr: [
      // async function* (chunk: any) {
      //   yield* transformCMDOutput(color, "||", chunk);
      // },
      "inherit",
    ],
    stdin: "inherit",

    verbose(_: any, { type, ...verboseObject }: any) {
      if (type === "command") {
        // console.log(`${getSeparator(commandColor, "||")}`);
        console.log(
          applyColor(
            commandColor,
            `\\\\ [${`${network}/${name}`}]: ${applyColor(nestedCommandColor, verboseObject.escapedCommand)}`,
          ),
        );

        // return console.log(getSeparator(color, "||"));
        return console.log();
      }

      if (type === "duration") {
        console.log();
        // console.log(verboseObject.result.failed);
        if (verboseObject.result.failed) {
          // console.log(verboseObject.result)
          // shortMessage
          // const errorMessage = verboseObject.result.stderr.replaceAll(getSeparator(color, '||'), '')
          // console.log(`${getSeparator(color, '||')}${chalk.red(errorMessage)}`)
          // console.log(
          //   `${getSeparator(commandColor, "||")} ${chalk.red(verboseObject.result.shortMessage)}`,
          // );
          console.log(`${chalk.red(verboseObject.result.shortMessage)}`);
          console.log();
        }

        // console.log(getSeparator(color, "||"));
        // console.log();

        const ms = Math.floor(verboseObject.result.durationMs);
        return console.log(
          applyColor(
            commandColor,
            `// [${`${network}/${name}`}]: ${applyColor(nestedCommandColor, `${verboseObject.escapedCommand} finished in ${ms}ms`)}`,
          ),
        );
      }
    },
  });

  const wrapInvocation = (target: any): any =>
    new Proxy(target, {
      apply(fn, thisArg, args) {
        if (Array.isArray(args[0])) {
          // template-literal invocation — ensure artifact exists, then run
          return (async () => {
            await serviceArtifact.ensure();
            return Reflect.apply(fn, thisArg, args);
          })();
        }

        // options-configuration invocation — wrap returned tag function recursively
        return wrapInvocation(Reflect.apply(fn, thisArg, args));
      },
    });

  const sh = wrapInvocation(rawSh);

  return sh as unknown as ExecaMethod<{
    cwd: string;
    env: Record<string, string> | undefined;
    stdio: "inherit";
  }>;
}

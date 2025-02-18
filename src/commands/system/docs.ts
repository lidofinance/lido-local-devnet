import { DevNetCommand } from "@devnet/command";
import { execa } from "execa";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ignoreTopics = ["server", "system"];

export default class DevNetDocs extends DevNetCommand {
  static description = "Print public DevNet config";

  static isHiddenCommands = true;
  static isIsomorphicCommand: boolean = false;

  public async run(): Promise<void> {
    const sh = execa({ stdio: "inherit" });
    const docsDir = "docs/commands";
    const readmePath = join(docsDir, "README.md");
    const packageJsonPath = join(process.cwd(), "package.json");

    await sh`rm -rf ${docsDir}`;
    await sh`mkdir -p ${docsDir}`;
    // Generate documentation
    await sh`npx oclif readme --output-dir ${docsDir} --multi`;

    // Remove unwanted files
    await sh`rm -rf ${ignoreTopics.map((t) => `${docsDir}/${t}.md`)}`;

    // Read list of files
    const files = (await readdir(docsDir))
      .filter(
        (file) =>
          file.endsWith(".md") &&
          file !== "README.md" &&
          file !== "COMMANDS.md",
      )
      .sort();

    // Load command classes
    const classesLoader = this.config.commands.map(async (cmd) => cmd.load());
    const classes = (await Promise.all(
      classesLoader,
    )) as (typeof DevNetCommand)[];

    // Read package.json to fetch oclif topics
    let oclifTopics: Record<string, { description: string }> = {};
    try {
      const packageJson = JSON.parse(await readFile(packageJsonPath, "utf-8"));
      oclifTopics = packageJson.oclif?.topics || {};
    } catch (error) {
      console.warn("Failed to read package.json", error);
    }

    // Create README.md content
    const content = [
      "# 📖 Available Commands\n",
      "Below is a list of available commands. You can read their documentation by following the links below or by running:\n",
      "```sh\n./bin/run.js --help\n```\n",
      ...files.map((file) => {
        const title = file.replace(".md", "");
        let description = "";

        // 1. Check if command exists in loaded classes
        const command = classes.find((c) => c.id === title);

        if (oclifTopics[title]?.description) {
          description = ` - ${oclifTopics[title].description}`;
        }

        // 2. Check if command exists in package.json oclif topics
        else if (command) {
          description = ` - ${command.description}`;
        }

        // 3. Check for commands that start with title:
        else {
          const matchingCommand = classes.find((c) =>
            c.id.startsWith(`${title}:`),
          );
          if (matchingCommand) {
            description = ` - ${matchingCommand.description}`;
          }
        }

        return `- [${title}](./${file})${description}`;
      }),
    ].join("\n");

    // Write to README.md
    await writeFile(readmePath, content, "utf-8");
  }
}

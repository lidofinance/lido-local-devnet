import { DevNetError, command } from "@devnet/command";

export const VotingInstall = command.cli({
  description: "Install voting scripts dependencies",
  params: {},
  async handler({
    dre: {
      logger,
      services: { voting },
    },
  }) {
    const requiredPythonVersion = "3.10.0";

    try {
      await voting.sh`pyenv --version`;
    } catch {
      throw new DevNetError(
        "Pyenv is not installed or not in PATH. Install it from https://github.com/pyenv/pyenv",
      );
    }

    let installedVersions: string[];
    try {
      const result = await voting.sh({
        stdout: ["pipe"],
      })`pyenv versions --bare`;
      installedVersions = result.stdout.split("\n").map((v) => v.trim());
    } catch {
      throw new DevNetError(
        "Failed to list installed Python versions using pyenv.",
      );
    }

    if (!installedVersions.includes(requiredPythonVersion)) {
      logger.log(`Python ${requiredPythonVersion} not found. Installing...`);
      try {
        await voting.sh`pyenv install ${requiredPythonVersion}`;
      } catch {
        throw new DevNetError(
          `Failed to install Python ${requiredPythonVersion} using pyenv.`,
        );
      }
    }

    try {
      await voting.sh`pyenv local ${requiredPythonVersion}`;
    } catch {
      throw new DevNetError(
        `Failed to set Python ${requiredPythonVersion} as the local version.`,
      );
    }

    try {
      await voting.sh`python3 -m pip install --user poetry`;
    } catch {
      throw new DevNetError(
        "Failed to install Poetry. Ensure pip is available in the Python environment.",
      );
    }

    try {
      await voting.sh`python3 -m poetry install`;
    } catch {
      throw new DevNetError("Failed to install dependencies using Poetry.");
    }

    try {
      await voting.sh`yarn`;
    } catch {
      throw new DevNetError("Failed to install dependencies using Yarn.");
    }

    logger.log("Dependencies installed successfully.");
  },
});

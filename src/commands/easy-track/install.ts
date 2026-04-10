import { command } from "@devnet/command";
import fs from "node:fs/promises";
import path from "node:path";

const BROWNIE_PATCH_SCRIPT = `
import brownie, pathlib
p = pathlib.Path(brownie.__file__).parent / 'project/compiler/solidity.py'
s = p.read_text()
changed = False
old1 = '        pc_list.append({"op": opcodes.popleft(), "pc": pc})'
new1 = '        if not opcodes:\\n            break\\n        pc_list.append({"op": opcodes.popleft(), "pc": pc})'
if old1 in s and new1 not in s:
    s = s.replace(old1, new1)
    changed = True
old2 = 'while opcodes[0] not in ("INVALID", "STOP") and pc < instruction_count:'
new2 = 'while opcodes and opcodes[0] not in ("INVALID", "STOP") and pc < instruction_count:'
if old2 in s:
    s = s.replace(old2, new2)
    changed = True
old3 = 'if pc_list[-1]["op"].startswith("PUSH") and opcodes[0][:2] == "0x":'
new3 = 'if opcodes and pc_list[-1]["op"].startswith("PUSH") and opcodes[0][:2] == "0x":'
if old3 in s:
    s = s.replace(old3, new3)
    changed = True
if changed:
    p.write_text(s)
    print('Brownie patched successfully')
else:
    print('Brownie already patched or no changes needed')
`;

export const EasyTrackInstall = command.cli({
  description: "Install dependencies and set up brownie for easy-track",
  params: {},
  async handler({ dre, dre: { logger } }) {
    const { easyTrack } = dre.services;
    const { elPublic } = await dre.state.getChain();

    const pyenvPath = `${process.env.HOME}/.pyenv/shims:${process.env.HOME}/.pyenv/bin`;
    const sh = easyTrack.sh({
      env: {
        PATH: `${pyenvPath}:${process.env.PATH}`,
        DEVNET_RPC_URL: elPublic,
      },
    });

    logger.log("Installing poetry dependencies...");
    await sh`poetry install`;

    logger.log("Patching Brownie coverage data bug...");
    const patchPath = path.join(easyTrack.artifact.root, "_patch_brownie.py");
    await fs.writeFile(patchPath, BROWNIE_PATCH_SCRIPT, "utf-8");
    await sh`poetry run python _patch_brownie.py`;
    await fs.rm(patchPath, { force: true });

    logger.log("Importing brownie network config...");
    await sh`poetry run brownie networks import network-config.yaml True`;

    logger.log("Compiling contracts with brownie...");
    await sh`poetry run brownie compile`;

    logger.log("Easy-track dependencies installed successfully.");
  },
});

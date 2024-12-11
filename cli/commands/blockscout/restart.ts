import { Command } from "@oclif/core";

export default class RestartNodes extends Command {
  static description = "Restart CL + EL nodes from scratch";

  async run() {
    this.log('Restarting the blockscout...');

    try {
      await this.config.runCommand('blockscout:down');
      this.log('blockscout successfully stopped.');

      await this.config.runCommand('blockscout:clean');
      this.log('blockscout data cleared.');

      await this.config.runCommand('blockscout:up');
      this.log('blockscout successfully started.');
      
      this.log('✅ blockscout restart completed successfully!');
    } catch (error:any) {
      this.error(`❌ blockscout restart failed: ${error.message}`);
    }
  }
}

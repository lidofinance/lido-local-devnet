import { Command } from "@oclif/core";

export default class RestartNodes extends Command {
  static description = "Restart CL + EL nodes from scratch";

  async run() {
    this.log('Restarting the network...');

    try {
      await this.config.runCommand('network:down');
      this.log('Network successfully stopped.');

      await this.config.runCommand('network:clean');
      this.log('Network data cleared.');

      await this.config.runCommand('network:up');
      this.log('Network successfully started.');
      
      this.log('✅ Network restart completed successfully!');
    } catch (error:any) {
      this.error(`❌ Network restart failed: ${error.message}`);
    }
  }
}

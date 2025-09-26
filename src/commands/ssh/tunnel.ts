import { command } from "@devnet/command";
import { DevNetError } from "@devnet/utils";
import { execa } from "execa";


export const SSHTunnel = command.cli({
  description: "Start SSH tunnel",
  params: {},
  extensions: [],
  async handler({ dre: { logger } }) {
    const sshHost = process.env.SSH_HOST;
    const sshUser = process.env.SSH_USER ?? process.env.USER;
    const sshPrivateKey = process.env.SSH_PRIVATE_KEY ?? '~/.ssh/id_rsa';
    const sshTunnelRemoteAddress = process.env.SSH_TUNNEL_REMOTE_ADDRESS;
    const sshTunnelLocalPort = process.env.SSH_TUNNEL_LOCAL_PORT;

    // Validate required environment variables
    if (!sshHost) {
      throw new DevNetError("SSH_HOST environment variable is required");
    }

    if (!sshUser) {
      throw new DevNetError("SSH_USER environment variable is required");
    }

    if (!sshPrivateKey) {
      throw new DevNetError("SSH_PRIVATE_KEY environment variable is required");
    }

    if (!sshTunnelRemoteAddress) {
      throw new DevNetError("SSH_TUNNEL_REMOTE_ADDRESS environment variable is required");
    }

    if (!sshTunnelLocalPort) {
      throw new DevNetError("SSH_TUNNEL_LOCAL_PORT environment variable is required");
    }

    logger.log(`Starting SSH tunnel to ${sshHost}...`);
    logger.log(`Tunnel configuration: ${sshTunnelLocalPort} -> ${sshTunnelRemoteAddress}`);

    const sshArgs = [
      '-i', sshPrivateKey,
      '-L', `${sshTunnelLocalPort}:${sshTunnelRemoteAddress}`,
      '-N', // Don't execute a remote command
      '-T', // Disable pseudo-terminal allocation
      '-o', 'ServerAliveInterval=30',
      '-o', 'ServerAliveCountMax=3',
      `${sshUser}@${sshHost}`
    ];

    try {
      const sshProcess = execa('ssh', sshArgs, {
        stdio: 'inherit'
      });

      // Handle process termination gracefully
      process.on('SIGINT', () => {
        logger.log('Received SIGINT, terminating SSH tunnel...');
        sshProcess.kill('SIGTERM');
        setTimeout(() => {
          if (!sshProcess.killed) {
            logger.log('Force killing SSH process...');
            sshProcess.kill('SIGKILL');
          }
        }, 5000);
      });

      process.on('SIGTERM', () => {
        logger.log('Received SIGTERM, terminating SSH tunnel...');
        sshProcess.kill('SIGTERM');
      });


      logger.log(`SSH tunnel starting on local port ${sshTunnelLocalPort}`);
      logger.log(`For better experience turn on keep-alive in your SSH client`);
      await sshProcess;

    } catch (error) {
      throw new DevNetError(`SSH tunnel failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
});

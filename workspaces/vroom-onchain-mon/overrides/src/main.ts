import 'common/constants/runtime-network-overrides';
import { NestFactory } from '@nestjs/core';
import * as Sentry from '@sentry/node';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { LOGGER_PROVIDER } from '@lido-nestjs/logger';
import { ConfigService } from 'common/config';
import { AppModule, APP_NAME, APP_VERSION } from 'app';
import { parseCommandLineArgs } from 'common/utils/utils';
import { CliModule } from 'common/cli';
import { BlockProcessorService } from 'common/block-processor/block-processor.service';
import { OnchainDispatcherService } from 'agents';

async function bootstrap() {
  // it allows to run the bot with a specific block number
  const cliArgs = parseCommandLineArgs(process.argv);
  if (cliArgs.number) {
    const context = await NestFactory.createApplicationContext(CliModule);

    const blockNumber = Number(cliArgs.number);
    const initBlock = Number(cliArgs.initBlock) || blockNumber;
    const blockProcessingService = context.get(BlockProcessorService);
    const dispatcherService = context.get(OnchainDispatcherService);
    const logger = context.get(LOGGER_PROVIDER);

    await dispatcherService.initializeAgents(initBlock);
    const { blockFindings, txFindings } = await blockProcessingService.processSpecificBlock(blockNumber);
    logger.log(`Findings from block dispatch: ${JSON.stringify(blockFindings)}`);
    logger.log(`Findings from transaction dispatch: ${JSON.stringify(txFindings)}`);

    await context.close();
    process.exit(0);
  }

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({ trustProxy: true }), {
    bufferLogs: true,
  });

  // config
  const configService: ConfigService = app.get(ConfigService);
  const environment = configService.get('NODE_ENV');
  const appPort = configService.get('PORT');
  const sentryDsn = configService.get('SENTRY_DSN') ?? undefined;

  // logger
  app.useLogger(app.get(LOGGER_PROVIDER));

  // sentry
  const release = `${APP_NAME}@${APP_VERSION}`;
  Sentry.init({ dsn: sentryDsn, release, environment });

  // app
  await app.listen(appPort, '0.0.0.0');
}
bootstrap();

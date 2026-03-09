import { DevNetError } from "@devnet/utils";

const DEFAULT_WEBHOOK_ENV = "SLACK_WEBHOOK_URL";

type LoggerLike = {
  log: (message: string) => void;
  warn: (message: string) => void;
};

export const resolveWebhookUrl = (override?: string): string => {
  const url = override || process.env[DEFAULT_WEBHOOK_ENV];
  if (!url) {
    throw new DevNetError(
      `Slack webhook URL is not set. Pass --webhookUrl or set ${DEFAULT_WEBHOOK_ENV} env variable`,
    );
  }

  return url;
};

export const postMessageViaWebhook = async (
  webhookUrl: string,
  text: string,
  logger: LoggerLike,
): Promise<void> => {
  try {
    const response = await fetch(webhookUrl, {
      body: JSON.stringify({ text }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    if (!response.ok) {
      logger.warn(`Slack webhook failed: ${response.status} ${response.statusText}`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`Slack webhook failed: ${message}`);
  }
};

export const uploadFileToSlack = async (opts: {
  botToken: string;
  channel: string;
  content: string;
  filename: string;
  logger: LoggerLike;
  title: string;
}): Promise<void> => {
  const { botToken, channel, content, filename, logger, title } = opts;

  try {
    const response = await fetch("https://slack.com/api/files.upload", {
      body: JSON.stringify({
        channels: channel,
        content,
        filename,
        filetype: "javascript",
        title,
      }),
      headers: {
        "Authorization": `Bearer ${botToken}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    const result = (await response.json()) as { error?: string; ok: boolean };
    if (!result.ok) {
      logger.warn(`Slack file upload failed: ${result.error ?? "unknown error"}`);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`Slack file upload failed: ${message}`);
  }
};

export const postJsonFile = async (opts: {
  botToken?: string;
  channel?: string;
  content: string;
  filename: string;
  logger: LoggerLike;
  title: string;
  webhookUrl: string;
}): Promise<void> => {
  const { botToken, channel, content, filename, logger, title, webhookUrl } = opts;

  if (botToken && channel) {
    await uploadFileToSlack({ botToken, channel, content, filename, logger, title });
  } else {
    logger.warn(
      `Skipping file upload for ${filename} (no SLACK_BOT_TOKEN / SLACK_CHANNEL). Set both for file attachments.`,
    );
    await postMessageViaWebhook(
      webhookUrl,
      `📎 _${title}_ — file upload requires SLACK_BOT_TOKEN and SLACK_CHANNEL`,
      logger,
    );
  }
};

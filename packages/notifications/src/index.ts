const DEFAULT_WEBHOOK_ENV = "SLACK_WEBHOOK_URL";

export type NotificationEventType =
  | "delete"
  | "deploy"
  | "redeploy"
  | "serviceDown"
  | "serviceRestart"
  | "serviceUp";

export type NotificationStatus = "failed" | "succeeded";

export type NotificationEvent = {
  commandName: string;
  durationMs?: number;
  error?: string;
  message?: string;
  network: string;
  service?: string;
  status?: NotificationStatus;
  type: NotificationEventType;
};

export type NotificationsConfig = {
  events?: {
    delete?: boolean;
    deploy?: boolean;
    redeploy?: boolean;
    serviceDown?: boolean;
    serviceRestart?: boolean;
    serviceUp?: boolean;
  };
  filters?: {
    allowCommands?: string[];
    ignoreCommands?: string[];
  };
  slack?: {
    channel?: string;
    enabled?: boolean;
    iconEmoji?: string;
    username?: string;
    webhookUrlEnv?: string;
  };
};

export type NotificationsLogger = {
  warn(msg: string): void;
};

export type NotifierOptions = {
  config?: NotificationsConfig;
  env?: NodeJS.ProcessEnv;
  logger?: NotificationsLogger;
};

export class DevNetNotifier {
  private readonly config?: NotificationsConfig;
  private readonly env: NodeJS.ProcessEnv;
  private readonly logger?: NotificationsLogger;

  constructor(options: NotifierOptions) {
    this.config = options.config;
    this.env = options.env ?? process.env;
    this.logger = options.logger;
  }

  public async notify(event: NotificationEvent): Promise<void> {
    if (!this.shouldNotify(event)) return;

    const webhookUrl = this.getWebhookUrl();
    if (!webhookUrl) return;

    const payload = this.buildSlackPayload(event);

    try {
      const response = await fetch(webhookUrl, {
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        this.logger?.warn(
          `Slack notification failed: ${response.status} ${response.statusText}`,
        );
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger?.warn(`Slack notification failed: ${message}`);
    }
  }

  private buildSlackPayload(event: NotificationEvent) {
    const slackConfig = this.config?.slack;

    return {
      channel: slackConfig?.channel,
      iconEmoji: slackConfig?.iconEmoji,
      text: this.formatSlackText(event),
      username: slackConfig?.username,
    };
  }

  private formatEventType(type: NotificationEventType): string {
    const labels: Record<NotificationEventType, string> = {
      delete: "delete",
      deploy: "deploy",
      redeploy: "redeploy",
      serviceDown: "service down",
      serviceRestart: "service restart",
      serviceUp: "service up",
    };

    return labels[type];
  }

  private formatSlackText(event: NotificationEvent): string {
    const status = event.status ?? "succeeded";
    const lines = [
      `Devnet: ${event.network}`,
      `Event: ${this.formatEventType(event.type)}`,
      `Status: ${status}`,
      `Command: ${event.commandName}`,
    ];

    if (event.service) {
      lines.push(`Service: ${event.service}`);
    }

    if (event.durationMs !== undefined) {
      const seconds = Math.round(event.durationMs / 1000);
      lines.push(`Duration: ${seconds}s`);
    }

    if (event.message) {
      lines.push(`Message: ${event.message}`);
    }

    if (event.error) {
      lines.push(`Error: ${event.error}`);
    }

    return lines.join("\n");
  }

  private getWebhookUrl(): null | string {
    const slackConfig = this.config?.slack;
    if (slackConfig?.enabled === false) return null;

    const webhookEnvKey = slackConfig?.webhookUrlEnv ?? DEFAULT_WEBHOOK_ENV;
    const webhookUrl = this.env[webhookEnvKey];

    if (!webhookUrl) {
      if (slackConfig?.enabled) {
        this.logger?.warn(
          `Slack notifications enabled but ${webhookEnvKey} is not set`,
        );
      }

      return null;
    }

    return webhookUrl;
  }

  private isEventEnabled(
    eventsConfig: NotificationsConfig["events"] | undefined,
    type: NotificationEventType,
  ): boolean {
    const map = {
      delete: eventsConfig?.delete,
      deploy: eventsConfig?.deploy,
      redeploy: eventsConfig?.redeploy,
      serviceDown: eventsConfig?.serviceDown,
      serviceRestart: eventsConfig?.serviceRestart,
      serviceUp: eventsConfig?.serviceUp,
    };

    return map[type] !== false;
  }

  private shouldNotify(event: NotificationEvent): boolean {
    const eventsConfig = this.config?.events;
    const enabledByType = this.isEventEnabled(eventsConfig, event.type);
    if (!enabledByType) return false;

    const allowCommands = this.config?.filters?.allowCommands ?? [];
    if (allowCommands.length > 0 && !allowCommands.includes(event.commandName)) {
      return false;
    }

    const ignoreCommands = this.config?.filters?.ignoreCommands ?? [];
    if (ignoreCommands.includes(event.commandName)) {
      return false;
    }

    return true;
  }
}

export const createNotifier = (options: NotifierOptions) =>
  new DevNetNotifier(options);

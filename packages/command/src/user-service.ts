export class DevNetServiceConfig<T = unknown> {
  config?: string;
  constants: T;
  env?: Record<string, string>;

  hooks?: {
    build?: string;
    destroy?: string;
    install?: string;
  };

  name: string;
  repository?: string;

  constructor({
    config,
    env,
    hooks,
    name,
    repository,
    constants,
  }: {
    config?: string;
    constants: T;
    env?: Record<string, string>;
    hooks?: { build?: string; destroy?: string; install?: string };
    name: string;
    repository?: string;
  }) {
    this.config = config;
    this.env = env;
    this.hooks = hooks;
    this.name = name;
    this.repository = repository;
    this.constants = constants;
  }
}

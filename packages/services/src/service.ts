export class DevNetServiceConfig<
  T = unknown,
  L extends Record<string, string> = Record<string, string>,
> {
  config?: string;
  constants: T;
  env?: Record<string, string>;
  exposedPorts?: number[];
  hooks?: {
    build?: string;
    destroy?: string;
    install?: string;
  };

  labels: L;
  name: string;
  repository?: string;

  constructor({
    config,
    env,
    hooks,
    name,
    repository,
    constants,
    labels,
    exposedPorts,
  }: {
    config?: string;
    constants: T;
    env?: Record<string, string>;
    exposedPorts?: number[];
    hooks?: { build?: string; destroy?: string; install?: string };
    labels: L;
    name: string;
    repository?: string;
  }) {
    this.config = config;
    this.env = env;
    this.hooks = hooks;
    this.name = name;
    this.repository = repository;
    this.constants = constants;
    this.labels = labels;
    this.exposedPorts = exposedPorts;
  }
}

// service_name=dora

export class DevNetServiceConfig<
  T = unknown,
  L extends Record<string, string> = Record<string, string>,
> {
  constants: T;
  env?: Record<string, string>;
  exposedPorts?: number[];
  git?: string;

  hooks?: {
    build?: string;
    destroy?: string;
    install?: string;
  };

  labels: L;
  name: string;
  repository?: { branch: string, url: string };

  workspace?: string;

  constructor({
    workspace,
    env,
    hooks,
    name,
    repository,
    constants,
    labels,
    exposedPorts,
  }: {
    constants: T;
    env?: Record<string, string>;
    exposedPorts?: number[];
    hooks?: { build?: string; destroy?: string; install?: string };
    labels: L;
    name: string;
    repository?: { branch: string, url: string };
    workspace?: string;
  }) {
    this.workspace = workspace;
    this.env = env;
    this.hooks = hooks;
    this.name = name;
    this.repository = repository;
    this.constants = constants;
    this.labels = labels;
    this.exposedPorts = exposedPorts;
  }
}

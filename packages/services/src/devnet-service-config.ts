import { ServiceGetter } from "./service-getter.js";


export class DevnetServiceConfig<
  CustomServiceGetters extends Record<string, ServiceGetter<string>> = Record<string, ServiceGetter<string>>,
  Constants = unknown,
  Labels extends Record<string, string> = Record<string, string>,
> {
  constants: Constants;
  env?: Record<string, string>;
  exposedPorts?: number[];

  getters: CustomServiceGetters;

  git?: string;


  hooks?: {
    build?: string;
    destroy?: string;
    install?: string;
  };

  installCommand?: string;

  // oclif topic (dir under src/commands/) that provides build/up commands for this service.
  // e.g. kapi → "kapi-k8s" so "kapi-k8s build" and "kapi-k8s up" can be invoked.
  // If omitted, the service has no k8s deploy lifecycle.
  k8sTopic?: string;

  labels: Labels;
  name: string;
  repository?: { branch: string, url: string };

  workspace?: string;

  constructor({
    workspace,
    env,
    getters,
    hooks,
    installCommand,
    k8sTopic,
    name,
    repository,
    constants,
    labels,
    exposedPorts,
  }: {
    constants: Constants;
    env?: Record<string, string>;
    exposedPorts?: number[];
    getters: CustomServiceGetters;
    hooks?: { build?: string; destroy?: string; install?: string };
    installCommand?: string;
    k8sTopic?: string;
    labels: Labels;
    name: string;
    repository?: { branch: string, url: string };
    workspace?: string;
  }) {
    this.workspace = workspace;
    this.env = env;
    this.hooks = hooks;
    this.installCommand = installCommand;
    this.k8sTopic = k8sTopic;
    this.getters = getters;
    this.name = name;
    this.repository = repository;
    this.constants = constants;
    this.labels = labels;
    this.exposedPorts = exposedPorts;
  }
}

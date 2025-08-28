import { ServiceGetter } from "./service-getter.js";


export class DevNetServiceConfig<
  CustomServiceGetters extends Record<string, ServiceGetter> = Record<string, ServiceGetter>,
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

  labels: Labels;
  name: string;
  repository?: { branch: string, url: string };

  workspace?: string;

  constructor({
    workspace,
    env,
    getters,
    hooks,
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
    labels: Labels;
    name: string;
    repository?: { branch: string, url: string };
    workspace?: string;
  }) {
    this.workspace = workspace;
    this.env = env;
    this.hooks = hooks;
    this.getters = getters;
    this.name = name;
    this.repository = repository;
    this.constants = constants;
    this.labels = labels;
    this.exposedPorts = exposedPorts;
  }
}

export type ServiceConfig = {
  root: string;
};

//  type ServiceConfigs = Record<string, ServiceConfig>

export const services = {
  blockscout: {
    root: "services/blockscout",
  },
};

// type ServiceConfig = {
//   config?: string;
//   repository?: string;
// };

// type ServiceConfigs<T extends Record<string, ServiceConfig>> = {
//   [K in keyof T]: T[K];
// };

export const devNetServices = {
  blockscout: {
    config: "services/blockscout",
    name: "blockscout" as const
  },
};

import pkg from "kurtosis-sdk/build/engine/kurtosis_engine_rpc_api_bindings/engine_service_pb.js";
const { CreateEnclaveArgs, EnclaveMode } = pkg;
import {
  DEFAULT_API_CONTAINER_VERSION_TAG,
  API_CONTAINER_LOG_LEVEL,
  DEFAULT_SHOULD_APIC_RUN_IN_DEBUG_MODE,
} from "./constants.js";
import { PortSpec } from "kurtosis-sdk";

export const createEnclaveArgs = (enclaveName: string) => {
  const args = new CreateEnclaveArgs();

  args.setEnclaveName(enclaveName);
  args.setApiContainerVersionTag(DEFAULT_API_CONTAINER_VERSION_TAG);
  args.setApiContainerLogLevel(API_CONTAINER_LOG_LEVEL);
  args.setShouldApicRunInDebugMode(DEFAULT_SHOULD_APIC_RUN_IN_DEBUG_MODE);

  args.setMode(EnclaveMode.PRODUCTION);

  return args;
};
interface ServiceInfo {
  name: string;
  uid: string;
  publicPorts: {
    [k: string]: PortSpec;
  };
  privatePorts: {
    [k: string]: PortSpec;
  };
  privateIp: string;
}
export const createNetworkMapping = (enclaveServicesInfo: ServiceInfo[]) => {
  return enclaveServicesInfo
    .map((info) => {
      const res = { ...info, url: "" } as ServiceInfo & {
        url: string;
        privateUrl: string;
        privateWsUrl: string;
        wsUrl?: string;
      };
      if (info.name.startsWith("el")) {
        res.url = formUrl(info.publicPorts.rpc.number);
        res.wsUrl = formUrl(info.publicPorts.ws.number);

        res.privateUrl = formUrl(info.privatePorts.rpc.number, info.privateIp);
        res.privateWsUrl = formUrl(info.privatePorts.ws.number, info.privateIp);
        return res;
      }

      if (info.name.startsWith("vc")) {
        res.url = formUrl(info.publicPorts['http-validator'].number);

        res.privateUrl = formUrl(info.privatePorts['http-validator'].number, info.privateIp);
        return res;
      }

      //   if (info.name.startsWith("cl")) {
      res.url = info.publicPorts.http
        ? formUrl(info.publicPorts.http.number)
        : "";
      res.privateUrl = info.privatePorts.http
        ? formUrl(info.privatePorts.http.number, info.privateIp)
        : "";
      return res;
      //   }

      //   return;
    })
    .filter((val) => val);
};

const formUrl = (port: number, host = "localhost") =>
  `http://${host}:${port}`;

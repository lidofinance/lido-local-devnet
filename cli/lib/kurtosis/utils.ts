import pkg from 'kurtosis-sdk/build/engine/kurtosis_engine_rpc_api_bindings/engine_service_pb.js';
const { CreateEnclaveArgs, EnclaveMode } = pkg;
import {
  DEFAULT_API_CONTAINER_VERSION_TAG,
  API_CONTAINER_LOG_LEVEL,
  DEFAULT_SHOULD_APIC_RUN_IN_DEBUG_MODE,
} from "./constants.js";

export const createEnclaveArgs = (enclaveName: string) => {
  const args = new CreateEnclaveArgs();

  args.setEnclaveName(enclaveName);
  args.setApiContainerVersionTag(DEFAULT_API_CONTAINER_VERSION_TAG);
  args.setApiContainerLogLevel(API_CONTAINER_LOG_LEVEL);
  args.setShouldApicRunInDebugMode(DEFAULT_SHOULD_APIC_RUN_IN_DEBUG_MODE);

  args.setMode(EnclaveMode.PRODUCTION);

  return args;
};

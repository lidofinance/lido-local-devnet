// eslint-disable-next-line import/default
import pkg from 'kurtosis-sdk/build/engine/kurtosis_engine_rpc_api_bindings/engine_service_pb.js';
// eslint-disable-next-line import/no-named-as-default-member
export const { EnclaveMode } = pkg;
export const API_CONTAINER_LOG_LEVEL: string = "debug";
// Blank tells the engine server to use the default
export const DEFAULT_API_CONTAINER_VERSION_TAG = "";
export const DEFAULT_SHOULD_APIC_RUN_IN_DEBUG_MODE = false;

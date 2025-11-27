import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 *  Root path to vendor helm charts
 */
export const HELM_VENDOR_CHARTS_ROOT_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  `../../../helm`
);



import { execa } from "execa";

export type DeployMeta = {
  DEPLOY_COMMIT: string;
  DEPLOY_TIME: string;
};

/**
 * Resolves deploy metadata (git commit + timestamp) for a service.
 * Used to tag k8s pod labels for log filtering in Loki/Grafana.
 */
export const getDeployMeta = async (artifactRoot: string): Promise<DeployMeta> => {
  let DEPLOY_COMMIT = "unknown";
  try {
    const result = await execa("git", ["-C", artifactRoot, "rev-parse", "--short", "HEAD"]);
    DEPLOY_COMMIT = result.stdout.trim();
  } catch { /* ignore — repo may not exist yet */ }

  const DEPLOY_TIME = new Date().toISOString().replace(/[:.]/g, "-");

  return { DEPLOY_COMMIT, DEPLOY_TIME };
};

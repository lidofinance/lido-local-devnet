export const sanitizeStateForPublicSharing = (state: Record<string, unknown>) => {
  const sanitized = JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
  const { grafana } = sanitized;

  if (grafana && typeof grafana === "object" && !Array.isArray(grafana)) {
    delete (grafana as Record<string, unknown>).basicAuth;
  }

  return sanitized;
};

export const sanitizeStateJsonForPublicSharing = (stateContent: string) =>
  JSON.stringify(sanitizeStateForPublicSharing(JSON.parse(stateContent) as Record<string, unknown>), null, 2);

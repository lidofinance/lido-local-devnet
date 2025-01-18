import { KEY_MANAGER_API_TOKEN } from "./constant.js";
interface KeystoreInfo {
  readonly: boolean;
  validating_pubkey: string;
}

interface KeystoresResponse {
  data: KeystoreInfo[];
}

interface GraffitiResponse {
  data: { graffiti: string };
}
export const fetchValidatorGraffiti = async (
  apiUrl: string,
  validatorPublicKey: string
) => {
  const url = `${apiUrl}/eth/v1/validator/${validatorPublicKey}/graffiti`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${KEY_MANAGER_API_TOKEN}`,
    },
    method: "GET",
  });
  const data: GraffitiResponse = await response.json();
  return data;
};

export const fetchKeystores = async (apiUrl: string) => {
  const url = `${apiUrl}/eth/v1/keystores`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${KEY_MANAGER_API_TOKEN}`,
    },
    method: "GET",
  });
  const data: KeystoresResponse = await response.json();
  return data;
};

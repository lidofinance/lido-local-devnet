/* eslint-disable camelcase */

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

interface SlashingProtectionExportResponse {
  data: string;
}

interface ImportResponse {
  data: { imported: boolean; message: string }[];
}

interface DeleteResponse {
  data: { message: string; status: string }[];
}

export const fetchValidatorGraffiti = async (
  apiUrl: string,
  validatorPublicKey: string,
  token: string,
) => {
  const url = `${apiUrl}/eth/v1/validator/${validatorPublicKey}/graffiti`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data: GraffitiResponse = await response.json();
  return data;
};

export const fetchKeystores = async (apiUrl: string, token: string) => {
  const url = `${apiUrl}/eth/v1/keystores`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data: KeystoresResponse = await response.json();
  return data;
};

export const exportSlashingProtection = async (
  apiUrl: string,
  token: string,
) => {
  const url = `${apiUrl}/eth/v1/keystores/slashing_protection`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data: SlashingProtectionExportResponse = await response.json();
  return data;
};

export const importKeystores = async (
  apiUrl: string,
  keystores: any[],
  passwords: string[],
  token: string,
  // slashingProtection: string,
) => {
  const url = `${apiUrl}/eth/v1/keystores`;
  const body = JSON.stringify({
    keystores,
    passwords,
    // slashing_protection: slashingProtection,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body,
  });

  const data: ImportResponse = await response.json();
  return data;
};

export const deleteKeystores = async (
  apiUrl: string,
  pubkeys: string[],
  token: string,
) => {
  const url = `${apiUrl}/eth/v1/keystores`;
  const body = JSON.stringify({
    pubkeys,
  });

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body,
  });

  const data: DeleteResponse = await response.json();
  return data;
};

export { KEY_MANAGER_DEFAULT_API_TOKEN } from "./constants.js";

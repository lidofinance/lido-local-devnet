/* eslint-disable camelcase */
import { KEY_MANAGER_API_TOKEN } from "./constants.js";

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

export const fetchValidatorGraffiti = async (
  apiUrl: string,
  validatorPublicKey: string,
) => {
  const url = `${apiUrl}/eth/v1/validator/${validatorPublicKey}/graffiti`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${KEY_MANAGER_API_TOKEN}`,
    },
  });
  const data: GraffitiResponse = await response.json();
  return data;
};

export const fetchKeystores = async (apiUrl: string) => {
  const url = `${apiUrl}/eth/v1/keystores`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${KEY_MANAGER_API_TOKEN}`,
    },
  });
  const data: KeystoresResponse = await response.json();
  return data;
};

export const exportSlashingProtection = async (apiUrl: string) => {
  const url = `${apiUrl}/eth/v1/keystores/slashing_protection`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${KEY_MANAGER_API_TOKEN}`,
    },
  });
  const data: SlashingProtectionExportResponse = await response.json();
  return data;
};

export const importKeystores = async (
  apiUrl: string,
  keystores: any[],
  passwords: string[],
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
      Authorization: `Bearer ${KEY_MANAGER_API_TOKEN}`,
    },
    body,
  });

  const data: ImportResponse = await response.json();
  return data;
};

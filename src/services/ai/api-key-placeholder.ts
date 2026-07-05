const PLACEHOLDER_API_KEYS = new Set([
  "sk-...",
  "sk-ant-...",
  "gsk_...",
  "your-api-key",
  "your api key",
  "replace-with-your-api-key",
]);

export function isPlaceholderApiKey(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  return PLACEHOLDER_API_KEYS.has(value.trim().toLowerCase());
}

export function allowsMissingApiKey(apiUrl: string | undefined): boolean {
  if (!apiUrl) {
    return false;
  }

  try {
    const url = new URL(apiUrl);
    return ["localhost", "127.0.0.1", "::1", "0.0.0.0"].includes(url.hostname);
  } catch {
    return false;
  }
}

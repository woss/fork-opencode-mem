import type { ProviderConfig } from "./providers/base-provider.js";
import { isPlaceholderApiKey } from "./api-key-placeholder.js";

interface MemoryProviderRuntimeConfig {
  memoryModel?: string;
  memoryApiUrl?: string;
  memoryApiKey?: string;
  memoryTemperature?: number | false;
  memoryExtraParams?: Record<string, unknown>;
  autoCaptureMaxIterations?: number;
  autoCaptureIterationTimeout?: number;
}

interface ProviderConfigOverrides {
  maxIterations?: number;
  iterationTimeout?: number;
}

export function buildMemoryProviderConfig(
  config: MemoryProviderRuntimeConfig,
  overrides: ProviderConfigOverrides = {}
): ProviderConfig {
  const memoryModel = config.memoryModel;
  const memoryApiUrl = config.memoryApiUrl;

  if (!memoryModel || !memoryApiUrl) {
    const missingFields: string[] = [];
    if (!memoryModel) missingFields.push("memoryModel");
    if (!memoryApiUrl) missingFields.push("memoryApiUrl");

    throw new Error(
      `External API not configured for memory provider: missing ${missingFields.join(", ")}`
    );
  }

  if (isPlaceholderApiKey(config.memoryApiKey)) {
    throw new Error(
      "External API not configured for memory provider: replace the placeholder memoryApiKey value"
    );
  }

  if (!config.memoryApiKey) {
    throw new Error("External API not configured for memory provider: missing memoryApiKey");
  }

  return {
    model: memoryModel,
    apiUrl: memoryApiUrl,
    apiKey: config.memoryApiKey,
    memoryTemperature: config.memoryTemperature,
    extraParams: config.memoryExtraParams,
    maxIterations: overrides.maxIterations ?? config.autoCaptureMaxIterations,
    iterationTimeout: overrides.iterationTimeout ?? config.autoCaptureIterationTimeout,
  };
}

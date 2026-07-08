import { describe, expect, it } from "bun:test";
import { getHostClientConfig } from "../src/services/ai/opencode-host-config.js";

function sdkService(config: Record<string, unknown>): Record<string, unknown> {
  return {
    _client: {
      getConfig: () => config,
    },
  };
}

function pluginInput(client: Record<string, unknown>): {
  readonly client: Record<string, unknown>;
} {
  return {
    client,
  };
}

describe("OpenCode host client config", () => {
  it("extracts host fetch from nested SDK service clients", () => {
    const hostFetch = globalThis.fetch;
    const ctx = pluginInput({
      session: sdkService({ baseUrl: "http://localhost:4096", fetch: hostFetch }),
      provider: { list: async () => ({ data: { connected: [] } }) },
    });

    expect(getHostClientConfig(ctx)).toEqual({
      baseUrl: "http://localhost:4096",
      fetch: hostFetch,
    });
  });
});

import { defineFunction } from "@aws-amplify/backend";

/**
 * Proxy to yellowscribe.link (Tabletop Simulator army codes). The browser cannot call it directly (CORS),
 * so the Lambda fetches an uploaded army by code and posts the edited army back. One function, two operations.
 */
export const yellowscribe = defineFunction({
  name: "yellowscribe",
  entry: "./handler.ts",
  runtime: 22,
  timeoutSeconds: 15,
  memoryMB: 128,
});

import type { Config } from "./types.ts";

declare global {
  var config: Config;
}

// biome-ignore lint/complexity/noUselessEmptyExport: off
export {};

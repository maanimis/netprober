import type { Stats } from "./types.js";

export const stats: Stats = {
  totalHosts: 0,
  doneHosts: 0,
  totalIps: 0,
  doneIps: 0,
  pingUp: 0,
  ports: 0,
  curlOk: 0,
  dnsFail: 0,
  startTime: Date.now(),
};

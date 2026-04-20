import { buildIPLine, buildSummary, clearSummary } from "./display.js";
import { appendLine } from "./fileio.js";
import { detectProvider, expandCIDR, isCIDR } from "./hostutil.js";
import { Mutex } from "./mutex.js";
import {
  curlCheckDomain,
  curlCheckIP,
  digIPs,
  pingIP,
  socketCheck,
} from "./network.js";
import type { Semaphore } from "./semaphore.js";
import { stats } from "./stats.js";
import { genPingText, genPortText } from "./template.js";
import type { HostResult, IPResult, TextGenerator } from "./types.js";

const printMutex = new Mutex();

async function saveRealtimeIP(
  result: IPResult,
  outputFile: string,
  fn: TextGenerator,
  status: boolean,
): Promise<void> {
  if (!status) return;
  const line = fn(result);
  await appendLine(outputFile, line);
}

async function emitIPLine(result: IPResult): Promise<void> {
  if (!globalThis.config.verbose && !result.pingOk && !result.ports.length)
    return;
  await printMutex.run(async () => {
    clearSummary();
    process.stdout.write(`${buildIPLine(result)}\n`);
    process.stdout.write(`${buildSummary(stats)}\n`);
  });
}

async function refreshSummary(): Promise<void> {
  await printMutex.run(async () => {
    clearSummary();
    process.stdout.write(`${buildSummary(stats)}\n`);
  });
}

async function probeIP(
  ip: string,
  host: string,
  cidr: boolean,
  semaphore: Semaphore,
): Promise<IPResult> {
  const result: IPResult = {
    host,
    ip,
    provider: detectProvider(ip),
    pingOk: false,
    ports: [],
    curlOk: false,
    curlHttp: "",
    curlInfo: "",
  };

  if (globalThis.config.ping) {
    result.pingOk = await semaphore.run(() => pingIP(ip));
    if (result.pingOk) stats.pingUp++;

    await saveRealtimeIP(
      result,
      globalThis.config.outputPing,
      genPingText,
      result.pingOk,
    );
  }

  result.ports = await semaphore.run(() => socketCheck(result));
  if (result.ports) stats.ports++;

  await saveRealtimeIP(
    result,
    globalThis.config.outputPorts,
    genPortText,
    Boolean(result.ports.length),
  );

  if (globalThis.config.curl) {
    const curl = await semaphore.run(() =>
      cidr ? curlCheckIP(ip) : curlCheckDomain(host, ip),
    );
    result.curlOk = curl.ok;
    result.curlHttp = curl.code;
    result.curlInfo = curl.info;
    if (result.curlOk) stats.curlOk++;
  }

  stats.doneIps++;
  await emitIPLine(result);

  return result;
}

export async function processHost(
  host: string,
  semaphore: Semaphore,
): Promise<HostResult> {
  const result: HostResult = { host, ips: [], digErr: "" };
  const cidr = isCIDR(host);

  const ips = cidr ? expandCIDR(host) : await semaphore.run(() => digIPs(host));

  if (!ips.length) {
    result.digErr = cidr ? "invalid CIDR" : "no IPs resolved";
    stats.doneHosts++;
    stats.dnsFail++;
    await refreshSummary();
    return result;
  }

  stats.totalIps += ips.length;
  await refreshSummary();

  result.ips = await Promise.all(
    ips.map((ip) => probeIP(ip, host, cidr, semaphore)),
  );

  stats.doneHosts++;
  await refreshSummary();
  return result;
}

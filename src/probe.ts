import {
  buildIPLine,
  buildSummary,
  clearSummary,
} from "./display.js";
import { appendLine } from "./fileio.js";
import { expandCIDR, isCIDR } from "./hostutil.js";
import { Mutex } from "./mutex.js";
import {
  curlCheckDomain,
  curlCheckIP,
  digIPs,
  pingIP,
  socketCheck443,
} from "./network.js";
import type { Semaphore } from "./semaphore.js";
import { stats } from "./stats.js";
import type { Config, HostResult, IPResult } from "./types.js";

const printMutex = new Mutex();

async function saveRealtimeIP(
  ip: string,
  pingOk: boolean,
  port443Ok: boolean,
  config: Config,
): Promise<void> {
  if (pingOk) await appendLine(config.outputPing, `${ip}\n`);
  if (port443Ok) await appendLine(config.outputPorts, `${ip}\n`);
}

async function logIPToFile(
  host: string,
  result: IPResult,
  config: Config,
): Promise<void> {
  if (!config.verbose && !result.pingOk && !result.port443Ok) return;
  const curlFlag = result.curlOk
    ? "HTTPS-OK"
    : result.curlHttp
      ? "HTTPS-FAIL"
      : config.curl
        ? "HTTPS-SKIP"
        : "HTTPS-OFF";
  const pingPart = config.ping
    ? `  ${result.pingOk ? "ping=UP" : "ping=DOWN"}`
    : "";
  const line =
    `[${host}] ${result.ip}${pingPart}` +
    `  ${result.port443Ok ? "443=OPEN" : "443=CLOSED"}` +
    `  ${curlFlag}  ${result.curlHttp || "curl-n/a"}\n`;
  await appendLine(config.outputFile, line);
}

async function emitIPLine(
  host: string,
  result: IPResult,
  config: Config,
): Promise<void> {
  if (!config.verbose && !result.pingOk && !result.port443Ok) return;
  await printMutex.run(async () => {
    clearSummary();
    process.stdout.write(buildIPLine(host, result, config) + "\n");
    process.stdout.write(buildSummary(stats, config) + "\n");
  });
}

async function refreshSummary(config: Config): Promise<void> {
  await printMutex.run(async () => {
    clearSummary();
    process.stdout.write(buildSummary(stats, config) + "\n");
  });
}

async function probeIP(
  ip: string,
  host: string,
  cidr: boolean,
  semaphore: Semaphore,
  config: Config,
): Promise<IPResult> {
  const result: IPResult = {
    ip,
    pingOk: false,
    port443Ok: false,
    curlOk: false,
    curlHttp: "",
    curlInfo: "",
  };

  if (config.ping) {
    result.pingOk = await semaphore.run(() => pingIP(ip, config));
    if (result.pingOk) stats.pingUp++;
  }

  result.port443Ok = await semaphore.run(() =>
    socketCheck443(ip, config.timeout),
  );
  if (result.port443Ok) stats.port443Ok++;

  await saveRealtimeIP(ip, result.pingOk, result.port443Ok, config);

  if (config.curl) {
    const curl = await semaphore.run(() =>
      cidr
        ? curlCheckIP(ip, config.timeout)
        : curlCheckDomain(host, ip, config.timeout),
    );
    result.curlOk = curl.ok;
    result.curlHttp = curl.code;
    result.curlInfo = curl.info;
    if (result.curlOk) stats.curlOk++;
  }

  stats.doneIps++;
  await logIPToFile(host, result, config);
  await emitIPLine(host, result, config);

  return result;
}

export async function processHost(
  host: string,
  semaphore: Semaphore,
  config: Config,
): Promise<HostResult> {
  const result: HostResult = { host, ips: [], digErr: "" };
  const cidr = isCIDR(host);

  const ips = cidr
    ? expandCIDR(host)
    : await semaphore.run(() => digIPs(host, config.resolver));

  if (!ips.length) {
    result.digErr = cidr ? "invalid CIDR" : "no IPs resolved";
    stats.doneHosts++;
    stats.dnsFail++;
    await refreshSummary(config);
    return result;
  }

  stats.totalIps += ips.length;
  await refreshSummary(config);

  result.ips = await Promise.all(
    ips.map((ip) => probeIP(ip, host, cidr, semaphore, config)),
  );

  stats.doneHosts++;
  await refreshSummary(config);
  return result;
}

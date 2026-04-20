import dns from "node:dns/promises";
import { exec } from "node:child_process";
import * as net from "node:net";
import { promisify } from "node:util";
import type { IPResult } from "./types.js";

const execAsync = promisify(exec);

async function run(
  cmd: string,
  timeoutMs: number,
): Promise<{ code: number; stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await Promise.race([
      execAsync(cmd, { timeout: timeoutMs }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), timeoutMs),
      ),
    ]);
    return { code: 0, stdout, stderr };
  } catch (err: unknown) {
    const e = err as { code?: number; stdout?: string; stderr?: string };
    return {
      code: e.code ?? -1,
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? "timeout",
    };
  }
}

export async function digIPs(host: string): Promise<string[]> {
  const resolverObj = new dns.Resolver();
  resolverObj.setServers([globalThis.config.resolver]);

  try {
    const [aRecords, aaaaRecords] = await Promise.allSettled([
      resolverObj.resolve4(host),
      resolverObj.resolve6(host),
    ]);

    const ips: string[] = [];

    if (aRecords.status === "fulfilled") {
      ips.push(...aRecords.value);
    }
    if (aaaaRecords.status === "fulfilled") {
      ips.push(...aaaaRecords.value);
    }

    return ips.map((ip) => ip.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export async function pingIP(ip: string): Promise<boolean> {
  const timeout = globalThis.config.timeout * globalThis.config.pingCount + 5;
  const { code } = await run(
    `ping -c ${globalThis.config.pingCount} -W ${globalThis.config.timeout} ${ip}`,
    timeout * 1_000,
  );
  return code === 0;
}

function checkPort(
  timeoutMs: number,
  ip: string,
  port: number,
): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timer = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, timeoutMs);

    socket
      .once("connect", () => {
        clearTimeout(timer);
        socket.destroy();
        resolve(true);
      })
      .once("error", () => {
        clearTimeout(timer);
        resolve(false);
      })
      .connect(port, ip);
  });
}

export async function socketCheck(
  data: Pick<IPResult, "ip">,
): Promise<number[]> {
  const timeoutMs = globalThis.config.timeout * 1_000;

  const result: number[] = [];
  for (const port of globalThis.config.ports) {
    const isOpen = await checkPort(timeoutMs, data.ip, port);
    if (isOpen) result.push(port);
  }

  return result;
}

function parseCurlResponse(
  stdout: string,
  stderr: string,
): { ok: boolean; code: string; info: string } {
  const code = stdout.trim();
  const info =
    stderr
      .split("\n")
      .find((l) => l.includes("Connected to") || l.includes("SSL connection"))
      ?.trim()
      .replace(/^\*\s*/, "") ?? "";
  const ok = /^[23]/.test(code);
  return { ok, code, info };
}

export async function curlCheckDomain(
  domain: string,
  ip: string,
): Promise<{ ok: boolean; code: string; info: string }> {
  const {
    code: rc,
    stdout,
    stderr,
  } = await run(
    `curl -kv -s -o /dev/null --write-out "%{http_code}" --max-time ${globalThis.config.timeout} https://${domain} --connect-to ${domain}:443:${ip}`,
    (globalThis.config.timeout + 5) * 1_000,
  );
  const parsed = parseCurlResponse(stdout, stderr);
  return { ...parsed, ok: rc === 0 && parsed.ok };
}

export async function curlCheckIP(
  ip: string,
): Promise<{ ok: boolean; code: string; info: string }> {
  const {
    code: rc,
    stdout,
    stderr,
  } = await run(
    `curl -kv -s -o /dev/null --write-out "%{http_code}" --max-time ${globalThis.config.timeout} http://${ip}`,
    (globalThis.config.timeout + 5) * 1_000,
  );
  const parsed = parseCurlResponse(stdout, stderr);
  return { ...parsed, ok: rc === 0 && parsed.ok };
}

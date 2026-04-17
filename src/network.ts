import dns from "node:dns/promises";
import { exec } from "node:child_process";
import * as net from "node:net";
import { promisify } from "node:util";
import type { Config } from "./types.js";

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

export async function digIPs(
  host: string,
  resolver: string,
): Promise<string[]> {
  const resolverObj = new dns.Resolver();
  resolverObj.setServers([resolver]);

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

export async function pingIP(ip: string, cfg: Config): Promise<boolean> {
  const timeout = cfg.timeout * cfg.pingCount + 5;
  const { code } = await run(
    `ping -c ${cfg.pingCount} -W ${cfg.timeout} ${ip}`,
    timeout * 1_000,
  );
  return code === 0;
}

export async function socketCheck443(
  ip: string,
  timeout: number,
): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timer = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, timeout * 1_000);

    socket
      .connect(443, ip, () => {
        clearTimeout(timer);
        socket.destroy();
        resolve(true);
      })
      .on("error", () => {
        clearTimeout(timer);
        resolve(false);
      });
  });
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
  timeout: number,
): Promise<{ ok: boolean; code: string; info: string }> {
  const {
    code: rc,
    stdout,
    stderr,
  } = await run(
    `curl -kv -s -o /dev/null --write-out "%{http_code}" --max-time ${timeout} https://${domain} --connect-to ${domain}:443:${ip}`,
    (timeout + 5) * 1_000,
  );
  const parsed = parseCurlResponse(stdout, stderr);
  return { ...parsed, ok: rc === 0 && parsed.ok };
}

export async function curlCheckIP(
  ip: string,
  timeout: number,
): Promise<{ ok: boolean; code: string; info: string }> {
  const {
    code: rc,
    stdout,
    stderr,
  } = await run(
    `curl -kv -s -o /dev/null --write-out "%{http_code}" --max-time ${timeout} http://${ip}`,
    (timeout + 5) * 1_000,
  );
  const parsed = parseCurlResponse(stdout, stderr);
  return { ...parsed, ok: rc === 0 && parsed.ok };
}

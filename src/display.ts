import chalk from "chalk";
import type { Config, IPResult, Stats } from "./types.js";

const WIDTH = 70;

export const SUMMARY_LINES = 10;

function elapsed(start: number): string {
  const s = (Date.now() - start) / 1_000;
  return s < 60
    ? `${s.toFixed(1)}s`
    : `${Math.floor(s / 60)}m ${Math.floor(s % 60)}s`;
}

function bar(done: number, total: number, width = 26): string {
  const filled = total ? Math.round((width * done) / total) : 0;
  return (
    chalk.green("█".repeat(filled)) + chalk.dim("░".repeat(width - filled))
  );
}

function pct(done: number, total: number): string {
  return total ? `${Math.round((100 * done) / total)}%` : "0%";
}

function icon(ok: boolean): string {
  return ok ? chalk.green("✔") : chalk.red("✘");
}

function sep(): string {
  return chalk.bold.cyan("━".repeat(WIDTH));
}

export function buildSummary(stats: Stats, cfg: Config, final = false): string {
  const label = final ? "Final  Summary" : "Live   Summary";
  const { doneIps: done, totalIps: total } = stats;

  const pingLine = cfg.ping
    ? `  ${chalk.blue("IPs     ")}  found ${chalk.bold(total)}   ${chalk.green(`ping-up ${stats.pingUp}`)}   ${chalk.red(`down ${total - stats.pingUp}`)}`
    : `  ${chalk.blue("IPs     ")}  found ${chalk.bold(total)}`;

  const curlLine = cfg.curl
    ? `  ${chalk.blue("HTTPS   ")}  ${chalk.green(`✔ ok ${stats.curlOk}`)}   ${chalk.red(`✘ fail ${stats.pingUp - stats.curlOk}`)}`
    : `  ${chalk.blue("HTTPS   ")}  ${chalk.dim("skipped (use --curl)")}`;

  const lines = [
    sep(),
    `  ${chalk.bold.cyan(label)}`,
    sep(),
    `  ${chalk.blue("Progress")}  ${bar(done, total)}  ${chalk.cyan(`${done}/${total} IPs`)}  ${chalk.dim(`${pct(done, total)}  ${elapsed(stats.startTime)}`)}`,
    `  ${chalk.blue("Hosts   ")}  total ${chalk.bold(stats.totalHosts)}   done ${chalk.bold(stats.doneHosts)}   dns-fail ${chalk.red(stats.dnsFail)}`,
    pingLine,
    `  ${chalk.blue("Port 443")}  ${chalk.green(`✔ open ${stats.port443Ok}`)}   ${chalk.red(`✘ closed ${total - stats.port443Ok}`)}`,
    curlLine,
    sep(),
    "",
  ];
  return lines.join("\n");
}

export function buildIPLine(host: string, r: IPResult, cfg: Config): string {
  const codeColor = r.curlOk ? chalk.green : chalk.red;
  const info = r.curlInfo ? `  ${chalk.dim(r.curlInfo)}` : "";
  const pingPart = cfg.ping ? `  ping ${icon(r.pingOk)}` : "";
  const curlPart = cfg.curl
    ? r.curlHttp
      ? `  curl ${icon(r.curlOk)}  HTTP ${codeColor(r.curlHttp)}${info}`
      : `  ${chalk.dim("curl n/a")}`
    : "";

  return (
    `  ${chalk.cyan(r.ip.padEnd(20))}` +
    `  ${chalk.dim(host.padEnd(32))}` +
    pingPart +
    `  443 ${icon(r.port443Ok)}` +
    curlPart
  );
}

export function clearSummary(): void {
  process.stdout.write(`\x1b[${SUMMARY_LINES}A\x1b[J`);
}

export function printHeader(hosts: number, mode: string): void {
  console.log(
    chalk.dim(
      `Checking ${chalk.bold(hosts)} host(s)  ·  mode=${chalk.bold(mode)}  ·  results appear above the summary\n`,
    ),
  );
}

export function printInitialSummary(stats: Stats, cfg: Config): void {
  process.stdout.write(buildSummary(stats, cfg) + "\n");
}

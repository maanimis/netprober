import chalk from "chalk";
import type { IPResult, Stats } from "./types.js";

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

export function buildSummary(stats: Stats, final = false): string {
  const label = final ? "Final  Summary" : "Live   Summary";
  const { doneIps: done, totalIps: total } = stats;

  const pingLine = globalThis.config.ping
    ? `  ${chalk.blue("IPs".padEnd(9))}  found ${chalk.bold(total)}   ${chalk.green(`ping-up ${stats.pingUp}`)}   ${chalk.red(`down ${total - stats.pingUp}`)}`
    : `  ${chalk.blue("IPs".padEnd(9))}  found ${chalk.bold(total)}`;

  const curlLine = globalThis.config.curl
    ? `  ${chalk.blue("HTTPS".padEnd(9))}  ${chalk.green(`✔ ok ${stats.curlOk}`)}   ${chalk.red(`✘ fail ${stats.pingUp - stats.curlOk}`)}`
    : `  ${chalk.blue("HTTPS".padEnd(9))}  ${chalk.dim("skipped (use --curl)")}`;

  const lines = [
    sep(),
    `  ${chalk.bold.cyan(label)}`,
    sep(),
    `  ${chalk.blue("Progress".padEnd(9))}  ${bar(done, total)}  ${chalk.cyan(`${done}/${total} IPs`)}  ${chalk.dim(`${pct(done, total)}  ${elapsed(stats.startTime)}`)}`,
    `  ${chalk.blue("Hosts".padEnd(9))}  total ${chalk.bold(stats.totalHosts)}   done ${chalk.bold(stats.doneHosts)}   dns-fail ${chalk.red(stats.dnsFail)}`,
    pingLine,
    `  ${chalk.blue("Port".padEnd(9))}  ${chalk.green(`✔ open ${stats.ports}`)}   ${chalk.red(`✘ closed ${total - stats.ports}`)}`,
    curlLine,
    sep(),
    "",
  ];
  return lines.join("\n");
}

export function buildIPLine(result: IPResult): string {
  const codeColor = result.curlOk ? chalk.green : chalk.red;
  const info = result.curlInfo ? `  ${chalk.dim(result.curlInfo)}` : "";
  const pingPart = globalThis.config.ping
    ? `  ping ${icon(result.pingOk)}`
    : "";
  const curlPart = globalThis.config.curl
    ? result.curlHttp
      ? `  curl ${icon(result.curlOk)}  HTTP ${codeColor(result.curlHttp)}${info}`
      : `  ${chalk.dim("curl n/a")}`
    : "";

  return (
    `  ${chalk.cyan(result.ip.padEnd(30))}` +
    `  ${chalk.white(result.host.padEnd(25))}` +
    `  ${chalk.dim(result.provider.padEnd(10))}` +
    pingPart +
    `  ${result.ports.join(",")}` +
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

export function printInitialSummary(stats: Stats): void {
  process.stdout.write(`${buildSummary(stats)}\n`);
}

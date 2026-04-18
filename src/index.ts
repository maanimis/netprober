#!/usr/bin/env node

import chalk from "chalk";
import { Command, Option } from "commander";
import { existsSync } from "node:fs";
import { appendFile, readFile } from "node:fs/promises";
import {
  buildSummary,
  clearSummary,
  printHeader,
  printInitialSummary,
} from "./display.js";
import { sanitizeHost } from "./hostutil.js";
import { processHost } from "./probe.js";
import { Semaphore } from "./semaphore.js";
import { stats } from "./stats.js";
import type { Config } from "./types.js";

function makeConfig(opts: Record<string, unknown>): Config {
  return {
    inputFile: opts.input as string,
    outputPing: opts.outputPing as string,
    outputPorts: opts.outputPorts as string,
    resolver: opts.resolver as string,
    concurrency: Number(opts.concurrency),
    timeout: Number(opts.timeout),
    pingCount: Number(opts.pingCount),
    verbose: Boolean(opts.verbose),
    ping: Boolean(opts.ping),
    curl: Boolean(opts.curl),
  };
}

function modeString(): string {
  const flags: string[] = [];
  if (globalThis.config.ping) flags.push("ping");
  if (globalThis.config.curl) flags.push("curl");
  flags.push("port443");
  if (globalThis.config.verbose) flags.push("verbose");
  return flags.join("+");
}

async function initOutputFiles(mode: string): Promise<void> {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  const header = `\n\n# Generated: ${ts}  mode=${mode}\n\n`;
  for (const file of [
    globalThis.config.outputPing,
    globalThis.config.outputPorts,
  ]) {
    await appendFile(file, header, "utf-8");
  }
}

async function loadHosts(inputFile: string): Promise<string[]> {
  if (!existsSync(inputFile)) {
    console.error(chalk.red(`Error: '${inputFile}' not found.`));
    process.exit(1);
  }
  const raw = await readFile(inputFile, "utf-8");
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map(sanitizeHost)
    .filter(Boolean);
}

const program = new Command();

program
  .name("netprobe")
  .description("Async host/IP prober — DNS resolution, port 443, ping, curl")
  .version("1.0.0")
  .addOption(
    new Option("-i, --input <file>", "input hosts file").default("hosts.txt"),
  )
  .addOption(
    new Option("-o, --output <file>", "main output file").default(
      "valid_ips.txt",
    ),
  )
  .addOption(
    new Option("--output-ping <file>", "ping-up IPs output").default(
      "ping_up.txt",
    ),
  )
  .addOption(
    new Option("--output-ports <file>", "port-open IPs output").default(
      "ports_open.txt",
    ),
  )
  .addOption(
    new Option("-r, --resolver <ip>", "DNS resolver").default("127.0.0.1"),
  )
  .addOption(
    new Option("-c, --concurrency <n>", "concurrent workers").default("10"),
  )
  .addOption(
    new Option("-t, --timeout <s>", "per-check timeout in seconds").default(
      "5",
    ),
  )
  .addOption(new Option("--ping-count <n>", "ping packet count").default("3"))
  .addOption(new Option("--ping", "enable ICMP ping checks").default(false))
  .addOption(new Option("--curl", "enable HTTPS curl checks").default(false))
  .addOption(
    new Option("-v, --verbose", "show all IPs, not just up ones").default(
      false,
    ),
  )
  .action(async (opts) => {
    globalThis.config = makeConfig(opts);
    const hosts = await loadHosts(globalThis.config.inputFile);

    if (!hosts.length) {
      console.log(
        chalk.yellow(`No hosts found in ${globalThis.config.inputFile}.`),
      );
      process.exit(0);
    }

    stats.totalHosts = hosts.length;
    stats.startTime = Date.now();

    const mode = modeString();
    await initOutputFiles(mode);

    printHeader(hosts.length, mode);
    printInitialSummary(stats);

    const semaphore = new Semaphore(globalThis.config.concurrency);
    await Promise.all(hosts.map((h) => processHost(h, semaphore)));

    clearSummary();
    process.stdout.write(`${buildSummary(stats, true)}\n`);
  });

program.parse(process.argv);

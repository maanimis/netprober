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
import { readFileSync } from "node:fs";

const pkg = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf-8"),
);

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
    ports: parsePorts(opts.ports as string),
  };
}

function modeString(): string {
  const flags: string[] = [];
  if (globalThis.config.ping) flags.push("ping");
  if (globalThis.config.curl) flags.push("curl");
  flags.push(`ports ${globalThis.config.ports}`);
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

function parsePorts(value: string): number[] {
  const ports = new Set<number>();

  const parts = value.split(",");

  for (const part of parts) {
    const trimmed = part.trim();

    // Range support: 8000-8100
    if (trimmed.includes("-")) {
      const [startStr, endStr] = trimmed.split("-").map((v) => v.trim());

      const start = Number(startStr);
      const end = Number(endStr);

      if (!Number.isInteger(start) || !Number.isInteger(end)) {
        throw new Error(`Invalid port range: ${trimmed}`);
      }

      if (start > end) {
        throw new Error(`Invalid range (start > end): ${trimmed}`);
      }

      for (let p = start; p <= end; p++) {
        validatePort(p);
        ports.add(p);
      }

      continue;
    }

    // Single port
    const port = Number(trimmed);

    if (!Number.isInteger(port)) {
      throw new Error(`Invalid port: ${trimmed}`);
    }

    validatePort(port);
    ports.add(port);
  }
  return [...ports];
}

function validatePort(port: number) {
  if (port < 1 || port > 65535) {
    throw new Error(`Port out of range (1-65535): ${port}`);
  }
}

const program = new Command();

program
  .name(pkg.name)
  .description(pkg.description)
  .version(pkg.version)
  .addOption(
    new Option("-i, --input <file>", "input hosts file").default("hosts.txt"),
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
  .addOption(
    new Option("-p, --ports <ports>", "ports (e.g. 80,443,8000-8100)").default(
      "443",
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

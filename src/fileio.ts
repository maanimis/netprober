import { existsSync } from "node:fs";
import { appendFile, readFile, writeFile } from "node:fs/promises";

export async function appendLine(file: string, line: string): Promise<void> {
  await appendFile(file, line, "utf-8");
}

export async function writeLines(file: string, lines: string[]): Promise<void> {
  await writeFile(file, lines.join("\n"), "utf-8");
}

export async function readLines(file: string): Promise<string[]> {
  if (!existsSync(file)) return [];
  const content = await readFile(file, "utf-8");
  return content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
}

export async function collectValidIPs(
  pingFile: string,
  portsFile: string,
): Promise<string[]> {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const file of [pingFile, portsFile]) {
    const lines = await readLines(file);
    for (const ip of lines) {
      if (!seen.has(ip)) {
        seen.add(ip);
        result.push(ip);
      }
    }
  }
  return result;
}

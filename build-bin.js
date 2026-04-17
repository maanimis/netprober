import { execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url)));
const version = pkg.version;
const name = pkg.name;

const targets = [
//   ["bun-darwin-x64", "darwin-x64"],
//   ["bun-darwin-arm64", "darwin-arm64"],
//   ["bun-windows-arm64", "win-arm64"],
//   ["bun-windows-x64", "win-x64"],
//   ["bun-linux-arm64", "linux-arm64"],
  ["bun-linux-x64", "linux-x64"],
];

if (!existsSync("./bin")) {
  mkdirSync("./bin", { recursive: true });
}

for (const [target, platform] of targets) {
  const outfile = `./bin/${name}-v${version}-${platform}`;
  const cmd = [
    "bun build",
    "--compile",
    "--production",
    `--target=${target}`,
    "--minify",
    "--define:process.env.VERSION='\"" + version + "\"'",
    "./src/index.ts",
    `--outfile=${outfile}`,
  ].join(" ");

  console.log(`\n→ Building ${target}...`);
  execSync(cmd, { stdio: "inherit" });
}

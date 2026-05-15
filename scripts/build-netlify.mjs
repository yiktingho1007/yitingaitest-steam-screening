import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.dirname(__dirname);
const distDir = path.join(repoRoot, "dist");

const publicFiles = [
  "prototype/index.html",
  "prototype/styles.css",
  "prototype/app.js",
  "prototype/mock-data.js"
];

async function main() {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });

  for (const relativeFile of publicFiles) {
    const source = path.join(repoRoot, relativeFile);
    const destination = path.join(distDir, path.basename(relativeFile));
    await cp(source, destination);
  }
}

await main();

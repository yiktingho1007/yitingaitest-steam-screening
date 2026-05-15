import { cp, mkdir, rm, writeFile } from "node:fs/promises";
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
  await mkdir(path.join(distDir, "cloud-functions", "_runtime"), { recursive: true });

  for (const relativeFile of publicFiles) {
    const source = path.join(repoRoot, relativeFile);
    const destination = path.join(distDir, path.basename(relativeFile));
    await cp(source, destination);
  }

  await cp(
    path.join(repoRoot, "cloud-functions"),
    path.join(distDir, "cloud-functions"),
    { recursive: true }
  );

  await cp(
    path.join(repoRoot, "prototype", "llm-analysis.js"),
    path.join(distDir, "cloud-functions", "_runtime", "llm-analysis.js")
  );
  await cp(
    path.join(repoRoot, "prototype", "live-steam-data.js"),
    path.join(distDir, "cloud-functions", "_runtime", "live-steam-data.js")
  );

  await writeFile(
    path.join(distDir, "package.json"),
    JSON.stringify(
      {
        name: "steam-screening-edgeone-dist",
        private: true,
        type: "module"
      },
      null,
      2
    ) + "\n",
    "utf8"
  );
}

await main();

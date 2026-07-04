import { unlinkSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));

for (const name of ["package-lock.json", "yarn.lock"]) {
  try {
    unlinkSync(join(root, name));
  } catch (err) {
    if (err?.code !== "ENOENT") throw err;
  }
}

const ua = process.env.npm_config_user_agent ?? "";
if (!ua.includes("pnpm/")) {
  console.error("Use pnpm instead of npm/yarn to install this project.");
  process.exit(1);
}

import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const dist = "dist";

function run(command, options = {}) {
  console.log(`$ ${command}`);
  execSync(command, { stdio: "inherit", ...options });
}

const repoBasePath =
  process.env.NEXT_PUBLIC_PAGES_BASE_PATH || "/cnn-study-daliy";

function copyApp(appName, target, basePath) {
  const appDir = path.join("apps", appName);
  run("pnpm build", {
    cwd: appDir,
    env: {
      ...process.env,
      NEXT_PUBLIC_BASE_PATH: basePath,
      NEXT_OUTPUT_EXPORT: "true",
    },
  });
  cpSync(path.join(appDir, "out"), path.join(dist, target), {
    recursive: true,
  });
}

function copySharedPublic(target) {
  const targetDir = path.join(dist, target);
  for (const name of ["data", "audio"]) {
    const source = path.join("public", name);
    if (existsSync(source)) {
      cpSync(source, path.join(targetDir, name), { recursive: true });
    }
  }
}

if (existsSync(dist)) rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

copyApp("english-web", ".", repoBasePath);
copyApp("english-h5", "h5", `${repoBasePath}/h5`);
copySharedPublic(".");
copySharedPublic("h5");
writeFileSync(path.join(dist, ".nojekyll"), "");

console.log(`Built Pages bundle in ${dist}`);

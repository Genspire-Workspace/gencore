import path from "node:path";

const ROOT_DIR = path.resolve(import.meta.dirname, "..");

const ENV_FILES = {
  active: ".env",
  example: ".env.example",
  local: ".env.local.example",
  docker: ".env.local.docker.example",
};

const PROFILE_TO_FILE = {
  example: ENV_FILES.example,
  local: ENV_FILES.local,
  docker: ENV_FILES.docker,
};

const SENSITIVE_KEY_PATTERN =
  /(API_KEY|SECRET|TOKEN|PASSWORD|PRIVATE_KEY|ACCESS_KEY)/i;

function resolveRepoPath(relativePath) {
  return path.join(ROOT_DIR, relativePath);
}

async function readText(relativePath) {
  const file = Bun.file(resolveRepoPath(relativePath));

  if (!(await file.exists())) {
    return "";
  }

  return file.text();
}

async function writeText(relativePath, content) {
  await Bun.write(resolveRepoPath(relativePath), content);
}

function parseEnvEntries(content) {
  const entries = [];
  const map = new Map();

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);

    if (!match) {
      continue;
    }

    const [, key, value] = match;

    if (!map.has(key)) {
      const entry = { key, value };
      entries.push(entry);
      map.set(key, entry);
    }
  }

  return {
    entries,
    map,
  };
}

function isSensitiveKey(key) {
  return SENSITIVE_KEY_PATTERN.test(key);
}

function normalizeLineEndings(content) {
  return content.replace(/\r?\n/g, "\n");
}

function maskValue(key, value) {
  if (!isSensitiveKey(key)) {
    return value;
  }

  return "<hidden>";
}

async function syncActiveEnvIntoTemplates() {
  const activeContent = await readText(ENV_FILES.active);

  if (!activeContent.trim()) {
    console.log("Active .env is empty or missing. Nothing to sync.");
    return;
  }

  const active = parseEnvEntries(activeContent);

  for (const targetPath of [
    ENV_FILES.example,
    ENV_FILES.local,
    ENV_FILES.docker,
  ]) {
    const targetContent = await readText(targetPath);
    const target = parseEnvEntries(targetContent);
    const missingEntries = active.entries.filter(
      (entry) => !target.map.has(entry.key),
    );

    if (missingEntries.length === 0) {
      continue;
    }

    let nextContent = normalizeLineEndings(targetContent).trimEnd();

    if (nextContent.length > 0) {
      nextContent += "\n\n";
    }

    nextContent += "# Added automatically from .env. Review and adjust as needed.\n";
    nextContent += missingEntries
      .map((entry) => `${entry.key}=${maskValue(entry.key, entry.value)}`)
      .join("\n");
    nextContent += "\n";

    await writeText(targetPath, nextContent);

    console.log(
      `Synced ${missingEntries.length} missing key(s) into ${targetPath}: ${missingEntries
        .map((entry) => entry.key)
        .join(", ")}`,
    );
  }
}

async function useProfile(profileName) {
  const sourcePath = PROFILE_TO_FILE[profileName];

  if (!sourcePath) {
    throw new Error(
      `Unknown profile '${profileName}'. Use one of: ${Object.keys(PROFILE_TO_FILE).join(", ")}`,
    );
  }

  await syncActiveEnvIntoTemplates();

  const sourceContent = await readText(sourcePath);

  if (!sourceContent.trim()) {
    throw new Error(`Profile file '${sourcePath}' is empty or missing.`);
  }

  await writeText(ENV_FILES.active, sourceContent);
  console.log(`Copied ${sourcePath} -> ${ENV_FILES.active}`);
}

function printHelp() {
  console.log("Env profiles:");
  for (const [profile, file] of Object.entries(PROFILE_TO_FILE)) {
    console.log(`  ${profile.padEnd(7)} ${file}`);
  }
  console.log("");
  console.log("Usage:");
  console.log("  bun run scripts/manage-env.mjs list");
  console.log("  bun run scripts/manage-env.mjs sync");
  console.log("  bun run scripts/manage-env.mjs use local");
  console.log("  bun run scripts/manage-env.mjs use docker");
  console.log("  bun run scripts/manage-env.mjs use example");
}

const [command = "help", value] = process.argv.slice(2);

switch (command) {
  case "list":
    printHelp();
    break;

  case "sync":
    await syncActiveEnvIntoTemplates();
    break;

  case "use":
    if (!value) {
      throw new Error("Missing profile name. Example: bun run scripts/manage-env.mjs use local");
    }

    await useProfile(value);
    break;

  case "help":
  default:
    printHelp();
    break;
}

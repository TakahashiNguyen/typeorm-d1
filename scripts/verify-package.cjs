const { execFileSync } = require("node:child_process");
const { EntitySchema } = require("typeorm");
const { Miniflare } = require("miniflare");

function runNode(args) {
  execFileSync(process.execPath, args, {
    cwd: process.cwd(),
    stdio: "inherit",
  });
}

function getPackFiles() {
  const output = execFileSync("npm", ["pack", "--dry-run", "--json"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  // Extract JSON from output that may contain build logs
  // Try to find valid JSON in the output
  let jsonStr;
  try {
    // First try to parse the entire output as JSON (might work if no build logs)
    jsonStr = output.trim();
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed[0].files.map((file) => file.path);
    }
  } catch (e) {
    // If that fails, try to extract JSON from mixed output
    try {
      // Look for the first valid JSON array in the output
      const lines = output.split('\n');
      let jsonStartLine = -1;
      let jsonEndLine = -1;

      // Find the start of JSON array
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('[')) {
          jsonStartLine = i;
          break;
        }
      }

      // Find the end of JSON array (matching closing bracket)
      if (jsonStartLine !== -1) {
        let bracketCount = 0;
        let foundStart = false;
        for (let i = jsonStartLine; i < lines.length; i++) {
          const line = lines[i];
          for (const char of line) {
            if (char === '[') {
              bracketCount++;
              foundStart = true;
            } else if (char === ']') {
              bracketCount--;
              if (foundStart && bracketCount === 0) {
                jsonEndLine = i;
                break;
              }
            }
          }
          if (jsonEndLine !== -1) break;
        }
      }

      if (jsonStartLine !== -1 && jsonEndLine !== -1) {
        jsonStr = lines.slice(jsonStartLine, jsonEndLine + 1).join('\n');
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed[0].files.map((file) => file.path);
        }
      }
    } catch (e) {
      // Fall through to error
    }
  }

  // Try one more approach - look for lines that contain JSON objects
  try {
    const jsonLines = [];
    let inJson = false;
    for (const line of output.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('[') || inJson) {
        inJson = true;
        jsonLines.push(line);
        if (trimmed.endsWith(']')) {
          inJson = false;
          break;
        }
      }
    }
    if (jsonLines.length > 0) {
      jsonStr = jsonLines.join('\n');
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed[0].files.map((file) => file.path);
      }
    }
  } catch (e) {
    // Fall through to error
  }

  throw new Error(`Could not find valid JSON output in npm pack --dry-run --json. Output preview: ${output.substring(0, 200)}...`);
}

function assertPackageContents(files) {
  const required = [
    "package.json",
    "README.md",
    "LICENSE",
    "ISSUES.md",
    "AGENTS.md",
    "CHANGELOG.md",
    "CONTRIBUTING.md",
    "SECURITY.md",
    "dist/index.cjs",
    "dist/index.mjs",
    "dist/index.d.ts",
  ];

  const forbiddenPrefixes = [
    "coverage/",
    "src/",
    "tests/",
    "scripts/",
    "node_modules/",
  ];

  const forbiddenFiles = [
    "debug-broadcaster.js",
    "debug-subject-executor.js",
    "test-broadcaster.js",
    "vitest.config.ts",
    "jest.config.js",
    "tsconfig.json",
    "tsconfig.test.json",
    "tsup.config.ts",
  ];

  for (const file of required) {
    if (!files.includes(file)) {
      throw new Error(`Package is missing required file: ${file}`);
    }
  }

  for (const file of files) {
    if (forbiddenPrefixes.some((prefix) => file.startsWith(prefix))) {
      throw new Error(`Package includes forbidden path: ${file}`);
    }
    if (forbiddenFiles.includes(file) || file.endsWith(".test.ts") || file.endsWith(".d.ts.map")) {
      throw new Error(`Package includes forbidden file: ${file}`);
    }
  }
}

async function smokeDataSource() {
  const { createD1DataSource } = require("../dist/index.cjs");
  const mf = new Miniflare({
    modules: true,
    script: "export default { fetch() { return new Response('OK') } }",
    d1Databases: { DB: "test-db" },
  });

  try {
    const database = await mf.getD1Database("DB");
    const SmokeUser = new EntitySchema({
      name: "SmokeUser",
      tableName: "smoke_users",
      columns: {
        id: {
          type: Number,
          primary: true,
          generated: true,
        },
        email: {
          type: String,
          unique: true,
        },
      },
    });

    const dataSource = createD1DataSource({
      database,
      entities: [SmokeUser],
      synchronize: true,
      logging: false,
    });

    await dataSource.initialize();
    await dataSource.getRepository("SmokeUser").save({ email: "smoke@example.com" });
    const row = await dataSource.getRepository("SmokeUser").findOneBy({ email: "smoke@example.com" });
    if (!row) {
      throw new Error("Built package DataSource smoke failed to read saved row");
    }
    await dataSource.destroy();
  } finally {
    await mf.dispose();
  }
}

(async () => {
  runNode(["-e", "require('./dist/index.cjs')"]);
  runNode([
    "--input-type=module",
    "-e",
    "import('./dist/index.mjs').then(() => undefined)",
  ]);

  await smokeDataSource();
  assertPackageContents(getPackFiles());
  console.log("Package verification passed");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

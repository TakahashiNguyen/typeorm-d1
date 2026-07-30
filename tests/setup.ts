import "reflect-metadata";
import { Miniflare } from "miniflare";
import { D1Database } from "../src/types";

/**
 * Test setup and teardown for D1 database tests Uses Miniflare to create a
 * local D1 database instance for testing
 */

let mf: Miniflare | undefined;
let db: D1Database | undefined;

export async function getTestDatabase(): Promise<D1Database> {
  if (!mf) {
    mf = new Miniflare({
      modules: true,
      script: `export default { fetch() { return new Response("OK"); } }`,
      d1Databases: { TEST_DB: "test-db" },
    });
  }

  if (!db) {
    db = (await mf.getD1Database("TEST_DB")) as D1Database;

    if (!db) {
      throw new Error("Failed to get D1 database from Miniflare bindings.");
    }
  }

  return db;
}

export async function cleanupDatabase(): Promise<void> {
  if (db) {
    try {
      const tablesResult = await db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND substr(lower(name), 1, 4) != '_cf_'",
        )
        .all<{ name: string }>();

      if (tablesResult.results && tablesResult.results.length > 0) {
        let remainingTables = tablesResult.results.map((t) => t.name);
        let maxRetries = remainingTables.length;

        while (remainingTables.length > 0 && maxRetries > 0) {
          let droppedAny = false;
          const nextRemaining: string[] = [];

          for (const tableName of remainingTables) {
            try {
              await db.prepare(`DROP TABLE IF EXISTS "${tableName}"`).run();
              droppedAny = true;
            } catch (error) {
              nextRemaining.push(tableName);
            }
          }

          remainingTables = nextRemaining;
          if (!droppedAny) {
            break;
          }
          maxRetries--;
        }
      }

      const indices = await db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' AND substr(lower(name), 1, 4) != '_cf_'",
        )
        .all<{ name: string }>();

      if (indices.results) {
        for (const index of indices.results) {
          try {
            await db.prepare(`DROP INDEX IF EXISTS "${index.name}"`).run();
          } catch (error) {}
        }
      }
    } catch (error) {}
  }
}

export async function closeDatabase(): Promise<void> {
  if (mf) {
    await mf.dispose();
    mf = undefined;
    db = undefined;
  }
}

const jestAfterAll = (
  globalThis as { afterAll?: (fn: () => Promise<void>) => void }
).afterAll;
if (typeof jestAfterAll === "function") {
  jestAfterAll(async () => {
    await closeDatabase();
  });
}

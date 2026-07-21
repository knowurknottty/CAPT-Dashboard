import { statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const DEFAULT_DB_PATH = '/capt-data/memory.db';
const DEFAULT_SQLITE_BIN = 'sqlite3';
const MAX_ROWS = 20;

function unavailable(reason, databasePath) {
  return {
    status: 'unavailable',
    reason,
    databasePath,
    observedAt: new Date().toISOString(),
    contentExposed: false,
    aggregates: null,
  };
}

function queryJson(databasePath, sql, sqliteBin) {
  const uri = `file:${databasePath}?mode=ro&immutable=1`;
  const result = spawnSync(sqliteBin, ['-readonly', '-json', uri, sql], {
    encoding: 'utf8',
    timeout: 1_500,
    maxBuffer: 512 * 1024,
    env: { ...process.env, SQLITE_TMPDIR: '/tmp' },
  });

  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error((result.stderr || 'sqlite query failed').trim());
  const output = result.stdout.trim();
  return output ? JSON.parse(output) : [];
}

function epochToIso(value) {
  return Number.isFinite(value) ? new Date(value * 1_000).toISOString() : null;
}

export function readMemoryObservability(options = {}) {
  const databasePath = options.databasePath ?? process.env.CAPT_MEMORY_DB_PATH ?? DEFAULT_DB_PATH;
  const sqliteBin = options.sqliteBin ?? process.env.SQLITE_BIN ?? DEFAULT_SQLITE_BIN;

  try {
    const stat = statSync(databasePath);
    if (!stat.isFile()) return unavailable('configured path is not a regular file', databasePath);
  } catch (error) {
    return unavailable(error?.code === 'ENOENT' ? 'memory database is not mounted' : 'memory database cannot be inspected', databasePath);
  }

  try {
    const schema = queryJson(databasePath, "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('memories','tags') ORDER BY name", sqliteBin);
    if (!schema.some((row) => row.name === 'memories')) return unavailable('memories table is missing', databasePath);

    const [summary = {}] = queryJson(databasePath, `
      SELECT
        COUNT(*) AS totalMemories,
        COUNT(DISTINCT namespace) AS namespaceCount,
        ROUND(COALESCE(AVG(confidence), 0), 4) AS averageConfidence,
        MIN(created_at) AS oldestCreatedAt,
        MAX(updated_at) AS newestUpdatedAt
      FROM memories
    `, sqliteBin);

    const namespaces = queryJson(databasePath, `
      SELECT
        namespace,
        COUNT(*) AS count,
        ROUND(COALESCE(AVG(confidence), 0), 4) AS averageConfidence,
        MAX(updated_at) AS lastUpdatedAt
      FROM memories
      GROUP BY namespace
      ORDER BY count DESC, namespace ASC
      LIMIT ${MAX_ROWS}
    `, sqliteBin).map((row) => ({ ...row, lastUpdatedAt: epochToIso(row.lastUpdatedAt) }));

    const provenance = queryJson(databasePath, `
      SELECT provenance, COUNT(*) AS count
      FROM memories
      GROUP BY provenance
      ORDER BY count DESC, provenance ASC
      LIMIT ${MAX_ROWS}
    `, sqliteBin);

    const tags = schema.some((row) => row.name === 'tags')
      ? queryJson(databasePath, `
          SELECT tag, COUNT(*) AS count
          FROM tags
          GROUP BY tag
          ORDER BY count DESC, tag ASC
          LIMIT ${MAX_ROWS}
        `, sqliteBin)
      : [];

    return {
      status: 'available',
      reason: null,
      databasePath,
      observedAt: new Date().toISOString(),
      contentExposed: false,
      aggregates: {
        totalMemories: Number(summary.totalMemories ?? 0),
        namespaceCount: Number(summary.namespaceCount ?? 0),
        tagCount: tags.reduce((total, row) => total + Number(row.count ?? 0), 0),
        averageConfidence: Number(summary.averageConfidence ?? 0),
        oldestCreatedAt: epochToIso(summary.oldestCreatedAt),
        newestUpdatedAt: epochToIso(summary.newestUpdatedAt),
        namespaces,
        tags,
        provenance,
      },
    };
  } catch (error) {
    return {
      status: 'error',
      reason: error instanceof Error ? error.message : 'unknown SQLite error',
      databasePath,
      observedAt: new Date().toISOString(),
      contentExposed: false,
      aggregates: null,
    };
  }
}

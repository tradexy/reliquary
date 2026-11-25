/**
 * Anchora offline MCP server (JSON-RPC 2.0 over stdio).
 *
 * Exposes verification, preimage inspection, capture coverage and compliance
 * checks directly from @anchora/core with zero network calls and zero extra
 * dependencies.
 */

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { verifyBundleFile, formatReport, jsonReport } from '../verify/verify.js';
import type { BundleFile } from '../verify/verify.js';
import { eventPreimage } from '../../packages/core/src/chain/preimage.js';
import { sha256Hex } from '../../packages/core/src/crypto/hash.js';
import { buildCoverage } from '../../packages/core/src/capture/coverage.js';
import type { KnownRefs } from '../../packages/core/src/capture/coverage.js';
import { evaluateControls } from '../../packages/core/src/evidence/standards.js';
import type { StandardName } from '../../packages/core/src/evidence/standards.js';

export interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string };
}

const DEFAULT_BUNDLE = 'packages/core/data/bundle.json';
const CATALOGUE_TEST = 'packages/core/src/capture/catalogue.test.ts';
const TEST_REF_KEY = 'capture/catalogue.test.ts';

export const MCP_TOOLS = [
  {
    name: 'verify_bundle',
    description:
      'Verify an anchora/1 audit bundle offline: checks format version, SHA-256 chain links, contiguous seqs, Ed25519 seals, anchor digests, and classifies lawful changes separately from tampering.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to bundle JSON file (defaults to packages/core/data/bundle.json).',
        },
        expectFingerprint: {
          type: 'string',
          description: 'Optional expected public-key fingerprint (32 hex chars).',
        },
      },
    },
  },
  {
    name: 'inspect_seq',
    description:
      'Inspect a single AuditEvent by seq, returning its exact canonical preimage, stored hash, and freshly recomputed SHA-256 hash.',
    inputSchema: {
      type: 'object',
      required: ['seq'],
      properties: {
        seq: { type: 'number', description: 'Sequence number (1-based) to inspect.' },
        path: {
          type: 'string',
          description: 'Path to bundle JSON file (defaults to packages/core/data/bundle.json).',
        },
      },
    },
  },
  {
    name: 'check_coverage',
    description:
      'Run the Anchora capture coverage matrix against the test catalogue and report any untested auditable actions.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'check_compliance',
    description:
      'Evaluate SOC 2, ISO 27001, and EU AI Act controls against an anchora/1 bundle and return matching event seqs per control.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to bundle JSON file (defaults to packages/core/data/bundle.json).',
        },
        standard: {
          type: 'string',
          enum: ['SOC 2', 'ISO 27001', 'EU AI Act'],
          description: 'Optional filter for a single compliance standard.',
        },
      },
    },
  },
] as const;

function parseKnownRefsFromTest(source: string): KnownRefs {
  const ids: string[] = [];
  const pattern = /^\s*'([a-z][a-z0-9.]*)':\s*'(?:widening|tightening)'/gm;
  for (const match of source.matchAll(pattern)) {
    if (match[1] !== undefined) ids.push(`${TEST_REF_KEY}#${match[1]}`);
  }
  return new Map([[TEST_REF_KEY, ids]]);
}

function textResult(payload: unknown, isError = false) {
  return {
    content: [{ type: 'text', text: typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2) }],
    isError,
  };
}

async function callTool(name: string, args: Record<string, unknown>, cwd: string) {
  if (name === 'verify_bundle') {
    const rel = typeof args['path'] === 'string' && args['path'].trim() !== '' ? args['path'] : DEFAULT_BUNDLE;
    const expectFingerprint =
      typeof args['expectFingerprint'] === 'string' ? args['expectFingerprint'] : undefined;
    const { result, bundle } = await verifyBundleFile(resolve(cwd, rel), { expectFingerprint });
    return textResult({
      summary: formatReport(result, bundle),
      report: jsonReport(result, bundle),
    });
  }

  if (name === 'inspect_seq') {
    const seq = args['seq'];
    if (typeof seq !== 'number' || !Number.isInteger(seq) || seq < 1) {
      return textResult({ error: 'seq must be a positive integer.' }, true);
    }
    const rel = typeof args['path'] === 'string' && args['path'].trim() !== '' ? args['path'] : DEFAULT_BUNDLE;
    const bundle = JSON.parse(await readFile(resolve(cwd, rel), 'utf8')) as BundleFile;
    const event = bundle.events.find((e) => e.seq === seq);
    if (!event) {
      return textResult({ error: `No event with seq ${seq} in ${rel}.` }, true);
    }
    const preimage = eventPreimage(event);
    const recomputedHash = await sha256Hex(preimage);
    return textResult({
      seq: event.seq,
      event,
      preimage,
      recomputedHash,
      hashMatches: recomputedHash === event.hash,
    });
  }

  if (name === 'check_coverage') {
    const source = await readFile(resolve(cwd, CATALOGUE_TEST), 'utf8');
    const rows = buildCoverage(parseKnownRefsFromTest(source));
    const gaps = rows.filter((r) => !r.tested);
    return textResult({
      total: rows.length,
      failClosed: rows.filter((r) => r.failMode === 'fail-closed').length,
      queued: rows.filter((r) => r.failMode === 'queue').length,
      gapCount: gaps.length,
      gaps,
      rows,
    });
  }

  if (name === 'check_compliance') {
    const rel = typeof args['path'] === 'string' && args['path'].trim() !== '' ? args['path'] : DEFAULT_BUNDLE;
    const bundle = JSON.parse(await readFile(resolve(cwd, rel), 'utf8')) as BundleFile;
    const standard = typeof args['standard'] === 'string' ? (args['standard'] as StandardName) : undefined;
    const all = evaluateControls(bundle.events);
    const controls = standard ? all.filter((c) => c.standard === standard) : all;
    return textResult({
      bundle: rel,
      eventCount: bundle.events.length,
      completeCount: controls.filter((c) => c.complete).length,
      totalControls: controls.length,
      controls,
    });
  }

  return textResult({ error: `Unknown tool: ${name}` }, true);
}

/** Pure JSON-RPC request dispatcher for stdio transport and unit tests. */
export async function handleRequest(
  req: JsonRpcRequest,
  cwd: string = process.cwd(),
): Promise<JsonRpcResponse | null> {
  const id = req.id ?? null;

  if (req.method === 'notifications/initialized') {
    return null;
  }

  if (req.method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'anchora-mcp', version: '0.1.0' },
      },
    };
  }

  if (req.method === 'ping') {
    return { jsonrpc: '2.0', id, result: {} };
  }

  if (req.method === 'tools/list') {
    return { jsonrpc: '2.0', id, result: { tools: MCP_TOOLS } };
  }

  if (req.method === 'tools/call') {
    const params = req.params ?? {};
    const name = typeof params['name'] === 'string' ? params['name'] : '';
    const args =
      typeof params['arguments'] === 'object' && params['arguments'] !== null
        ? (params['arguments'] as Record<string, unknown>)
        : {};
    try {
      const result = await callTool(name, args, cwd);
      return { jsonrpc: '2.0', id, result };
    } catch (err) {
      return {
        jsonrpc: '2.0',
        id,
        result: textResult({ error: err instanceof Error ? err.message : String(err) }, true),
      };
    }
  }

  return {
    jsonrpc: '2.0',
    id,
    error: { code: -32601, message: `Method not found: ${req.method}` },
  };
}

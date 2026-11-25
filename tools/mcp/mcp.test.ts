// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { handleRequest, MCP_TOOLS } from './server.js';

function parseToolJson(res: Awaited<ReturnType<typeof handleRequest>>) {
  const result = res?.result as { content: Array<{ type: string; text: string }>; isError?: boolean };
  return {
    isError: result.isError === true,
    data: JSON.parse(result.content[0]!.text) as Record<string, unknown>,
  };
}

describe('anchora MCP server', () => {
  it('completes initialize handshake and lists all 4 tools', async () => {
    const init = await handleRequest({ jsonrpc: '2.0', id: 1, method: 'initialize' });
    expect(init?.error).toBeUndefined();
    expect((init?.result as { serverInfo: { name: string } }).serverInfo.name).toBe('anchora-mcp');

    const list = await handleRequest({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
    const tools = (list?.result as { tools: typeof MCP_TOOLS }).tools;
    expect(tools.map((t) => t.name)).toEqual([
      'verify_bundle',
      'inspect_seq',
      'check_coverage',
      'check_compliance',
    ]);
  });

  it('verifies clean and doctored bundles via verify_bundle', async () => {
    const clean = await handleRequest({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'verify_bundle', arguments: {} },
    });
    const parsedClean = parseToolJson(clean);
    expect(parsedClean.isError).toBe(false);
    expect((parsedClean.data['report'] as { ok: boolean }).ok).toBe(true);

    const raw = JSON.parse(await readFile(join(process.cwd(), 'packages/core/data/bundle.json'), 'utf8'));
    raw.events[216].detail.decision = 'declined';
    const dir = await mkdtemp(join(tmpdir(), 'anchora-mcp-'));
    const badPath = join(dir, 'tampered.json');
    await writeFile(badPath, JSON.stringify(raw), 'utf8');

    const bad = await handleRequest({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: { name: 'verify_bundle', arguments: { path: badPath } },
    });
    const parsedBad = parseToolJson(bad);
    const report = parsedBad.data['report'] as { ok: boolean; firstDivergence: number | null };
    expect(report.ok).toBe(false);
    expect(report.firstDivergence).toBe(217);
  });

  it('inspects seq 217 with canonical preimage and recomputed hash', async () => {
    const res = await handleRequest({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: { name: 'inspect_seq', arguments: { seq: 217 } },
    });
    const parsed = parseToolJson(res);
    expect(parsed.isError).toBe(false);
    expect(parsed.data['seq']).toBe(217);
    expect(parsed.data['hashMatches']).toBe(true);
    expect(String(parsed.data['preimage'])).toContain('Meridian Holdings');
  });

  it('checks capture coverage with zero gaps and compliance controls', async () => {
    const cov = parseToolJson(
      await handleRequest({
        jsonrpc: '2.0',
        id: 6,
        method: 'tools/call',
        params: { name: 'check_coverage', arguments: {} },
      }),
    );
    expect(cov.data['gapCount']).toBe(0);
    expect(cov.data['total']).toBe(15);

    const comp = parseToolJson(
      await handleRequest({
        jsonrpc: '2.0',
        id: 7,
        method: 'tools/call',
        params: { name: 'check_compliance', arguments: { standard: 'EU AI Act' } },
      }),
    );
    expect(comp.data['completeCount']).toBe(comp.data['totalControls']);
  });

  it('returns an error payload for unknown tools', async () => {
    const res = await handleRequest({
      jsonrpc: '2.0',
      id: 8,
      method: 'tools/call',
      params: { name: 'nonexistent', arguments: {} },
    });
    expect(parseToolJson(res).isError).toBe(true);
  });
});

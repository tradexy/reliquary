import { createInterface } from 'node:readline';
import { handleRequest } from './server.js';
import type { JsonRpcRequest } from './server.js';

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });

rl.on('line', (line) => {
  const trimmed = line.trim();
  if (trimmed === '') return;

  void (async () => {
    try {
      const req = JSON.parse(trimmed) as JsonRpcRequest;
      const res = await handleRequest(req);
      if (res !== null) {
        process.stdout.write(`${JSON.stringify(res)}\n`);
      }
    } catch {
      process.stdout.write(
        `${JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: { code: -32700, message: 'Parse error' },
        })}\n`,
      );
    }
  })();
});

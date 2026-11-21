const KEEP_ALIVE_MS = 15_000;
const PADDING = `:${' '.repeat(2048)}\n\n`;

export function createEvents() {
  const subscribers = new Set();

  function broadcast(frame) {
    for (const res of subscribers) {
      if (!res.write(frame)) res.destroy();
    }
  }

  setInterval(() => broadcast(': keep-alive\n\n'), KEEP_ALIVE_MS).unref();

  return {
    subscribe(res) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      });
      res.flushHeaders();
      res.write(PADDING);
      subscribers.add(res);
      res.once('close', () => subscribers.delete(res));
      res.write(': connected\n\n');
    },
    publish(type, data) {
      broadcast(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
    },
  };
}

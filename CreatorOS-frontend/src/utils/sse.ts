// Payload shapes differ per event, so callers read the fields they expect.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SseEvent = { event: string; data: any };

/** Parses a Server-Sent Events response body into events as they arrive. */
export async function* readSse(response: Response): AsyncGenerator<SseEvent> {
  if (!response.body) return;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf("\n\n");

        let event = "message";
        const dataLines: string[] = [];

        for (const line of block.split("\n")) {
          if (line.startsWith(":")) continue; // keep-alive comment
          if (line.startsWith("event:")) event = line.slice(6).trim();
          else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
        }

        if (dataLines.length) {
          try {
            yield { event, data: JSON.parse(dataLines.join("\n")) };
          } catch {
            // ignore a malformed frame rather than breaking the whole stream
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

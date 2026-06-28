export interface IAiSseReadResult {
  events: string[];
  remainder: string;
}

export function readSseEventData(buffer: string): IAiSseReadResult {
  const events: string[] = [];
  const separator = /\r?\n\r?\n/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = separator.exec(buffer)) !== null) {
    const block = buffer.slice(lastIndex, match.index);
    lastIndex = match.index + match[0].length;

    if (!block.trim()) {
      continue;
    }

    const payload = block
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n')
      .trim();

    if (payload) {
      events.push(payload);
    }
  }

  return {
    events,
    remainder: buffer.slice(lastIndex),
  };
}

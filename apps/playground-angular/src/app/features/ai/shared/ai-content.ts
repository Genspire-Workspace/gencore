// file: apps\playground-angular\src\app\features\ai\shared\ai-content.ts

export function readAiContentText(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') {
          return part;
        }

        if (
          part &&
          typeof part === 'object' &&
          'type' in part &&
          'text' in part &&
          (part as { type?: unknown }).type === 'text' &&
          typeof (part as { text?: unknown }).text === 'string'
        ) {
          return (part as { text: string }).text;
        }

        return '';
      })
      .join('');
  }

  if (content === null || content === undefined) {
    return '';
  }

  try {
    return JSON.stringify(content, null, 2);
  } catch {
    return String(content);
  }
}
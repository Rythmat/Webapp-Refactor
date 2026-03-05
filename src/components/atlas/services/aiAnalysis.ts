/* eslint-disable no-constant-condition */
import { Env } from '@/constants/env';

export interface AIAnalysisRequest {
  query: string;
  city?: string;
  year?: number;
  genres?: string[];
  localResults?: Array<{ title: string; year: number; genre: string[] }>;
}

// --- In-memory cache ---
const cache = new Map<string, string>();
const MAX_CACHE = 50;

function cacheKey(query: string): string {
  return query.toLowerCase().trim();
}

export function getCachedInsight(query: string): string | undefined {
  return cache.get(cacheKey(query));
}

export function setCachedInsight(query: string, content: string): void {
  const key = cacheKey(query);
  cache.set(key, content);
  if (cache.size > MAX_CACHE) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
}

// --- Streaming fetch ---
export async function streamAIAnalysis(
  params: AIAnalysisRequest,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (error: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  try {
    const apiBase =
      Env.get('VITE_MUSIC_ATLAS_API_URL', { nullable: true }) ?? '';
    const response = await fetch(`${apiBase}/atlas/ai/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal,
    });

    if (!response.ok) {
      let errorMsg = 'API request failed';
      try {
        const err = await response.json();
        errorMsg = err.error || errorMsg;
      } catch {
        // ignore parse failure
      }
      onError(errorMsg);
      return;
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            onDone();
            return;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) onChunk(parsed.text);
            if (parsed.error) {
              onError(parsed.error);
              return;
            }
          } catch {
            // skip malformed lines
          }
        }
      }
    }
    onDone();
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return; // silently ignore aborts
    }
    onError(err instanceof Error ? err.message : String(err));
  }
}

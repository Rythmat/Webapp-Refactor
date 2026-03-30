/* eslint-disable no-constant-condition */
/**
 * SSE client that listens to the backend for real-time session termination events.
 *
 * Connects to GET /auth/session/events with the user's token and app session ID.
 * When a `session-terminated` event is received, it emits through the existing
 * session-errors event bus so AuthContext can react (logout + popup).
 */

import { Env } from '@/constants/env';
import { emitSessionError, type SessionErrorCode } from './session-errors';

type SessionTerminatedData = {
  reason: SessionErrorCode;
  message: string;
};

/**
 * Opens an SSE connection to listen for session termination events.
 * Returns a cleanup function that closes the connection.
 */
export const connectSessionSSE = (
  token: string,
  appSessionId: string,
): (() => void) => {
  const apiBase = Env.get('VITE_MUSIC_ATLAS_API_URL', { nullable: true }) ?? '';
  const url = `${apiBase}/auth/session/events`;

  const controller = new AbortController();

  // We use fetch + ReadableStream instead of EventSource because EventSource
  // doesn't support custom headers (Authorization, X-App-Session).
  const connect = async () => {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-App-Session': appSessionId,
        },
        credentials: 'include',
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';
        let currentData = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            currentData = line.slice(6);
          } else if (line === '' && currentEvent && currentData) {
            // Blank line = end of SSE message
            if (currentEvent === 'session-terminated') {
              try {
                const parsed: SessionTerminatedData = JSON.parse(currentData);
                emitSessionError({
                  code: parsed.reason,
                  message: parsed.message,
                });
              } catch {
                // Malformed payload — ignore
              }
            }
            currentEvent = '';
            currentData = '';
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return; // Expected on cleanup
      }
      // Connection lost — don't retry, the existing 401 interceptor handles
      // session errors on the next API call as a fallback.
    }
  };

  void connect();

  return () => {
    controller.abort();
  };
};

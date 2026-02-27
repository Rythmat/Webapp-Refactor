const DEMUCS_SPACE = 'https://ahk-d-spleeter-ht-demucs-stem-separation-2025.hf.space'

export type StemType = 'vocals' | 'drums' | 'bass' | 'other'

export interface StemSeparationResult {
  vocals: string | null
  drums: string | null
  bass: string | null
  other: string | null
}

interface DemucsFileRef {
  path: string
  url: string
  orig_name: string
  size: number
  mime_type: string
  is_stream: false
  meta: { _type: 'gradio.FileData' }
}

async function uploadToDemucsSpace(blob: Blob, filename: string): Promise<DemucsFileRef | null> {
  try {
    const formData = new FormData()
    formData.append('files', blob, filename)

    const res = await fetch(`${DEMUCS_SPACE}/gradio_api/upload`, {
      method: 'POST',
      body: formData,
    })

    if (!res.ok) {
      console.warn('[Demucs] Upload failed:', res.status)
      return null
    }

    const files: string[] = await res.json()
    if (!files || files.length === 0) return null

    const path = files[0]
    return {
      path,
      url: `${DEMUCS_SPACE}/gradio_api/file=${path}`,
      orig_name: filename,
      size: blob.size,
      mime_type: blob.type || 'audio/wav',
      is_stream: false,
      meta: { _type: 'gradio.FileData' },
    }
  } catch (err) {
    console.warn('[Demucs] Upload error:', err)
    return null
  }
}

/**
 * Separate an audio blob into 4 stems (vocals, drums, bass, other) using HT-Demucs via HF Space.
 */
export async function separateStems(
  audioBlob: Blob,
  filename: string,
  onProgress?: (stage: string) => void,
): Promise<StemSeparationResult | null> {
  try {
    // 1. Upload audio to Demucs Space
    onProgress?.('Uploading audio...')
    const fileRef = await uploadToDemucsSpace(audioBlob, filename)
    if (!fileRef) {
      console.warn('[Demucs] Upload failed')
      return null
    }
    console.log('[Demucs] Uploaded:', fileRef.path)

    // 2. Submit separation job — data: [fileRef, htdemucs=true, spleeter=false]
    onProgress?.('Separating stems...')
    const submitRes = await fetch(`${DEMUCS_SPACE}/gradio_api/call/separate_selected_models`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [fileRef, true, false],
      }),
    })

    if (!submitRes.ok) {
      console.warn('[Demucs] Submit failed:', submitRes.status, await submitRes.text().catch(() => ''))
      return null
    }

    const { event_id } = await submitRes.json()
    console.log('[Demucs] Job submitted, event_id:', event_id)

    // 3. Stream SSE response to get stem URLs
    onProgress?.('Processing stems...')
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 300_000) // 5 min timeout

    try {
      const pollRes = await fetch(
        `${DEMUCS_SPACE}/gradio_api/call/separate_selected_models/${event_id}`,
        { signal: controller.signal },
      )

      if (!pollRes.ok || !pollRes.body) {
        console.warn('[Demucs] Poll response not OK:', pollRes.status)
        return null
      }

      const reader = pollRes.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        if (buffer.includes('event: error')) {
          const errMatch = buffer.match(/event: error\r?\ndata: (.+)/)
          console.warn('[Demucs] Error event:', errMatch?.[1] || '(no details)')
          reader.cancel()
          return null
        }

        // Look for the complete data payload with stem URLs
        const dataMatch = buffer.match(/event: complete\r?\ndata: (.+)/)
        if (dataMatch) {
          reader.cancel()
          try {
            const parsed = JSON.parse(dataMatch[1])
            // Response: array of 9 items — first 4 are HT-Demucs stems (vocals, drums, bass, other),
            // next 4 are Spleeter stems (null since disabled), last is status text
            const stems = parsed as (null | { url?: string; path?: string })[]

            const getUrl = (item: null | { url?: string; path?: string }): string | null => {
              if (!item) return null
              if (item.url) return item.url
              if (item.path) return `${DEMUCS_SPACE}/gradio_api/file=${item.path}`
              return null
            }

            const result: StemSeparationResult = {
              vocals: getUrl(stems[0]),
              drums: getUrl(stems[1]),
              bass: getUrl(stems[2]),
              other: getUrl(stems[3]),
            }

            console.log('[Demucs] Separation complete:', result)
            onProgress?.('Done!')
            return result
          } catch (parseErr) {
            console.warn('[Demucs] Failed to parse response:', parseErr)
            return null
          }
        }
      }

      console.warn('[Demucs] SSE stream ended without complete event')
      return null
    } finally {
      clearTimeout(timeout)
    }
  } catch (err) {
    console.warn('[Demucs] Separation failed:', err)
    return null
  }
}

/** Default Space for uploads — v1 is stable, v1.5 may be down */
const DEFAULT_SPACE = 'https://ace-step-ace-step.hf.space'

/** Reference to a file uploaded to the Gradio HF Space */
export interface GradioFileRef {
  path: string
  url: string
  orig_name: string
  size: number
  mime_type: string
  is_stream: false
  meta: { _type: 'gradio.FileData' }
}

/**
 * Upload an audio file (Blob or File) to a Gradio HF Space.
 * Returns a file reference object suitable for the generation data array.
 */
export async function uploadToGradio(
  blob: Blob,
  filename: string,
  spaceUrl = DEFAULT_SPACE,
): Promise<GradioFileRef | null> {
  try {
    const formData = new FormData()
    formData.append('files', blob, filename)

    const res = await fetch(`${spaceUrl}/gradio_api/upload`, {
      method: 'POST',
      body: formData,
    })

    if (!res.ok) {
      console.warn('[Gradio Upload] Failed:', res.status)
      return null
    }

    const files: string[] = await res.json()
    if (!files || files.length === 0) return null

    const path = files[0]
    return {
      path,
      url: `${spaceUrl}/gradio_api/file=${path}`,
      orig_name: filename,
      size: blob.size,
      mime_type: blob.type || 'audio/wav',
      is_stream: false,
      meta: { _type: 'gradio.FileData' },
    }
  } catch (err) {
    console.warn('[Gradio Upload] Error:', err)
    return null
  }
}

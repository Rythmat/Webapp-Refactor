import { GenerationParams } from "@/studio-daw/components/AIPromptPanel";
import { supabase } from "@/studio-daw/integrations/supabase/client";
import { type ContourAnalysis, type ContourSegment } from "@/studio-daw/audio/contour-analysis";
import { type GradioFileRef, uploadToGradio } from "@/studio-daw/services/gradio-upload";

/** Audio track result from curation */
export interface AudioTrackResult {
  type: 'audio';
  name: string;
  url: string;
  role?: string;
  suggestedVolume?: number;
  suggestedPan?: number;
}

/** MIDI track result from curation */
export interface MidiCurationResult {
  type: 'midi';
  name: string;
  role?: string;
  program: number;
  notes: { note: number; velocity: number; startTime: number; duration: number; channel: number }[];
  totalDuration: number;
  suggestedVolume?: number;
  suggestedPan?: number;
}

/** Union type for curated tracks */
export type CuratedTrack = AudioTrackResult | MidiCurationResult;

/** @deprecated Use CuratedTrack instead */
export interface SearchResult {
  name: string;
  url: string;
  role?: string;
  suggestedVolume?: number;
  suggestedPan?: number;
}

export const curateSounds = async (params: GenerationParams): Promise<CuratedTrack[]> => {
  const { data, error } = await supabase.functions.invoke('curate-sounds', {
    body: params
  });

  if (error) throw new Error(error.message);
  if (data.error) throw new Error(data.error);

  return data as CuratedTrack[];
};

/** Generate a single audio track from a text prompt */
export interface SingleTrackResult {
  type: 'audio';
  name: string;
  url: string;
  role?: string;
  suggestedVolume?: number;
}

export interface MidiTrackResult {
  type: 'midi';
  name: string;
  program: number;
  notes: { note: number; velocity: number; startTime: number; duration: number; channel: number }[];
  totalDuration: number;
}

export type TrackGenerationResult = SingleTrackResult | MidiTrackResult;


const HF_SPACE_V15 = 'https://ace-step-ace-step-v1-5.hf.space'

/** Expand mood IDs into rich musical descriptors for ACE-Step captions */
const MOOD_DESCRIPTORS: Record<string, string> = {
  meditative: 'meditative, calm, spacious, mindful, ambient, serene, gentle',
  ethereal: 'ethereal, dreamy, floating, airy, celestial, reverb-heavy',
  'dark-ambient': 'dark ambient, deep, brooding, low-frequency, ominous, dense',
  nature: 'nature sounds, organic, field recording, rain, wind, water, peaceful',
  warm: 'warm, enveloping, soft, comforting, cozy, analog, gentle',
  minimal: 'minimal, sparse, space, silence, clean, delicate, quiet',
  dramatic: 'dramatic, cinematic, orchestral, powerful, sweeping, epic',
  cinematic: 'cinematic, film score, orchestral, emotional, lush',
  uplifting: 'uplifting, hopeful, bright, positive, inspiring, soaring',
  tense: 'tense, suspenseful, dark, urgent, anxious, dissonant',
  peaceful: 'peaceful, tranquil, calm, gentle, soothing, relaxed',
  melancholic: 'melancholic, sad, emotional, minor key, longing, bittersweet',
  triumphant: 'triumphant, victorious, bold, powerful, brass, epic',
  haunting: 'haunting, eerie, ghostly, atmospheric, reverb, minor key',
  mysterious: 'mysterious, enigmatic, suspenseful, chromatic, curious',
  nostalgic: 'nostalgic, retro, warm, vintage, bittersweet, familiar',
  energetic: 'energetic, high energy, driving, fast, exciting, dynamic',
  aggressive: 'aggressive, heavy, distorted, intense, powerful, loud',
  funky: 'funky, groove, rhythm, bass-heavy, syncopated, danceable',
  groovy: 'groovy, rhythm, pocket, bass-driven, head-nodding, tight',
  romantic: 'romantic, tender, emotional, gentle, beautiful, strings',
  dreamy: 'dreamy, ambient, reverb, floating, soft, hazy',
}

/** Expand genre IDs into richer ACE-Step descriptors */
const GENRE_DESCRIPTORS: Record<string, string> = {
  pop: 'pop, catchy, polished, upbeat, modern production',
  rock: 'rock, electric guitar, drums, driving, powerful',
  'heavy-metal': 'heavy metal, distorted guitar, double bass drum, aggressive, loud',
  blues: 'blues, 12-bar, electric guitar, soulful, pentatonic, shuffle',
  jazz: 'jazz, swing, improvisation, complex chords, saxophone, piano trio',
  funk: 'funk, slap bass, tight drums, syncopated, groovy, wah guitar',
  country: 'country, acoustic guitar, pedal steel, storytelling, twang',
  folk: 'folk, acoustic, fingerpicking, organic, storytelling',
  'hip-hop': 'hip hop, trap, 808 bass, boom bap, beats, rap instrumental',
  rnb: 'R&B, soul, smooth, groove, neo-soul, warm bass',
  'ambient-electronic': 'ambient, electronic, atmospheric, pads, textures, evolving',
  house: 'house, four-on-the-floor, dance, electronic, synth, club',
  techno: 'techno, electronic, repetitive, industrial, hypnotic, dark',
  'drum-and-bass': 'drum and bass, breakbeat, fast drums, deep bass, jungle',
  'lo-fi': 'lo-fi, chill, vinyl crackle, mellow, jazzy chords, relaxed beats',
  classical: 'classical, orchestral, symphony, piano, strings, composed',
  'cinematic-film': 'cinematic, film score, epic, orchestral, emotional, dramatic',
  reggae: 'reggae, offbeat, dub, bass-heavy, laid-back, island',
  latin: 'latin, salsa, bossa nova, rhythm, percussion, tropical',
  'indian-raga': 'Indian, raga, sitar, tabla, drone, modal, meditative',
  'middle-eastern': 'Middle Eastern, oud, darbuka, modal, ornamental, exotic',
  'asian-gamelan': 'Asian, gamelan, pentatonic, gong, metallophone, meditative',
  afrobeat: 'Afrobeat, polyrhythmic, percussion, horn section, funky, energetic',
  'world-fusion': 'world fusion, eclectic, cross-cultural, organic, diverse instruments',
}

/** ACE-Step generation context */
interface AceStepContext {
  bpm?: number
  key?: string
  genre?: string
  fullCaption?: string
  lyrics?: string
  duration?: number
  taskType?: 'text2music' | 'repaint'
  sourceAudio?: GradioFileRef | null
  referenceAudio?: GradioFileRef | null
  repaintStart?: number
  repaintEnd?: number
}

/** Build the 49-element data array for ACE-Step v1.5 /generation_wrapper.
 *  Verified via /gradio_api/info on 2026-02-24. */
function buildAceStepV15Data(caption: string, simpleQuery: string, ctx: AceStepContext): unknown[] {
  const bpm = ctx.bpm || 60
  const key = ctx.key || ''
  const lyrics = ctx.lyrics || '[Instrumental]'
  const duration = ctx.duration || 30
  const taskType = ctx.taskType || 'text2music'
  const sourceAudio = ctx.sourceAudio || null
  const referenceAudio = ctx.referenceAudio || null
  const repaintStart = ctx.repaintStart ?? 0
  const repaintEnd = ctx.repaintEnd ?? 0
  const mode = taskType === 'repaint' ? 'repaint' : 'custom'

  return [
    "acestep-v15-turbo",    //  0  Dropdown: models
    mode,                   //  1  Radio: generation_mode
    simpleQuery,            //  2  Textbox: Song Description
    "en",                   //  3  Dropdown: Vocal Language (optional)
    caption,                //  4  Textbox: Prompt
    lyrics,                 //  5  Textbox: Lyrics
    bpm,                    //  6  Number: BPM
    key,                    //  7  Textbox: Key Signature
    "4",                    //  8  Dropdown: Time Signature
    "en",                   //  9  Dropdown: Vocal Language
    8,                      // 10  Slider: DiT Inference Steps
    5,                      // 11  Slider: guidance scale
    true,                   // 12  Checkbox: Random Seed
    "-1",                   // 13  Textbox: Seed
    referenceAudio,         // 14  Audio: Reference Audio
    Math.min(duration, 240),// 15  Number: Audio Duration
    1,                      // 16  Number: batch size
    sourceAudio,            // 17  Audio: Source Audio
    "",                     // 18  Textbox: Audio Codes
    repaintStart,           // 19  Number: Start (seconds)
    repaintEnd,             // 20  Number: End (seconds)
    "",                     // 21  Textbox: parameter_153
    0.5,                    // 22  Slider: parameter_138
    taskType,               // 23  Dropdown: task type
    false,                  // 24  Checkbox: parameter_157
    0,                      // 25  Slider: parameter_158
    0,                      // 26  Slider: parameter_159
    3,                      // 27  Slider: Shift
    "ode",                  // 28  Dropdown: Inference Method
    "",                     // 29  Textbox: Custom Timesteps
    "mp3",                  // 30  Dropdown: Audio Format
    0.85,                   // 31  Slider: LM Temperature
    false,                  // 32  Checkbox: Thinking
    3,                      // 33  Slider: LM CFG Scale
    0,                      // 34  Slider: LM Top-K
    0.9,                    // 35  Slider: LM Top-P
    "",                     // 36  Textbox: LM Negative Prompt
    false,                  // 37  Checkbox: parameter_160
    false,                  // 38  Checkbox: parameter_161
    false,                  // 39  Checkbox: parameter_162
    false,                  // 40  Checkbox: parameter_163
    false,                  // 41  Checkbox: parameter_164
    false,                  // 42  Checkbox: Get Scores
    false,                  // 43  Checkbox: Get LRC
    0.5,                    // 44  Slider: parameter_166
    0,                      // 45  Number: parameter_165
    "drums",                // 46  Dropdown: parameter_154
    [],                     // 47  CheckboxGroup: parameter_155
    false,                  // 48  Checkbox: parameter_167
  ]
}

/** Generic SSE-based Gradio call. Returns the MP3 URL or null. */
async function callGradioSSE(
  spaceUrl: string,
  endpoint: string,
  data: unknown[],
  duration: number,
  label: string,
): Promise<string | null> {
  const submitRes = await fetch(`${spaceUrl}/gradio_api/call${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  })
  if (!submitRes.ok) {
    console.warn(`[${label}] Submit failed:`, submitRes.status)
    return null
  }
  const { event_id } = await submitRes.json()
  console.log(`[${label}] Job submitted, event_id:`, event_id)

  const controller = new AbortController()
  const timeoutMs = Math.max(90_000, duration * 3000)
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const pollRes = await fetch(
      `${spaceUrl}/gradio_api/call${endpoint}/${event_id}`,
      { signal: controller.signal },
    )
    if (!pollRes.ok || !pollRes.body) {
      console.warn(`[${label}] Poll response not OK:`, pollRes.status)
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
        console.warn(`[${label}] Server error:`, errMatch?.[1] || '(no details)')
        reader.cancel()
        return null
      }

      const urlMatch = buffer.match(/"url"\s*:\s*"(https?:\/\/[^"]+\.mp3)"/)
      if (urlMatch) {
        reader.cancel()
        console.log(`[${label}] Generated successfully:`, urlMatch[1])
        return urlMatch[1]
      }
    }

    console.warn(`[${label}] SSE ended without MP3 URL`)
    return null
  } finally {
    clearTimeout(timeout)
  }
}

/** Generate via Replicate (lucataco/ace-step) as paid fallback.
 *  Calls our Supabase Edge Function which proxies to Replicate API. */
async function callReplicate(
  caption: string,
  context?: AceStepContext,
): Promise<string | null> {
  // Ensure BPM is in the tags so Replicate generates at the right tempo
  let tags = caption
  if (context?.bpm && !tags.includes('bpm')) {
    tags = `${tags}, ${context.bpm} bpm`
  }
  console.log('[Replicate] Calling ACE-Step via Replicate...', { tags })
  const { data, error } = await supabase.functions.invoke('replicate-generate', {
    body: {
      tags,
      lyrics: context?.lyrics || '[Instrumental]',
      duration: context?.duration || 30,
      scheduler: 'euler',
      guidance_type: 'apg',
      guidance_scale: 15.0,
      granularity_scale: 10.0,
      guidance_interval: 0.5,
      min_guidance_scale: 3.0,
      number_of_steps: 60,
    },
  })

  if (error) {
    console.warn('[Replicate] Edge function error:', error.message)
    return null
  }
  if (data?.error) {
    console.warn('[Replicate] Generation error:', data.error)
    return null
  }
  if (data?.url) {
    console.log('[Replicate] Generated successfully:', data.url)
    return data.url
  }
  return null
}

/** Call ACE-Step: tries HF v1.5 → Replicate (paid fallback). */
const generateAudioViaAceStep = async (
  prompt: string,
  context?: AceStepContext,
): Promise<SingleTrackResult | null> => {
  const genre = context?.genre?.replace(/-/g, ' ') || ''
  const caption = context?.fullCaption || [genre, prompt, 'instrumental'].filter(Boolean).join(', ')
  const duration = context?.duration || 30
  const bpm = context?.bpm || 60
  const key = context?.key || ''
  const simpleQuery = `${caption}, ${bpm} bpm`

  console.log('[ACE-Step] Submitting generation...', {
    caption, bpm, genre, duration,
    hasLyrics: !!(context?.lyrics),
    hasReference: !!(context?.referenceAudio),
  })

  const makeName = () => `${genre || 'AI'} ${prompt}`.slice(0, 25).trim()

  // 1. Try HF v1.5 first (best quality, BPM/key/repaint support)
  try {
    const url = await callGradioSSE(
      HF_SPACE_V15,
      '/generation_wrapper',
      buildAceStepV15Data(caption, simpleQuery, { ...context, bpm, key }),
      duration,
      'ACE-Step v1.5',
    )
    if (url) return { type: 'audio', name: makeName(), url, suggestedVolume: 0.8 }
  } catch (err) {
    console.warn('[ACE-Step v1.5] Failed:', err)
  }

  // 2. Final fallback: Replicate (paid, dedicated GPU — always available)
  console.log('[ACE-Step] HF v1.5 unavailable, falling back to Replicate...')
  try {
    const url = await callReplicate(caption, context)
    if (url) return { type: 'audio', name: makeName(), url, suggestedVolume: 0.8 }
  } catch (err) {
    console.warn('[Replicate] Failed:', err)
  }

  return null
}

export const generateTrackFromPrompt = async (
  prompt: string,
  trackType: 'audio' | 'midi',
  context?: { bpm?: number; key?: string; existingRoles?: string[]; genre?: string; lyrics?: string; duration?: number; referenceAudio?: GradioFileRef | null }
): Promise<TrackGenerationResult> => {
  // For audio tracks, try ACE-Step directly from browser first (faster, avoids edge SSE issues)
  if (trackType === 'audio') {
    const aceResult = await generateAudioViaAceStep(prompt, {
      ...context,
      lyrics: context?.lyrics,
      duration: context?.duration,
      referenceAudio: context?.referenceAudio,
    })
    if (aceResult) return aceResult
    console.log('[ai-curation] ACE-Step client-side failed, falling back to edge function')
  }

  // MIDI tracks or ACE-Step fallback → use edge function
  const { data, error } = await supabase.functions.invoke('generate-track', {
    body: { prompt, trackType, context }
  });

  if (error) throw new Error(error.message);
  if (data.error) throw new Error(data.error);

  return data as TrackGenerationResult;
};

/**
 * Generate a full session using ACE-Step for audio tracks.
 * Routes: samples → ACE-Step, midi → edge function, hybrid → both.
 * Falls back to curateSounds (Freesound) if ACE-Step is unavailable.
 */
export const generateSession = async (params: GenerationParams): Promise<CuratedTrack[]> => {
  // Pure MIDI mode → edge function handles everything
  if (params.trackSource === 'midi') {
    return curateSounds(params);
  }

  const results: CuratedTrack[] = [];

  // Hybrid mode → get MIDI tracks from edge function first
  if (params.trackSource === 'hybrid') {
    try {
      const midiResults = await curateSounds({ ...params, trackSource: 'midi' });
      results.push(...midiResults);
    } catch (err) {
      console.warn('[generateSession] MIDI generation failed:', err);
    }
  }

  // Upload reference audio to Gradio if provided
  let referenceAudio: GradioFileRef | null = null
  if (params.referenceFile) {
    console.log('[generateSession] Uploading reference audio:', params.referenceFile.name)
    referenceAudio = await uploadToGradio(params.referenceFile, params.referenceFile.name)
    if (referenceAudio) {
      console.log('[generateSession] Reference audio uploaded:', referenceAudio.path)
    }
  }

  // Generate audio tracks via ACE-Step
  const genreDesc = (params.genre && GENRE_DESCRIPTORS[params.genre]) || params.genre?.replace(/-/g, ' ') || ''
  const moodDesc = (params.mood && MOOD_DESCRIPTORS[params.mood]) || params.mood || ''
  const vibe = params.prompt || ''
  const bpm = params.tempo || 60
  const tagHint = params.referenceTags?.length
    ? params.referenceTags.join(', ')
    : ''

  const hasLyrics = !!(params.lyrics?.trim())

  // Build instrument hints from detected instruments
  const instrumentHint = params.detectedInstruments?.length
    ? params.detectedInstruments.join(', ')
    : ''

  // Build rich caption with expanded genre + mood descriptors
  const caption = [genreDesc, moodDesc, vibe, instrumentHint, tagHint, `${bpm} bpm`, hasLyrics ? '' : 'instrumental']
    .filter(Boolean).join(', ')

  console.log(`[generateSession] Caption: "${caption}"`)

  // Build single audio track with all instruments combined
  const audioRoles: { role: string; label: string; caption: string; volume: number; lyrics?: string }[] = [
    {
      role: 'melodic',
      label: 'Composition',
      caption,
      volume: 0.8,
      lyrics: hasLyrics ? params.lyrics : undefined,
    },
  ]

  console.log(`[generateSession] Generating ${audioRoles.length} ACE-Step audio track(s)...`)

  // Generate all audio tracks in parallel
  const audioTracks = await Promise.all(
    audioRoles.map(async (role) => {
      const result = await generateAudioViaAceStep(role.label, {
        bpm,
        genre: params.genre,
        fullCaption: role.caption,
        lyrics: role.lyrics,
        duration: params.duration,
        referenceAudio,
      })
      if (result) {
        return {
          type: 'audio' as const,
          name: result.name || role.label,
          url: result.url,
          role: role.role,
          suggestedVolume: role.volume,
        } satisfies AudioTrackResult
      }
      return null
    })
  )

  const successfulAudio = audioTracks.filter((t): t is AudioTrackResult => t !== null)

  if (successfulAudio.length > 0) {
    console.log(`[generateSession] ACE-Step generated ${successfulAudio.length} audio track(s)`)
    results.push(...successfulAudio)
  } else {
    // All ACE-Step attempts failed → fall back to Freesound
    console.log('[generateSession] ACE-Step unavailable, falling back to Freesound samples')
    const fallback = await curateSounds({ ...params, trackSource: 'samples' });
    results.push(...fallback);
  }

  if (results.length === 0) {
    throw new Error('No tracks generated');
  }

  return results;
};

// ── AI Stem Generation ──────────────────────────────────────────────

export type InstrumentStemType = 'drums' | 'bass' | 'guitar' | 'keys' | 'strings' | 'brass' | 'pads' | 'vocals'

/** Instrument-focused tags for ACE-Step generation.
 *  These serve as the `tags` field — short genre/style descriptors, not prose. */
const INSTRUMENT_TAGS: Record<InstrumentStemType, string> = {
  drums:   'drums, drum kit, kick, snare, hi-hat, percussion, rhythmic, groove',
  bass:    'bass, bass guitar, bass line, deep, low-end, groove, funky',
  guitar:  'guitar, electric guitar, rhythm guitar, riffs, chords, strumming',
  keys:    'piano, keyboard, keys, chords, melody, expressive',
  strings: 'strings, orchestral, violins, cellos, legato, lush, ensemble',
  brass:   'brass, trumpet, trombone, horn section, bold, fanfare',
  pads:    'synth pad, ambient, atmospheric, texture, warm, evolving, slow attack',
  vocals:  'vocals, singing, voice, melody, lead vocal',
}

/** Negative style hints to reduce instrument bleed in generated stems */
const INSTRUMENT_NEGATIVE: Record<InstrumentStemType, string> = {
  drums:   'no melody, no bass line, no guitar, no vocals, no synth, drums only',
  bass:    'no drums, no guitar solo, no vocals, no melody, bass only',
  guitar:  'no drums, no bass, no vocals, no piano, guitar only',
  keys:    'no drums, no guitar, no bass, no vocals, piano only',
  strings: 'no drums, no guitar, no bass, no vocals, strings only',
  brass:   'no drums, no guitar, no bass, no vocals, brass only',
  pads:    'no drums, no guitar, no bass, no vocals, synth pad only',
  vocals:  'no instruments, no drums, no guitar, no bass, vocals only',
}


/**
 * Build an enriched caption from analysis data for better style matching.
 */
export function buildEnrichedCaption(
  basePrompt: string,
  analysis?: { bpm?: number | null; key?: string | null; spectralCentroid?: number; rmsLevel?: number; isPercussive?: boolean },
  genre?: string,
): string {
  const parts = [basePrompt]

  if (genre) parts.push(genre.replace(/-/g, ' '))
  if (analysis?.key) parts.push(`in the key of ${analysis.key}`)
  if (analysis?.bpm) parts.push(`${analysis.bpm} bpm`)

  if (analysis?.rmsLevel !== undefined) {
    const energy = analysis.rmsLevel > 0.6 ? 'high energy' :
                   analysis.rmsLevel > 0.3 ? 'medium energy' :
                   'low energy, gentle'
    parts.push(energy)
  }

  if (analysis?.spectralCentroid !== undefined) {
    const timbre = analysis.spectralCentroid > 0.6 ? 'bright, crisp' :
                   analysis.spectralCentroid > 0.35 ? 'balanced warmth' :
                   'warm, dark'
    parts.push(timbre)
  }

  if (analysis?.isPercussive !== undefined) {
    parts.push(analysis.isPercussive ? 'percussive, rhythmic feel' : 'smooth, flowing feel')
  }

  return parts.filter(Boolean).join(', ')
}

/**
 * Search for real sound effect samples from Freesound via edge function.
 * Returns the top result's URL, or null if nothing found.
 */
export async function searchSoundEffect(
  query: string,
): Promise<SingleTrackResult | null> {
  console.log(`[SFX] Searching for: "${query}"`)
  try {
    const { data, error } = await supabase.functions.invoke('search-sfx', {
      body: { query, limit: 5 },
    })
    if (error) {
      console.warn('[SFX] Edge function error:', error.message)
      return null
    }
    if (data?.results?.length > 0) {
      const top = data.results[0]
      console.log(`[SFX] Found: "${top.name}" from ${top.source}`)
      return {
        type: 'audio',
        name: `SFX — ${top.name}`,
        url: top.url,
        suggestedVolume: 0.7,
      }
    }
    console.warn('[SFX] No results found')
    return null
  } catch (err) {
    console.error('[SFX] Search failed:', err)
    return null
  }
}

/**
 * Generate a single instrument stem using ACE-Step.
 * Uses instrument-specific tags and negative prompts for isolation.
 */
export async function generateInstrumentStem(
  instrument: InstrumentStemType,
  context: {
    bpm?: number
    key?: string
    genre?: string
    duration?: number
    referenceAudio?: GradioFileRef | null
    styleGuidance?: string
    onProgress?: (stage: string) => void
  },
): Promise<SingleTrackResult | null> {
  const genreDesc = (context.genre && GENRE_DESCRIPTORS[context.genre]) || context.genre?.replace(/-/g, ' ') || ''
  const instrumentTags = INSTRUMENT_TAGS[instrument]
  const negative = INSTRUMENT_NEGATIVE[instrument]

  // Build caption: expanded genre + instrument tags + style guidance + negative hints
  const captionParts = [
    genreDesc,
    instrumentTags,
    context.styleGuidance,
    context.key ? `key of ${context.key}` : '',
    context.bpm ? `${context.bpm} bpm` : '',
    'instrumental',
    negative,
  ].filter(Boolean)

  const caption = captionParts.join(', ')
  const simpleQuery = `${genreDesc} ${instrument} solo track`.trim()

  context.onProgress?.(`Generating ${instrument}...`)
  console.log(`[StemGen] Generating ${instrument}: "${caption}"`)

  const result = await generateAudioViaAceStep(simpleQuery, {
    bpm: context.bpm,
    genre: context.genre,
    key: context.key,
    fullCaption: caption,
    duration: context.duration || 30,
    referenceAudio: context.referenceAudio,
  })

  if (!result) return null

  // Name the track after the instrument
  return { ...result, name: `${genreDesc || 'AI'} ${instrument}`.trim().slice(0, 25) }
}

// ── Extension / Continue ────────────────────────────────────────────

/**
 * Extend/continue an existing audio clip using ACE-Step repaint mode.
 * Uploads the source audio to Gradio, then generates continuation.
 */
export const generateExtension = async (
  sourceAudio: GradioFileRef,
  clipDuration: number,
  targetDuration: number,
  prompt: string,
  context?: { bpm?: number; genre?: string; key?: string; rmsLevel?: number; spectralCentroid?: number }
): Promise<SingleTrackResult | null> => {
  // Enrich the caption with analysis data for better style matching
  let enrichedPrompt = prompt
  if (context?.key) enrichedPrompt += `, key of ${context.key}`

  return generateAudioViaAceStep(enrichedPrompt, {
    bpm: context?.bpm,
    genre: context?.genre,
    key: context?.key,
    taskType: 'repaint',
    sourceAudio,
    repaintStart: clipDuration,
    repaintEnd: -1,
    duration: targetDuration,
  })
}

/** Score generation result - can be MIDI or audio */
export interface ScoreTrackResult {
  type: 'midi' | 'audio';
  name: string;
  role?: string;
  // For MIDI tracks
  program?: number;
  notes?: { note: number; velocity: number; startTime: number; duration: number; channel: number }[];
  totalDuration?: number;
  // For audio tracks
  url?: string;
  suggestedVolume?: number;
}

export interface ScoreGenerationResult {
  tracks: ScoreTrackResult[];
}

export interface ScoreGenerationParams {
  contour: ContourAnalysis;
  mood: string;
  tempo: number;
  trackSource: 'samples' | 'midi' | 'hybrid';
}

/**
 * Generate music tracks that follow a contour analysis from reference audio.
 * Used for AI Scoring feature - creating accompaniment for speech/meditation.
 */
export const generateScoreFromContour = async (
  params: ScoreGenerationParams
): Promise<ScoreGenerationResult> => {
  const { contour, mood, tempo, trackSource } = params;

  // Prepare contour data for the edge function
  const payload = {
    contourSegments: contour.segments,
    totalDuration: contour.totalDuration,
    overallIntensity: contour.overallIntensity,
    speechRatio: contour.speechRatio,
    mood,
    tempo,
    trackSource,
  };

  const { data, error } = await supabase.functions.invoke('generate-score', {
    body: payload
  });

  if (error) throw new Error(error.message);
  if (data.error) throw new Error(data.error);

  return data as ScoreGenerationResult;
};

/**
 * Interim seed Day for dogfooding Presentation Mode until the full
 * Year → Unit → Week → Day authoring UI (Phase 4) exists.
 *
 * The content is representative of what a real Day looks like — a five-phase
 * arc from Connect through Reflect — and hits every LocalizedText field so
 * bilingual toggling has something to show. It is NOT canonical curriculum;
 * once the seed content bundle (`lessonSeeds.seed.js`, `themes.seed.js`, etc.)
 * is imported, delete this fixture.
 */
import type { Day } from '../types';

export const DEMO_DAY_ID = 'demo-day-1';

export const demoDay: Day = {
  id: DEMO_DAY_ID,
  label: 'Demo Day — The Great Migration Sound Map',
  cells: {
    connectRegulate: {
      presentation: {
        title: {
          en: 'Settle in — one word for how you feel today',
          es: 'Acomódate — una palabra para cómo te sientes hoy',
        },
        prompt: {
          en: 'Take a breath. Share one word — happy, tired, curious — no wrong answers.',
          es: 'Respira profundo. Comparte una palabra — feliz, cansado, curioso — no hay respuestas incorrectas.',
        },
        launchTiles: [],
      },
      rationale: {
        assessment: null,
        standards: [],
        commonAnchors: [],
        selCompetencies: [],
        impactTags: [],
        cloRefs: [],
        notes: '',
        scaffoldLaneIds: [],
        createdBy: null,
        localContext: null,
      },
    },

    groupPractice: {
      presentation: {
        title: {
          en: 'Warm-up: Call & Response',
          es: 'Calentamiento: Llamada y Respuesta',
        },
        prompt: {
          en: 'Follow the rhythm on screen. Everyone plays the response together.',
          es: 'Sigue el ritmo en pantalla. Todos tocan la respuesta juntos.',
        },
        launchTiles: [
          {
            id: 'gp-tile-1',
            module: 'learn',
            activityRef: 'curriculum:rhythm:call-response',
            label: {
              en: 'Open Learn — Call & Response',
              es: 'Abrir Learn — Llamada y Respuesta',
            },
          },
        ],
      },
      rationale: {
        assessment: null,
        standards: [],
        commonAnchors: [],
        selCompetencies: [],
        impactTags: [],
        cloRefs: [],
        notes: '',
        scaffoldLaneIds: [],
        createdBy: null,
        localContext: null,
      },
    },

    creativeProjects: {
      presentation: {
        title: {
          en: 'Compose a 4-bar answer to a Muddy Waters line',
          es: 'Compón una respuesta de 4 compases a una línea de Muddy Waters',
        },
        prompt: {
          en: 'Loop the sample. Add your own 4 bars underneath. Save when it feels right.',
          es: 'Repite el sample. Agrega 4 compases debajo. Guarda cuando se sienta bien.',
        },
        launchTiles: [
          {
            id: 'cp-tile-1',
            module: 'studio',
            activityRef: 'studio:blues:muddy-waters-loop',
            label: {
              en: 'Open Studio — Muddy Waters Loop',
              es: 'Abrir Studio — Loop de Muddy Waters',
            },
          },
          {
            id: 'cp-tile-2',
            module: 'globe',
            activityRef: 'globe:artist:muddy-waters',
            label: {
              en: 'Explore Muddy Waters on the Globe',
              es: 'Explora Muddy Waters en el Globo',
            },
          },
        ],
      },
      rationale: {
        assessment: null,
        standards: [],
        commonAnchors: [],
        selCompetencies: [],
        impactTags: [],
        cloRefs: [],
        notes: '',
        scaffoldLaneIds: [],
        createdBy: null,
        localContext: null,
      },
    },

    presentPerform: {
      presentation: {
        title: {
          en: 'Share your 4 bars with the class',
          es: 'Comparte tus 4 compases con la clase',
        },
        prompt: {
          en: 'Two volunteers play their answer. Everyone else listens for one thing they liked.',
          es: 'Dos voluntarios tocan su respuesta. Los demás escuchan una cosa que les gustó.',
        },
        launchTiles: [],
      },
      rationale: {
        assessment: null,
        standards: [],
        commonAnchors: [],
        selCompetencies: [],
        impactTags: [],
        cloRefs: [],
        notes: '',
        scaffoldLaneIds: [],
        createdBy: null,
        localContext: null,
      },
    },

    respondReflectReset: {
      presentation: {
        title: {
          en: 'Reflect — what did you notice?',
          es: 'Reflexiona — ¿qué notaste?',
        },
        prompt: {
          en: 'One sentence: what did you notice about the way the blues carries feeling?',
          es: 'Una oración: ¿qué notaste sobre cómo el blues transmite sentimiento?',
        },
        launchTiles: [],
        resetChecklist: [
          { en: 'Instruments back in cases', es: 'Instrumentos guardados' },
          { en: 'Chairs pushed in', es: 'Sillas en su lugar' },
          { en: 'Board erased', es: 'Pizarrón borrado' },
        ],
      },
      rationale: {
        assessment: null,
        standards: [],
        commonAnchors: [],
        selCompetencies: [],
        impactTags: [],
        cloRefs: [],
        notes: '',
        scaffoldLaneIds: [],
        createdBy: null,
        localContext: null,
      },
    },
  },
};

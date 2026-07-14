import type { Clo } from './types';

/**
 * Class Learning Objectives — the "I can…" stems teachers align activities
 * to. Domain mirrors the National Core Arts Standards artistic processes,
 * plus a `connect` domain for SEL / belonging.
 *
 * NOTE: the string "clo" appears in these IDs. That's expected — this file
 * is a teacher-only content bank, never surfaced to students via
 * `buildStudentView`. The publish-time firewall test guards against `clo`
 * leaking into the student projection.
 */
export const CLOS: Clo[] = [
  {
    id: 'clo-connect-belonging',
    stem: 'I can',
    title: {
      en: 'contribute to a group groove and hear my part in the whole.',
      es: 'contribuir a un groove grupal y escuchar mi parte dentro del conjunto.',
    },
    domain: 'connect',
    standards: ['MU:Pr4.2.E'],
    source: 'canonical',
  },
  {
    id: 'clo-connect-regulate',
    stem: 'I can',
    title: {
      en: 'use breath and rhythm to arrive present in a shared musical space.',
      es: 'usar la respiración y el ritmo para llegar presente a un espacio musical compartido.',
    },
    domain: 'connect',
    standards: ['MU:Re7.1.E'],
    source: 'canonical',
  },
  {
    id: 'clo-connect-heritage',
    stem: 'I can',
    title: {
      en: 'trace how a song, style, or artist connects to a community and a history.',
      es: 'rastrear cómo una canción, estilo o artista se conecta con una comunidad y una historia.',
    },
    domain: 'connect',
    standards: ['MU:Cn11.0.T'],
    source: 'canonical',
  },
  {
    id: 'clo-perform-pulse',
    stem: 'I can',
    title: {
      en: 'keep steady pulse in a group setting.',
      es: 'mantener un pulso constante en un contexto grupal.',
    },
    domain: 'perform',
    standards: ['MU:Pr4.2.E'],
    source: 'canonical',
  },
  {
    id: 'clo-perform-form',
    stem: 'I can',
    title: {
      en: 'identify and respond to call-and-response and 12-bar blues form.',
      es: 'identificar y responder a la forma de llamada-y-respuesta y al blues de 12 compases.',
    },
    domain: 'perform',
    standards: ['MU:Pr4.2.E'],
    source: 'canonical',
  },
  {
    id: 'clo-perform-flow',
    stem: 'I can',
    title: {
      en: 'deliver a short original piece with intention and clarity.',
      es: 'presentar una pieza original corta con intención y claridad.',
    },
    domain: 'perform',
    standards: ['MU:Pr6.1.E'],
    source: 'canonical',
  },
  {
    id: 'clo-create-identity',
    stem: 'I can',
    title: {
      en: 'write short lyrics that name who I am becoming.',
      es: 'escribir letras cortas que nombren en quién me estoy convirtiendo.',
    },
    domain: 'create',
    standards: ['MU:Cr1.1.E'],
    source: 'canonical',
  },
  {
    id: 'clo-create-restraint',
    stem: 'I can',
    title: {
      en: 'use spare musical texture and silence to hold emotional weight.',
      es: 'usar textura musical escasa y silencio para sostener peso emocional.',
    },
    domain: 'create',
    standards: ['MU:Cr2.1.E'],
    source: 'canonical',
  },
  {
    id: 'clo-respond-context',
    stem: 'I can',
    title: {
      en: 'describe the historical and cultural context of a song I hear.',
      es: 'describir el contexto histórico y cultural de una canción que escucho.',
    },
    domain: 'respond',
    standards: ['MU:Re8.1.E'],
    source: 'canonical',
  },
];

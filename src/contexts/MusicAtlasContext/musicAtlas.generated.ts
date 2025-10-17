/* eslint-disable */
/* tslint:disable */
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export type DeleteChaptersByIdData = any;

export interface DeleteClassroomsByIdStudentsByStudentIdData {
  id: string;
  removed: boolean;
  removedAt: Date;
}

export interface DeleteCollectionsByIdData {
  deletedCollectionId: string;
  success: boolean;
}

export interface DeleteNoteSequencesByIdData {
  deletedNoteSequenceId: string;
  success: boolean;
}

export interface DeletePagesByIdData {
  deleted: boolean;
  id: string;
}

export type DeletePhraseMapsByIdBarsByBarIdData = any;

export type DeletePhraseMapsByIdData = any;

export interface DeletePlayAlongByIdData {
  audioFilePath: string | null;
  color: string | null;
  createdAt: Date;
  description: string | null;
  id: string;
  midiBeatsPerMinute: number | null;
  midiFilePath: string | null;
  name: string;
  updatedAt: Date;
}

export interface DeletePlayAlongByIdFilesData {
  audioFilePath: string | null;
  color: string | null;
  createdAt: Date;
  description: string | null;
  id: string;
  midiBeatsPerMinute: number | null;
  midiFilePath: string | null;
  name: string;
  updatedAt: Date;
}

export interface DeletePlayAlongByIdFilesParams {
  id: string;
  type: 'midi' | 'audio';
}

export interface DeleteStudentsByIdData {
  id: string;
  removed: boolean;
  removedAt: Date;
}

export interface DeleteTeachersByIdData {
  id: string;
  removed: boolean;
  removedAt: Date;
}

export interface DeleteTeachersInvitationsByIdData {
  id: string;
  revoked: boolean;
}

export interface DeleteTunesByIdData {
  beatUnit: number;
  beatsPerMeasure: number;
  color: string | null;
  createdAt: Date;
  id: string;
  key: string | null;
  tempo: number;
  title: string | null;
  updatedAt: Date;
}

export interface GetAuthMeData {
  birthDate: (Date) | null;
  createdAt: Date;
  email: string | null;
  fullName: string | null;
  id: string;
  nickname: string;
  role: string;
  school: string | null;
  updatedAt: Date;
  username: string | null;
}

export interface GetChaptersByIdData {
  color: string | null;
  description: string | null;
  id: string;
  name: string;
  noteKey: ('c' | 'g' | 'd' | 'a' | 'e' | 'b' | 'f_sharp' | 'd_flat' | 'a_flat' | 'e_flat' | 'b_flat' | 'f') | null;
  pages: {
    color: string | null;
    content: string;
    createdAt: Date;
    description: string | null;
    id: string;
    name: string | null;
    noteKey: ('c' | 'g' | 'd' | 'a' | 'e' | 'b' | 'f_sharp' | 'd_flat' | 'a_flat' | 'e_flat' | 'b_flat' | 'f') | null;
    order: number;
    updatedAt: Date;
  }[];
}

export type GetChaptersData = {
  Pages: {
    id: string;
    name: string | null;
    order: number;
  }[];
  color: string | null;
  description: string | null;
  id: string;
  name: string;
  noteKey: ('c' | 'g' | 'd' | 'a' | 'e' | 'b' | 'f_sharp' | 'd_flat' | 'a_flat' | 'e_flat' | 'b_flat' | 'f') | null;
  order: number | null;
}[];

export interface GetChaptersParams {
  collectionId?: string;
}

export interface GetClassroomsByIdData {
  code: string;
  description?: string | null;
  id: string;
  name: string;
  teacherName: string;
  year: number;
}

export type GetClassroomsData = {
  closedAt?: (Date) | null;
  code: string;
  createdAt: Date;
  description?: string | null;
  id: string;
  name: string;
  studentCount: number;
  teacherId: string;
  year: number;
}[];

export interface GetClassroomsDetailsByCodeData {
  code: string;
  description?: string | null;
  name: string;
  teacherName: string;
  year: number;
}

export interface GetClassroomsParams {
  status?: 'all' | 'open' | 'closed';
}

export interface GetCollectionsByIdData {
  CollectionChapters: {
    Chapter: {
      color: string | null;
      createdAt: Date;
      description: string | null;
      id: string;
      name: string;
      noteKey: ('c' | 'g' | 'd' | 'a' | 'e' | 'b' | 'f_sharp' | 'd_flat' | 'a_flat' | 'e_flat' | 'b_flat' | 'f') | null;
      updatedAt: Date;
    };
    chapterId: string;
    collectionId: string;
    createdAt: Date;
    id: string;
    order: number;
    updatedAt: Date;
  }[];
  color: string | null;
  createdAt: Date;
  description: string | null;
  id: string;
  name: string;
  updatedAt: Date;
}

export type GetCollectionsData = {
  chapters: number;
  color: string | null;
  createdAt: Date;
  description: string | null;
  id: string;
  name: string;
  updatedAt: Date;
}[];

export interface GetCollectionsParams {
  /** @default false */
  includeEmpty?: boolean;
}

export interface GetNoteSequencesByIdData {
  Notes: {
    color: string | null;
    durationInTicks: number;
    id: string;
    noteNumber: number;
    noteOffVelocity: number | null;
    noteSequenceId: string;
    startTimeInTicks: number;
    velocity: number;
  }[];
  createdAt: Date;
  id: string;
  name: string;
  tempo: number;
  ticksPerBeat: number;
  timeSignature: string;
  updatedAt: Date;
}

export interface GetNoteSequencesData {
  data: {
    Notes: {
      color: string | null;
      durationInTicks: number;
      id: string;
      noteNumber: number;
      noteOffVelocity: number | null;
      noteSequenceId: string;
      startTimeInTicks: number;
      velocity: number;
    }[];
    createdAt: Date;
    id: string;
    name: string;
    tempo: number;
    ticksPerBeat: number;
    timeSignature: string;
    updatedAt: Date;
  }[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface GetNoteSequencesParams {
  name?: string;
  /**
   * @min 1
   * @default 1
   */
  page?: number;
  /**
   * @min 1
   * @max 100
   * @default 20
   */
  pageSize?: number;
}

export type GetNotesData = {
  key: string;
  midi: number;
  noteName: string;
  noteNameFlat: string | null;
  noteNameSharp: string | null;
  octave: number;
  offset: number;
}[];

export interface GetPagesByIdData {
  chapterId: string;
  color: string | null;
  content: string;
  createdAt: Date;
  description: string | null;
  id: string;
  name: string | null;
  noteKey: ('c' | 'g' | 'd' | 'a' | 'e' | 'b' | 'f_sharp' | 'd_flat' | 'a_flat' | 'e_flat' | 'b_flat' | 'f') | null;
  order: number;
  updatedAt: Date;
}

export type GetPagesData = {
  chapterId: string;
  color: string | null;
  content: string;
  createdAt: Date;
  description: string | null;
  id: string;
  name: string | null;
  noteKey: ('c' | 'g' | 'd' | 'a' | 'e' | 'b' | 'f_sharp' | 'd_flat' | 'a_flat' | 'e_flat' | 'b_flat' | 'f') | null;
  order: number;
  updatedAt: Date;
}[];

export interface GetPagesParams {
  chapterId?: string;
}

export interface GetPhraseMapsByIdData {
  PhraseBars: {
    PhraseBarNotes: {
      color: string | null;
      id: string;
      label: string | null;
      noteDuration: 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth';
      noteNumbers: number[];
      noteType: 'note' | 'rest';
      order: number;
    }[];
    color: string | null;
    endRepeat: boolean;
    id: string;
    label: string | null;
    order: number;
    startRepeat: boolean;
  }[];
  beatsPerBar: number;
  beatsPerMinute: number;
  color: string | null;
  createdAt: Date;
  description: string | null;
  id: string;
  label: string | null;
  updatedAt: Date;
}

export interface GetPhraseMapsData {
  data: {
    bars: number;
    beatsPerBar: number;
    beatsPerMinute: number;
    color: string | null;
    createdAt: Date;
    description: string | null;
    id: string;
    label: string | null;
    updatedAt: Date;
  }[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface GetPhraseMapsParams {
  /**
   * @min 1
   * @default 1
   */
  page?: number;
  /**
   * @min 1
   * @max 100
   * @default 20
   */
  pageSize?: number;
}

export interface GetPlayAlongByIdData {
  audioFilePath: string | null;
  color: string | null;
  createdAt: Date;
  description: string | null;
  id: string;
  midiBeatsPerMinute: number | null;
  midiFilePath: string | null;
  name: string;
  updatedAt: Date;
}

export interface GetPlayAlongData {
  data: {
    audioFilePath: string | null;
    color: string | null;
    createdAt: Date;
    description: string | null;
    id: string;
    midiBeatsPerMinute: number | null;
    midiFilePath: string | null;
    name: string;
    updatedAt: Date;
  }[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface GetPlayAlongParams {
  /**
   * @min 1
   * @default 1
   */
  page?: number;
  /**
   * @min 1
   * @max 100
   * @default 20
   */
  pageSize?: number;
}

export type GetPracticeEventsData = {
  createdAt: Date;
  id: string;
  pageId: string;
  studentId: string;
}[];

export interface GetPracticeEventsParams {
  pageId?: string;
  studentId?: string;
}

export interface GetStudentsByIdData {
  birthDate: (Date) | null;
  classroomCount: number;
  createdAt: Date;
  email: string | null;
  fullName: string | null;
  id: string;
  nickname: string;
  practiceEventCount: number;
  removedAt: (Date) | null;
  school: string | null;
  updatedAt: Date;
  username: string | null;
}

export type GetStudentsData = {
  classroomCount: number;
  classroomStudentId?: string;
  createdAt: Date;
  email: string | null;
  id: string;
  joinedAt?: Date;
  nickname: string;
  removedAt?: (Date) | null;
  removedFromClassroom?: (Date) | null;
  school: string | null;
  username: string | null;
}[];

export interface GetStudentsParams {
  classroomId?: string;
  name?: string;
  status?: 'all' | 'active' | 'removed';
  username?: string;
}

export type GetTeachersData = {
  classroomCount: number;
  createdAt: Date;
  email: string | null;
  fullName: string | null;
  id: string;
  nickname: string;
  removedAt?: (Date) | null;
  school: string | null;
}[];

export interface GetTeachersInvitationsByCodeData {
  code: string;
  createdAt: Date;
  email: string;
  expiresAt?: (Date) | null;
  id: string;
  viewCount: number;
}

export type GetTeachersInvitationsData = {
  code: string;
  consumedAt?: (Date) | null;
  createdAt: Date;
  email: string;
  expiresAt?: (Date) | null;
  id: string;
  lastViewedAt?: (Date) | null;
  viewCount: number;
}[];

export interface GetTeachersInvitationsParams {
  status?: 'all' | 'active' | 'expired' | 'consumed';
}

export interface GetTeachersParams {
  email?: string;
  name?: string;
  status?: 'all' | 'active' | 'removed';
}

export interface GetTunesByIdData {
  Measures: {
    Notes: {
      color: string | null;
      createdAt: Date;
      id: string;
      label: string | null;
      measureId: string;
      pitch: string;
      /**
       * @min 0
       * @max 1
       */
      startOffsetInBeats: number;
      type:
        | 'whole'
        | 'half'
        | 'quarter'
        | 'eighth'
        | 'sixteenth'
        | 'thirtysecond'
        | 'dotted_whole'
        | 'dotted_half'
        | 'dotted_quarter'
        | 'dotted_eighth'
        | 'dotted_sixteenth';
      updatedAt: Date;
      velocity: number | null;
    }[];
    color: string | null;
    createdAt: Date;
    id: string;
    label: string | null;
    number: number;
    repeatEnd: boolean;
    repeatStart: boolean;
    repeatTimes: number | null;
    tuneId: string;
    updatedAt: Date;
  }[];
  beatUnit: number;
  beatsPerMeasure: number;
  color: string | null;
  createdAt: Date;
  id: string;
  key: string | null;
  tempo: number;
  title: string | null;
  updatedAt: Date;
}

export type GetTunesData = {
  beatUnit: number;
  beatsPerMeasure: number;
  color: string | null;
  createdAt: Date;
  id: string;
  key: string | null;
  measures: number;
  notes: number;
  tempo: number;
  title: string | null;
  updatedAt: Date;
}[];

export type PatchChaptersByIdData = any;

export interface PatchChaptersByIdPayload {
  color?: string | null;
  description?: string | null;
  id: string;
  name?: string;
  noteKey?: ('c' | 'g' | 'd' | 'a' | 'e' | 'b' | 'f_sharp' | 'd_flat' | 'a_flat' | 'e_flat' | 'b_flat' | 'f') | null;
}

export interface PatchClassroomsByIdData {
  code: string;
  description: string | null;
  id: string;
  name: string;
  teacherId: string;
  updatedAt: Date;
  year: number;
}

export interface PatchClassroomsByIdPayload {
  description?: string | null;
  name?: string;
  year?: number;
}

export interface PatchClassroomsByIdStudentsByStudentIdRestoreData {
  id: string;
  restored: boolean;
}

export interface PatchCollectionsByIdData {
  CollectionChapters: {
    chapterId: string;
    collectionId: string;
    createdAt: Date;
    id: string;
    order: number;
    updatedAt: Date;
  }[];
  color: string | null;
  createdAt: Date;
  description: string | null;
  id: string;
  name: string;
  updatedAt: Date;
}

export interface PatchCollectionsByIdPayload {
  chapters?: {
    chapterId: string;
    order: number;
  }[];
  color?: string;
  description?: string | null;
  name?: string;
}

export interface PatchNoteSequencesByIdData {
  Notes: {
    durationInTicks: number;
    id: string;
    noteNumber: number;
    noteOffVelocity: number | null;
    noteSequenceId: string;
    startTimeInTicks: number;
    velocity: number;
  }[];
  createdAt: Date;
  id: string;
  name: string;
  tempo: number;
  ticksPerBeat: number;
  timeSignature: string;
  updatedAt: Date;
}

export interface PatchNoteSequencesByIdPayload {
  id: string;
  name?: string;
  notes?: {
    color?: string | null;
    durationInTicks: number;
    noteNumber: number;
    noteOffVelocity?: number;
    startTimeInTicks: number;
    velocity: number;
  }[];
  tempo?: number;
  ticksPerBeat?: number;
  timeSignature?: string;
}

export interface PatchPagesByIdData {
  PageNoteSequences: {
    NoteSequence: {
      createdAt: Date;
      id: string;
      name: string;
      root: string | null;
      tempo: number;
      ticksPerBeat: number;
      timeSignature: string;
      type: string | null;
      updatedAt: Date;
    };
    createdAt: Date;
    id: string;
    noteSequenceId: string;
    pageId: string;
    updatedAt: Date;
  }[];
  PagePhraseMaps: {
    createdAt: Date;
    id: string;
    pageId: string;
    phraseMapId: string;
    updatedAt: Date;
  }[];
  PagePlayAlongs: {
    createdAt: Date;
    id: string;
    pageId: string;
    playAlongId: string;
    updatedAt: Date;
  }[];
  chapterId: string;
  color: string | null;
  content: string;
  createdAt: Date;
  description: string | null;
  id: string;
  name: string | null;
  noteKey: ('c' | 'g' | 'd' | 'a' | 'e' | 'b' | 'f_sharp' | 'd_flat' | 'a_flat' | 'e_flat' | 'b_flat' | 'f') | null;
  order: number;
  updatedAt: Date;
}

export interface PatchPagesByIdPayload {
  color?: string | null;
  content?: string;
  description?: string | null;
  name?: string;
  noteKey?: ('c' | 'g' | 'd' | 'a' | 'e' | 'b' | 'f_sharp' | 'd_flat' | 'a_flat' | 'e_flat' | 'b_flat' | 'f') | null;
  noteSequenceIds?: string[];
  order?: number;
  phraseMapIds?: string[];
  playAlongIds?: string[];
}

export interface PatchPhraseMapsByIdBarsByBarIdData {
  PhraseBarNotes: {
    color: string | null;
    id: string;
    label: string | null;
    noteDuration: 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth';
    noteNumbers: number[];
    noteType: 'note' | 'rest';
    order: number;
  }[];
  color: string | null;
  createdAt: Date;
  endRepeat: boolean;
  id: string;
  label: string | null;
  order: number;
  startRepeat: boolean;
  updatedAt: Date;
}

export interface PatchPhraseMapsByIdBarsByBarIdPayload {
  color?: string | null;
  endRepeat?: boolean;
  label?: string | null;
  notes: {
    color?: string | null;
    label?: string | null;
    noteDuration: 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth';
    noteNumbers: number[];
    noteType: 'note' | 'rest';
    order?: number;
  }[];
  order?: number;
  startRepeat?: boolean;
}

export type PatchPhraseMapsByIdData = any;

export interface PatchPhraseMapsByIdPayload {
  /**
   * @min 1
   * @max 16
   */
  beatsPerBar?: number;
  /**
   * @min 0
   * @max 240
   */
  beatsPerMinute?: number;
  color?: string | null;
  description?: string | null;
  label?: string | null;
}

export interface PatchPlayAlongByIdData {
  color: string | null;
  createdAt: Date;
  description: string | null;
  id: string;
  name: string;
  updatedAt: Date;
}

export interface PatchPlayAlongByIdPayload {
  color?: string | null;
  description?: string | null;
  name?: string;
}

export interface PatchStudentsByIdData {
  birthDate: (Date) | null;
  email: string | null;
  fullName: string | null;
  id: string;
  nickname: string;
  school: string | null;
  updatedAt: Date;
  username: string | null;
}

export interface PatchStudentsByIdPayload {
  birthDate?: (Date) | null;
  fullName?: string | null;
  nickname?: string;
  school?: string | null;
  username?: string | null;
}

export interface PatchStudentsByIdRestoreData {
  id: string;
  restored: boolean;
}

export interface PatchTeachersByIdRestoreData {
  id: string;
  restored: boolean;
}

export interface PatchTunesByIdData {
  Measures: {
    Notes: {
      color: string | null;
      createdAt: Date;
      id: string;
      label: string | null;
      measureId: string;
      pitch: string;
      /**
       * @min 0
       * @max 1
       */
      startOffsetInBeats: number;
      type:
        | 'whole'
        | 'half'
        | 'quarter'
        | 'eighth'
        | 'sixteenth'
        | 'thirtysecond'
        | 'dotted_whole'
        | 'dotted_half'
        | 'dotted_quarter'
        | 'dotted_eighth'
        | 'dotted_sixteenth';
      updatedAt: Date;
      velocity: number | null;
    }[];
    color: string | null;
    createdAt: Date;
    id: string;
    label: string | null;
    number: number;
    repeatEnd: boolean;
    repeatStart: boolean;
    repeatTimes: number | null;
    tuneId: string;
    updatedAt: Date;
  }[];
  beatUnit: number;
  beatsPerMeasure: number;
  color: string | null;
  createdAt: Date;
  id: string;
  key: string | null;
  tempo: number;
  title: string | null;
  updatedAt: Date;
}

export interface PatchTunesByIdPayload {
  beatUnit?: number;
  beatsPerMeasure?: number;
  color?: string | null;
  key?: string | null;
  measures?: {
    color?: string | null;
    label?: string | null;
    notes: {
      color?: string | null;
      label?: string | null;
      pitch: string;
      /**
       * @min 0
       * @max 1
       */
      startOffsetInBeats: number;
      type:
        | 'whole'
        | 'half'
        | 'quarter'
        | 'eighth'
        | 'sixteenth'
        | 'thirtysecond'
        | 'dotted_whole'
        | 'dotted_half'
        | 'dotted_quarter'
        | 'dotted_eighth'
        | 'dotted_sixteenth';
      velocity?: number | null;
    }[];
    number: number;
    /** @default false */
    repeatEnd?: boolean;
    /** @default false */
    repeatStart?: boolean;
    repeatTimes?: number | null;
  }[];
  tempo?: number;
  title?: string | null;
}

export interface PostAuthLoginData {
  token: string;
}

export interface PostAuthLoginPayload {
  email?: string;
  password: string;
  username?: string;
}

export interface PostAuthRecoverPasswordData {
  ok: true;
}

export interface PostAuthRecoverPasswordPayload {
  email: string;
}

export interface PostAuthRegisterData {
  createdAt: Date;
  email: string | null;
  fullName: string | null;
  id: string;
  nickname: string;
  school: string | null;
  updatedAt: Date;
  username: string | null;
}

export interface PostAuthRegisterPayload {
  birthDate?: Date;
  code: string;
  email?: string;
  fullName?: string;
  nickname: string;
  password: string;
  role: 'student' | 'teacher';
  school?: string;
  username?: string;
}

export interface PostAuthResetPasswordData {
  ok: true;
}

export interface PostAuthResetPasswordPayload {
  currentUserId?: string;
  password: string;
  token: string;
}

export interface PostChaptersData {
  color: string | null;
  description: string | null;
  id: string;
  name: string;
  noteKey: ('c' | 'g' | 'd' | 'a' | 'e' | 'b' | 'f_sharp' | 'd_flat' | 'a_flat' | 'e_flat' | 'b_flat' | 'f') | null;
  pages: {
    color: string | null;
    content: string;
    createdAt: Date;
    description: string | null;
    id: string;
    noteKey: ('c' | 'g' | 'd' | 'a' | 'e' | 'b' | 'f_sharp' | 'd_flat' | 'a_flat' | 'e_flat' | 'b_flat' | 'f') | null;
    order: number;
    updatedAt: Date;
  }[];
}

export interface PostChaptersPayload {
  color?: string;
  description?: string | null;
  initialPage?: {
    color?: string;
    content: string;
    description?: string | null;
    noteKey?: ('c' | 'g' | 'd' | 'a' | 'e' | 'b' | 'f_sharp' | 'd_flat' | 'a_flat' | 'e_flat' | 'b_flat' | 'f') | null;
  };
  name: string;
  noteKey?: ('c' | 'g' | 'd' | 'a' | 'e' | 'b' | 'f_sharp' | 'd_flat' | 'a_flat' | 'e_flat' | 'b_flat' | 'f') | null;
}

export interface PostChaptersReorderData {
  success: boolean;
}

export interface PostChaptersReorderPayload {
  chapterOrders: {
    id: string;
    order: number;
  }[];
}

export interface PostClassroomsData {
  code: string;
  createdAt: Date;
  description?: string | null;
  id: string;
  name: string;
  teacherId: string;
  year: number;
}

export interface PostClassroomsJoinData {
  classroomId: string;
  classroomName: string;
  id: string;
  joined: boolean;
}

export interface PostClassroomsJoinPayload {
  code: string;
}

export interface PostClassroomsPayload {
  description?: string;
  name: string;
  year: number;
}

export interface PostCollectionsByIdChaptersData {
  chapterId: string;
  collectionId: string;
  createdAt: Date;
  id: string;
  order: number;
  updatedAt: Date;
}

export interface PostCollectionsByIdChaptersPayload {
  chapterId: string;
  order?: number;
}

export interface PostCollectionsData {
  CollectionChapters: {
    chapterId: string;
    collectionId: string;
    createdAt: Date;
    id: string;
    order: number;
    updatedAt: Date;
  }[];
  color: string | null;
  createdAt: Date;
  description: string | null;
  id: string;
  name: string;
  updatedAt: Date;
}

export interface PostCollectionsPayload {
  chapters?: {
    chapterId: string;
    order: number;
  }[];
  color?: string;
  description?: string | null;
  name: string;
}

export interface PostMediaData {
  contentType: string;
  createdAt: Date;
  filePath: string;
  id: string;
  name: string;
  updatedAt: Date;
  uploadedBy: string;
}

export interface PostMediaGetUploadUrlData {
  filePath: string;
  signedUrl: string;
}

export interface PostMediaGetUploadUrlParams {
  contentType: string;
  fileName: string;
}

export interface PostMediaPayload {
  contentType: string;
  filePath: string;
  name: string;
}

export interface PostNoteSequencesData {
  Notes: {
    color: string | null;
    durationInTicks: number;
    id: string;
    noteNumber: number;
    noteOffVelocity: number | null;
    noteSequenceId: string;
    startTimeInTicks: number;
    velocity: number;
  }[];
  createdAt: Date;
  id: string;
  name: string;
  tempo: number;
  ticksPerBeat: number;
  timeSignature: string;
  updatedAt: Date;
}

export interface PostNoteSequencesPayload {
  name: string;
  notes?: {
    color?: string | null;
    durationInTicks: number;
    noteNumber: number;
    noteOffVelocity?: number;
    startTimeInTicks: number;
    velocity: number;
  }[];
  tempo: number;
  ticksPerBeat: number;
  timeSignature: string;
}

export interface PostPagesData {
  chapterId: string;
  color: string | null;
  content: string;
  createdAt: Date;
  description: string | null;
  id: string;
  name: string | null;
  noteKey: ('c' | 'g' | 'd' | 'a' | 'e' | 'b' | 'f_sharp' | 'd_flat' | 'a_flat' | 'e_flat' | 'b_flat' | 'f') | null;
  order: number;
  updatedAt: Date;
}

export interface PostPagesPayload {
  chapterId: string;
  color?: string;
  content: string;
  description?: string | null;
  name?: string;
  noteKey?: ('c' | 'g' | 'd' | 'a' | 'e' | 'b' | 'f_sharp' | 'd_flat' | 'a_flat' | 'e_flat' | 'b_flat' | 'f') | null;
  order?: number;
}

export interface PostPagesReorderData {
  success: boolean;
}

export interface PostPagesReorderPayload {
  chapterId: string;
  pageOrders: {
    id: string;
    order: number;
  }[];
}

export interface PostPhraseMapsByIdBarsData {
  PhraseBarNotes: {
    color: string | null;
    id: string;
    label: string | null;
    noteDuration: 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth';
    noteNumbers: number[];
    noteType: 'note' | 'rest';
    order: number;
  }[];
  color: string | null;
  createdAt: Date;
  endRepeat: boolean;
  id: string;
  label: string | null;
  order: number;
  startRepeat: boolean;
  updatedAt: Date;
}

export interface PostPhraseMapsByIdBarsPayload {
  color?: string;
  endRepeat?: boolean;
  id?: string;
  label?: string;
  notes: {
    color?: string;
    id?: string;
    label?: string;
    noteDuration: 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth';
    noteNumbers: number[];
    noteType: 'note' | 'rest';
    order: number;
  }[];
  order?: number;
  startRepeat?: boolean;
}

export interface PostPhraseMapsData {
  beatsPerBar: number;
  beatsPerMinute: number;
  color: string | null;
  createdAt: Date;
  description: string | null;
  id: string;
  label: string | null;
  updatedAt: Date;
}

export interface PostPhraseMapsPayload {
  /**
   * @min 1
   * @max 16
   */
  beatsPerBar?: number;
  /**
   * @min 0
   * @max 240
   */
  beatsPerMinute?: number;
  color?: string;
  description?: string;
  label: string;
  /** @min 1 */
  repeatCount?: number;
  shouldLoop?: boolean;
}

export interface PostPlayAlongByIdFilesData {
  audioFilePath: string | null;
  color: string | null;
  createdAt: Date;
  description: string | null;
  id: string;
  midiBeatsPerMinute: number | null;
  midiFilePath: string | null;
  name: string;
  updatedAt: Date;
}

export interface PostPlayAlongByIdFilesPayload {
  beatsPerMinute?: number;
  color?: string;
  filePath: string;
  name: string;
  type: 'audio' | 'midi';
}

export interface PostPlayAlongByIdUploadUrlData {
  filePath: string;
  signedUrl: string;
}

export interface PostPlayAlongByIdUploadUrlPayload {
  contentType: string;
  fileName: string;
  type: 'audio' | 'midi';
}

export interface PostPlayAlongData {
  audioFilePath: string | null;
  color: string | null;
  createdAt: Date;
  description: string | null;
  id: string;
  midiBeatsPerMinute: number | null;
  midiFilePath: string | null;
  name: string;
  updatedAt: Date;
}

export interface PostPlayAlongPayload {
  color?: string | null;
  description?: string;
  name: string;
}

export interface PostPracticeEventsData {
  message: string;
  success: boolean;
}

export interface PostPracticeEventsPayload {
  pageId: string;
}

export interface PostTeachersInvitationsData {
  code: string;
  createdAt: Date;
  email: string;
  expiresAt?: (Date) | null;
  id: string;
}

export interface PostTeachersInvitationsPayload {
  email: string;
}

export interface PostTunesData {
  Measures: {
    Notes: {
      color: string | null;
      createdAt: Date;
      id: string;
      label: string | null;
      measureId: string;
      pitch: string;
      /**
       * @min 0
       * @max 1
       */
      startOffsetInBeats: number;
      type:
        | 'whole'
        | 'half'
        | 'quarter'
        | 'eighth'
        | 'sixteenth'
        | 'thirtysecond'
        | 'dotted_whole'
        | 'dotted_half'
        | 'dotted_quarter'
        | 'dotted_eighth'
        | 'dotted_sixteenth';
      updatedAt: Date;
      velocity: number | null;
    }[];
    color: string | null;
    createdAt: Date;
    id: string;
    label: string | null;
    number: number;
    repeatEnd: boolean;
    repeatStart: boolean;
    repeatTimes: number | null;
    tuneId: string;
    updatedAt: Date;
  }[];
  beatUnit: number;
  beatsPerMeasure: number;
  color: string | null;
  createdAt: Date;
  id: string;
  key: string | null;
  tempo: number;
  title: string | null;
  updatedAt: Date;
}

export interface PostTunesPayload {
  beatUnit: number;
  beatsPerMeasure: number;
  color?: string | null;
  key?: string;
  measures?: {
    color?: string | null;
    label?: string | null;
    notes: {
      color?: string | null;
      label?: string | null;
      pitch: string;
      /**
       * @min 0
       * @max 1
       */
      startOffsetInBeats: number;
      type:
        | 'whole'
        | 'half'
        | 'quarter'
        | 'eighth'
        | 'sixteenth'
        | 'thirtysecond'
        | 'dotted_whole'
        | 'dotted_half'
        | 'dotted_quarter'
        | 'dotted_eighth'
        | 'dotted_sixteenth';
      velocity?: number | null;
    }[];
    number: number;
    /** @default false */
    repeatEnd?: boolean;
    /** @default false */
    repeatStart?: boolean;
    repeatTimes?: number | null;
  }[];
  tempo: number;
  title?: string;
}

export namespace Auth {
  /**
   * No description
   * @tags Auth
   * @name GetAuthMe
   * @request GET:/auth/me
   * @response `200` `GetAuthMeData`
   */
  export namespace GetAuthMe {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetAuthMeData;
  }

  /**
   * No description
   * @tags Auth
   * @name PostAuthLogin
   * @request POST:/auth/login
   * @response `200` `PostAuthLoginData`
   */
  export namespace PostAuthLogin {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = PostAuthLoginPayload;
    export type RequestHeaders = {};
    export type ResponseBody = PostAuthLoginData;
  }

  /**
   * No description
   * @tags Auth
   * @name PostAuthRecoverPassword
   * @request POST:/auth/recover-password
   * @response `200` `PostAuthRecoverPasswordData`
   */
  export namespace PostAuthRecoverPassword {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = PostAuthRecoverPasswordPayload;
    export type RequestHeaders = {};
    export type ResponseBody = PostAuthRecoverPasswordData;
  }

  /**
   * No description
   * @tags Auth
   * @name PostAuthRegister
   * @request POST:/auth/register
   * @response `200` `PostAuthRegisterData`
   */
  export namespace PostAuthRegister {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = PostAuthRegisterPayload;
    export type RequestHeaders = {};
    export type ResponseBody = PostAuthRegisterData;
  }

  /**
   * No description
   * @tags Auth
   * @name PostAuthResetPassword
   * @request POST:/auth/reset-password
   * @response `200` `PostAuthResetPasswordData`
   */
  export namespace PostAuthResetPassword {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = PostAuthResetPasswordPayload;
    export type RequestHeaders = {};
    export type ResponseBody = PostAuthResetPasswordData;
  }
}

export namespace Chapters {
  /**
   * No description
   * @tags Chapters
   * @name DeleteChaptersById
   * @request DELETE:/chapters/{id}
   * @response `200` `DeleteChaptersByIdData`
   */
  export namespace DeleteChaptersById {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteChaptersByIdData;
  }

  /**
   * No description
   * @tags Chapters
   * @name GetChapters
   * @request GET:/chapters
   * @response `200` `GetChaptersData`
   */
  export namespace GetChapters {
    export type RequestParams = {};
    export type RequestQuery = {
      collectionId?: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetChaptersData;
  }

  /**
   * No description
   * @tags Chapters
   * @name GetChaptersById
   * @request GET:/chapters/{id}
   * @response `200` `GetChaptersByIdData`
   */
  export namespace GetChaptersById {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetChaptersByIdData;
  }

  /**
   * No description
   * @tags Chapters
   * @name PatchChaptersById
   * @request PATCH:/chapters/{id}
   * @response `200` `PatchChaptersByIdData`
   */
  export namespace PatchChaptersById {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = PatchChaptersByIdPayload;
    export type RequestHeaders = {};
    export type ResponseBody = PatchChaptersByIdData;
  }

  /**
   * No description
   * @tags Chapters
   * @name PostChapters
   * @request POST:/chapters
   * @response `200` `PostChaptersData`
   */
  export namespace PostChapters {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = PostChaptersPayload;
    export type RequestHeaders = {};
    export type ResponseBody = PostChaptersData;
  }

  /**
   * No description
   * @tags Chapters
   * @name PostChaptersReorder
   * @summary Globally reorder chapters (applies to all collections)
   * @request POST:/chapters/reorder
   * @response `200` `PostChaptersReorderData`
   */
  export namespace PostChaptersReorder {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = PostChaptersReorderPayload;
    export type RequestHeaders = {};
    export type ResponseBody = PostChaptersReorderData;
  }
}

export namespace Classrooms {
  /**
   * No description
   * @tags Classrooms
   * @name DeleteClassroomsByIdStudentsByStudentId
   * @request DELETE:/classrooms/{id}/students/{studentId}
   * @response `200` `DeleteClassroomsByIdStudentsByStudentIdData`
   */
  export namespace DeleteClassroomsByIdStudentsByStudentId {
    export type RequestParams = {
      id: string;
      studentId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteClassroomsByIdStudentsByStudentIdData;
  }

  /**
   * No description
   * @tags Classrooms
   * @name GetClassrooms
   * @request GET:/classrooms
   * @response `200` `GetClassroomsData`
   */
  export namespace GetClassrooms {
    export type RequestParams = {};
    export type RequestQuery = {
      status?: 'all' | 'open' | 'closed';
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetClassroomsData;
  }

  /**
   * No description
   * @tags Classrooms
   * @name GetClassroomsById
   * @request GET:/classrooms/{id}
   * @response `200` `GetClassroomsByIdData`
   */
  export namespace GetClassroomsById {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetClassroomsByIdData;
  }

  /**
   * No description
   * @tags Classrooms
   * @name GetClassroomsDetailsByCode
   * @request GET:/classrooms/details/{code}
   * @response `200` `GetClassroomsDetailsByCodeData`
   */
  export namespace GetClassroomsDetailsByCode {
    export type RequestParams = {
      code: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetClassroomsDetailsByCodeData;
  }

  /**
   * No description
   * @tags Classrooms
   * @name PatchClassroomsById
   * @request PATCH:/classrooms/{id}
   * @response `200` `PatchClassroomsByIdData`
   */
  export namespace PatchClassroomsById {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = PatchClassroomsByIdPayload;
    export type RequestHeaders = {};
    export type ResponseBody = PatchClassroomsByIdData;
  }

  /**
   * No description
   * @tags Classrooms
   * @name PatchClassroomsByIdStudentsByStudentIdRestore
   * @request PATCH:/classrooms/{id}/students/{studentId}/restore
   * @response `200` `PatchClassroomsByIdStudentsByStudentIdRestoreData`
   */
  export namespace PatchClassroomsByIdStudentsByStudentIdRestore {
    export type RequestParams = {
      id: string;
      studentId: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = PatchClassroomsByIdStudentsByStudentIdRestoreData;
  }

  /**
   * No description
   * @tags Classrooms
   * @name PostClassrooms
   * @request POST:/classrooms
   * @response `200` `PostClassroomsData`
   */
  export namespace PostClassrooms {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = PostClassroomsPayload;
    export type RequestHeaders = {};
    export type ResponseBody = PostClassroomsData;
  }

  /**
   * No description
   * @tags Classrooms
   * @name PostClassroomsJoin
   * @request POST:/classrooms/join
   * @response `200` `PostClassroomsJoinData`
   */
  export namespace PostClassroomsJoin {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = PostClassroomsJoinPayload;
    export type RequestHeaders = {};
    export type ResponseBody = PostClassroomsJoinData;
  }
}

export namespace Collections {
  /**
   * No description
   * @tags Collections
   * @name DeleteCollectionsById
   * @request DELETE:/collections/{id}
   * @response `200` `DeleteCollectionsByIdData`
   */
  export namespace DeleteCollectionsById {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteCollectionsByIdData;
  }

  /**
   * No description
   * @tags Collections
   * @name GetCollections
   * @request GET:/collections
   * @response `200` `GetCollectionsData`
   */
  export namespace GetCollections {
    export type RequestParams = {};
    export type RequestQuery = {
      /** @default false */
      includeEmpty?: boolean;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetCollectionsData;
  }

  /**
   * No description
   * @tags Collections
   * @name GetCollectionsById
   * @request GET:/collections/{id}
   * @response `200` `GetCollectionsByIdData`
   */
  export namespace GetCollectionsById {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetCollectionsByIdData;
  }

  /**
   * No description
   * @tags Collections
   * @name PatchCollectionsById
   * @request PATCH:/collections/{id}
   * @response `200` `PatchCollectionsByIdData`
   */
  export namespace PatchCollectionsById {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = PatchCollectionsByIdPayload;
    export type RequestHeaders = {};
    export type ResponseBody = PatchCollectionsByIdData;
  }

  /**
   * No description
   * @tags Collections
   * @name PostCollections
   * @request POST:/collections
   * @response `200` `PostCollectionsData`
   */
  export namespace PostCollections {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = PostCollectionsPayload;
    export type RequestHeaders = {};
    export type ResponseBody = PostCollectionsData;
  }

  /**
   * No description
   * @tags Collections
   * @name PostCollectionsByIdChapters
   * @request POST:/collections/{id}/chapters
   * @response `200` `PostCollectionsByIdChaptersData`
   */
  export namespace PostCollectionsByIdChapters {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = PostCollectionsByIdChaptersPayload;
    export type RequestHeaders = {};
    export type ResponseBody = PostCollectionsByIdChaptersData;
  }
}

export namespace Teachers {
  /**
   * No description
   * @tags Teachers
   * @name DeleteTeachersById
   * @request DELETE:/teachers/{id}
   * @response `200` `DeleteTeachersByIdData`
   */
  export namespace DeleteTeachersById {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteTeachersByIdData;
  }

  /**
   * No description
   * @tags Teachers, Invitations
   * @name DeleteTeachersInvitationsById
   * @request DELETE:/teachers/invitations/{id}
   * @response `200` `DeleteTeachersInvitationsByIdData`
   */
  export namespace DeleteTeachersInvitationsById {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteTeachersInvitationsByIdData;
  }

  /**
   * No description
   * @tags Teachers
   * @name GetTeachers
   * @request GET:/teachers
   * @response `200` `GetTeachersData`
   */
  export namespace GetTeachers {
    export type RequestParams = {};
    export type RequestQuery = {
      email?: string;
      name?: string;
      status?: 'all' | 'active' | 'removed';
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetTeachersData;
  }

  /**
   * No description
   * @tags Teachers, Invitations
   * @name GetTeachersInvitations
   * @request GET:/teachers/invitations
   * @response `200` `GetTeachersInvitationsData`
   */
  export namespace GetTeachersInvitations {
    export type RequestParams = {};
    export type RequestQuery = {
      status?: 'all' | 'active' | 'expired' | 'consumed';
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetTeachersInvitationsData;
  }

  /**
   * No description
   * @tags Teachers, Invitations
   * @name GetTeachersInvitationsByCode
   * @request GET:/teachers/invitations/{code}
   * @response `200` `GetTeachersInvitationsByCodeData`
   */
  export namespace GetTeachersInvitationsByCode {
    export type RequestParams = {
      code: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetTeachersInvitationsByCodeData;
  }

  /**
   * No description
   * @tags Teachers
   * @name PatchTeachersByIdRestore
   * @request PATCH:/teachers/{id}/restore
   * @response `200` `PatchTeachersByIdRestoreData`
   */
  export namespace PatchTeachersByIdRestore {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = PatchTeachersByIdRestoreData;
  }

  /**
   * @description Creates a new teacher invitation
   * @tags Teachers, Invitations
   * @name PostTeachersInvitations
   * @request POST:/teachers/invitations
   * @response `200` `PostTeachersInvitationsData`
   */
  export namespace PostTeachersInvitations {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = PostTeachersInvitationsPayload;
    export type RequestHeaders = {};
    export type ResponseBody = PostTeachersInvitationsData;
  }
}

export namespace Notes {
  /**
   * No description
   * @tags Notes
   * @name GetNotes
   * @request GET:/notes
   * @response `200` `GetNotesData`
   */
  export namespace GetNotes {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetNotesData;
  }
}

export namespace NoteSequences {
  /**
   * No description
   * @tags Note Sequences
   * @name DeleteNoteSequencesById
   * @request DELETE:/note-sequences/{id}
   * @response `200` `DeleteNoteSequencesByIdData`
   */
  export namespace DeleteNoteSequencesById {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteNoteSequencesByIdData;
  }

  /**
   * No description
   * @tags Note Sequences
   * @name GetNoteSequences
   * @request GET:/note-sequences
   * @response `200` `GetNoteSequencesData`
   */
  export namespace GetNoteSequences {
    export type RequestParams = {};
    export type RequestQuery = {
      name?: string;
      /**
       * @min 1
       * @default 1
       */
      page?: number;
      /**
       * @min 1
       * @max 100
       * @default 20
       */
      pageSize?: number;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetNoteSequencesData;
  }

  /**
   * No description
   * @tags Note Sequences
   * @name GetNoteSequencesById
   * @request GET:/note-sequences/{id}
   * @response `200` `GetNoteSequencesByIdData`
   */
  export namespace GetNoteSequencesById {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetNoteSequencesByIdData;
  }

  /**
   * No description
   * @tags Note Sequences
   * @name PatchNoteSequencesById
   * @request PATCH:/note-sequences/{id}
   * @response `200` `PatchNoteSequencesByIdData`
   */
  export namespace PatchNoteSequencesById {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = PatchNoteSequencesByIdPayload;
    export type RequestHeaders = {};
    export type ResponseBody = PatchNoteSequencesByIdData;
  }

  /**
   * No description
   * @tags Note Sequences
   * @name PostNoteSequences
   * @request POST:/note-sequences
   * @response `200` `PostNoteSequencesData`
   */
  export namespace PostNoteSequences {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = PostNoteSequencesPayload;
    export type RequestHeaders = {};
    export type ResponseBody = PostNoteSequencesData;
  }
}

export namespace Pages {
  /**
   * No description
   * @tags Pages
   * @name DeletePagesById
   * @request DELETE:/pages/{id}
   * @response `200` `DeletePagesByIdData`
   */
  export namespace DeletePagesById {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeletePagesByIdData;
  }

  /**
   * No description
   * @tags Pages
   * @name GetPages
   * @request GET:/pages
   * @response `200` `GetPagesData`
   */
  export namespace GetPages {
    export type RequestParams = {};
    export type RequestQuery = {
      chapterId?: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetPagesData;
  }

  /**
   * No description
   * @tags Pages
   * @name GetPagesById
   * @request GET:/pages/{id}
   * @response `200` `GetPagesByIdData`
   */
  export namespace GetPagesById {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetPagesByIdData;
  }

  /**
   * No description
   * @tags Pages
   * @name PatchPagesById
   * @request PATCH:/pages/{id}
   * @response `200` `PatchPagesByIdData`
   */
  export namespace PatchPagesById {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = PatchPagesByIdPayload;
    export type RequestHeaders = {};
    export type ResponseBody = PatchPagesByIdData;
  }

  /**
   * No description
   * @tags Pages
   * @name PostPages
   * @request POST:/pages
   * @response `200` `PostPagesData`
   */
  export namespace PostPages {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = PostPagesPayload;
    export type RequestHeaders = {};
    export type ResponseBody = PostPagesData;
  }

  /**
   * No description
   * @tags Pages
   * @name PostPagesReorder
   * @request POST:/pages/reorder
   * @response `200` `PostPagesReorderData`
   */
  export namespace PostPagesReorder {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = PostPagesReorderPayload;
    export type RequestHeaders = {};
    export type ResponseBody = PostPagesReorderData;
  }
}

export namespace PhraseMaps {
  /**
   * No description
   * @tags Phrase Maps
   * @name DeletePhraseMapsById
   * @request DELETE:/phrase-maps/{id}
   * @response `200` `DeletePhraseMapsByIdData`
   */
  export namespace DeletePhraseMapsById {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeletePhraseMapsByIdData;
  }

  /**
   * No description
   * @tags Phrase Maps
   * @name DeletePhraseMapsByIdBarsByBarId
   * @request DELETE:/phrase-maps/{id}/bars/{barId}
   * @response `200` `DeletePhraseMapsByIdBarsByBarIdData`
   */
  export namespace DeletePhraseMapsByIdBarsByBarId {
    export type RequestParams = {
      barId: string;
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeletePhraseMapsByIdBarsByBarIdData;
  }

  /**
   * No description
   * @tags Phrase Maps
   * @name GetPhraseMaps
   * @request GET:/phrase-maps
   * @response `200` `GetPhraseMapsData`
   */
  export namespace GetPhraseMaps {
    export type RequestParams = {};
    export type RequestQuery = {
      /**
       * @min 1
       * @default 1
       */
      page?: number;
      /**
       * @min 1
       * @max 100
       * @default 20
       */
      pageSize?: number;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetPhraseMapsData;
  }

  /**
   * No description
   * @tags Phrase Maps
   * @name GetPhraseMapsById
   * @request GET:/phrase-maps/{id}
   * @response `200` `GetPhraseMapsByIdData`
   */
  export namespace GetPhraseMapsById {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetPhraseMapsByIdData;
  }

  /**
   * No description
   * @tags Phrase Maps
   * @name PatchPhraseMapsById
   * @request PATCH:/phrase-maps/{id}
   * @response `200` `PatchPhraseMapsByIdData`
   */
  export namespace PatchPhraseMapsById {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = PatchPhraseMapsByIdPayload;
    export type RequestHeaders = {};
    export type ResponseBody = PatchPhraseMapsByIdData;
  }

  /**
   * No description
   * @tags Phrase Maps
   * @name PatchPhraseMapsByIdBarsByBarId
   * @request PATCH:/phrase-maps/{id}/bars/{barId}
   * @response `200` `PatchPhraseMapsByIdBarsByBarIdData`
   */
  export namespace PatchPhraseMapsByIdBarsByBarId {
    export type RequestParams = {
      barId: string;
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = PatchPhraseMapsByIdBarsByBarIdPayload;
    export type RequestHeaders = {};
    export type ResponseBody = PatchPhraseMapsByIdBarsByBarIdData;
  }

  /**
   * No description
   * @tags Phrase Maps
   * @name PostPhraseMaps
   * @request POST:/phrase-maps
   * @response `200` `PostPhraseMapsData`
   */
  export namespace PostPhraseMaps {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = PostPhraseMapsPayload;
    export type RequestHeaders = {};
    export type ResponseBody = PostPhraseMapsData;
  }

  /**
   * No description
   * @tags Phrase Maps
   * @name PostPhraseMapsByIdBars
   * @request POST:/phrase-maps/{id}/bars
   * @response `200` `PostPhraseMapsByIdBarsData`
   */
  export namespace PostPhraseMapsByIdBars {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = PostPhraseMapsByIdBarsPayload;
    export type RequestHeaders = {};
    export type ResponseBody = PostPhraseMapsByIdBarsData;
  }
}

export namespace PlayAlong {
  /**
   * No description
   * @tags Play-Along
   * @name DeletePlayAlongById
   * @request DELETE:/play-along/{id}
   * @response `200` `DeletePlayAlongByIdData`
   */
  export namespace DeletePlayAlongById {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeletePlayAlongByIdData;
  }

  /**
   * No description
   * @tags Play-Along
   * @name DeletePlayAlongByIdFiles
   * @request DELETE:/play-along/{id}/files
   * @response `200` `DeletePlayAlongByIdFilesData`
   */
  export namespace DeletePlayAlongByIdFiles {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {
      type: 'midi' | 'audio';
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeletePlayAlongByIdFilesData;
  }

  /**
   * No description
   * @tags Play-Along
   * @name GetPlayAlong
   * @request GET:/play-along
   * @response `200` `GetPlayAlongData`
   */
  export namespace GetPlayAlong {
    export type RequestParams = {};
    export type RequestQuery = {
      /**
       * @min 1
       * @default 1
       */
      page?: number;
      /**
       * @min 1
       * @max 100
       * @default 20
       */
      pageSize?: number;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetPlayAlongData;
  }

  /**
   * No description
   * @tags Play-Along
   * @name GetPlayAlongById
   * @request GET:/play-along/{id}
   * @response `200` `GetPlayAlongByIdData`
   */
  export namespace GetPlayAlongById {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetPlayAlongByIdData;
  }

  /**
   * No description
   * @tags Play-Along
   * @name PatchPlayAlongById
   * @request PATCH:/play-along/{id}
   * @response `200` `PatchPlayAlongByIdData`
   */
  export namespace PatchPlayAlongById {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = PatchPlayAlongByIdPayload;
    export type RequestHeaders = {};
    export type ResponseBody = PatchPlayAlongByIdData;
  }

  /**
   * No description
   * @tags Play-Along
   * @name PostPlayAlong
   * @request POST:/play-along
   * @response `200` `PostPlayAlongData`
   */
  export namespace PostPlayAlong {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = PostPlayAlongPayload;
    export type RequestHeaders = {};
    export type ResponseBody = PostPlayAlongData;
  }

  /**
   * No description
   * @tags Play-Along
   * @name PostPlayAlongByIdFiles
   * @request POST:/play-along/{id}/files
   * @response `200` `PostPlayAlongByIdFilesData`
   */
  export namespace PostPlayAlongByIdFiles {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = PostPlayAlongByIdFilesPayload;
    export type RequestHeaders = {};
    export type ResponseBody = PostPlayAlongByIdFilesData;
  }

  /**
   * No description
   * @tags Play-Along
   * @name PostPlayAlongByIdUploadUrl
   * @request POST:/play-along/{id}/upload-url
   * @response `200` `PostPlayAlongByIdUploadUrlData`
   */
  export namespace PostPlayAlongByIdUploadUrl {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = PostPlayAlongByIdUploadUrlPayload;
    export type RequestHeaders = {};
    export type ResponseBody = PostPlayAlongByIdUploadUrlData;
  }
}

export namespace PracticeEvents {
  /**
   * No description
   * @tags Practice Events
   * @name GetPracticeEvents
   * @request GET:/practice-events
   * @response `200` `GetPracticeEventsData`
   */
  export namespace GetPracticeEvents {
    export type RequestParams = {};
    export type RequestQuery = {
      pageId?: string;
      studentId?: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetPracticeEventsData;
  }

  /**
   * No description
   * @tags Practice Events
   * @name PostPracticeEvents
   * @request POST:/practice-events
   * @response `200` `PostPracticeEventsData`
   */
  export namespace PostPracticeEvents {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = PostPracticeEventsPayload;
    export type RequestHeaders = {};
    export type ResponseBody = PostPracticeEventsData;
  }
}

export namespace Students {
  /**
   * No description
   * @tags Students
   * @name DeleteStudentsById
   * @request DELETE:/students/{id}
   * @response `200` `DeleteStudentsByIdData`
   */
  export namespace DeleteStudentsById {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteStudentsByIdData;
  }

  /**
   * No description
   * @tags Students
   * @name GetStudents
   * @request GET:/students
   * @response `200` `GetStudentsData`
   */
  export namespace GetStudents {
    export type RequestParams = {};
    export type RequestQuery = {
      classroomId?: string;
      name?: string;
      status?: 'all' | 'active' | 'removed';
      username?: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetStudentsData;
  }

  /**
   * No description
   * @tags Students
   * @name GetStudentsById
   * @request GET:/students/{id}
   * @response `200` `GetStudentsByIdData`
   */
  export namespace GetStudentsById {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetStudentsByIdData;
  }

  /**
   * No description
   * @tags Students
   * @name PatchStudentsById
   * @request PATCH:/students/{id}
   * @response `200` `PatchStudentsByIdData`
   */
  export namespace PatchStudentsById {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = PatchStudentsByIdPayload;
    export type RequestHeaders = {};
    export type ResponseBody = PatchStudentsByIdData;
  }

  /**
   * No description
   * @tags Students
   * @name PatchStudentsByIdRestore
   * @request PATCH:/students/{id}/restore
   * @response `200` `PatchStudentsByIdRestoreData`
   */
  export namespace PatchStudentsByIdRestore {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = PatchStudentsByIdRestoreData;
  }
}

export namespace Tunes {
  /**
   * No description
   * @tags Tunes
   * @name DeleteTunesById
   * @request DELETE:/tunes/{id}
   * @response `200` `DeleteTunesByIdData`
   */
  export namespace DeleteTunesById {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteTunesByIdData;
  }

  /**
   * No description
   * @tags Tunes
   * @name GetTunes
   * @request GET:/tunes
   * @response `200` `GetTunesData`
   */
  export namespace GetTunes {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetTunesData;
  }

  /**
   * No description
   * @tags Tunes
   * @name GetTunesById
   * @request GET:/tunes/{id}
   * @response `200` `GetTunesByIdData`
   */
  export namespace GetTunesById {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetTunesByIdData;
  }

  /**
   * No description
   * @tags Tunes
   * @name PatchTunesById
   * @request PATCH:/tunes/{id}
   * @response `200` `PatchTunesByIdData`
   */
  export namespace PatchTunesById {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = PatchTunesByIdPayload;
    export type RequestHeaders = {};
    export type ResponseBody = PatchTunesByIdData;
  }

  /**
   * No description
   * @tags Tunes
   * @name PostTunes
   * @request POST:/tunes
   * @response `200` `PostTunesData`
   */
  export namespace PostTunes {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = PostTunesPayload;
    export type RequestHeaders = {};
    export type ResponseBody = PostTunesData;
  }
}

export namespace Media {
  /**
   * No description
   * @tags Media
   * @name PostMedia
   * @request POST:/media
   * @response `200` `PostMediaData`
   */
  export namespace PostMedia {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = PostMediaPayload;
    export type RequestHeaders = {};
    export type ResponseBody = PostMediaData;
  }

  /**
   * No description
   * @tags Media
   * @name PostMediaGetUploadUrl
   * @request POST:/media/get-upload-url
   * @response `200` `PostMediaGetUploadUrlData`
   */
  export namespace PostMediaGetUploadUrl {
    export type RequestParams = {};
    export type RequestQuery = {
      contentType: string;
      fileName: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = PostMediaGetUploadUrlData;
  }
}

import type { AxiosInstance, AxiosRequestConfig, HeadersDefaults, ResponseType } from 'axios';
import axios from 'axios';

export type QueryParamsType = Record<string | number, any>;

export interface FullRequestParams extends Omit<AxiosRequestConfig, 'data' | 'params' | 'url' | 'responseType'> {
  /** set parameter to `true` for call `securityWorker` for this request */
  secure?: boolean;
  /** request path */
  path: string;
  /** content type of request body */
  type?: ContentType;
  /** query params */
  query?: QueryParamsType;
  /** format of response (i.e. response.json() -> format: "json") */
  format?: ResponseType;
  /** request body */
  body?: unknown;
}

export type RequestParams = Omit<FullRequestParams, 'body' | 'method' | 'query' | 'path'>;

export interface ApiConfig<SecurityDataType = unknown> extends Omit<AxiosRequestConfig, 'data' | 'cancelToken'> {
  securityWorker?: (
    securityData: SecurityDataType | null,
  ) => Promise<AxiosRequestConfig | void> | AxiosRequestConfig | void;
  secure?: boolean;
  format?: ResponseType;
}

export enum ContentType {
  Json = 'application/json',
  FormData = 'multipart/form-data',
  UrlEncoded = 'application/x-www-form-urlencoded',
  Text = 'text/plain',
}

export class HttpClient<SecurityDataType = unknown> {
  public instance: AxiosInstance;
  private securityData: SecurityDataType | null = null;
  private securityWorker?: ApiConfig<SecurityDataType>['securityWorker'];
  private secure?: boolean;
  private format?: ResponseType;

  constructor({ securityWorker, secure, format, ...axiosConfig }: ApiConfig<SecurityDataType> = {}) {
    this.instance = axios.create({ ...axiosConfig, baseURL: axiosConfig.baseURL || '' });
    this.secure = secure;
    this.format = format;
    this.securityWorker = securityWorker;
  }

  public setSecurityData = (data: SecurityDataType | null) => {
    this.securityData = data;
  };

  protected mergeRequestParams(params1: AxiosRequestConfig, params2?: AxiosRequestConfig): AxiosRequestConfig {
    const method = params1.method || (params2 && params2.method);

    return {
      ...this.instance.defaults,
      ...params1,
      ...(params2 || {}),
      headers: {
        ...((method && this.instance.defaults.headers[method.toLowerCase() as keyof HeadersDefaults]) || {}),
        ...(params1.headers || {}),
        ...((params2 && params2.headers) || {}),
      },
    };
  }

  protected stringifyFormItem(formItem: unknown) {
    if (typeof formItem === 'object' && formItem !== null) {
      return JSON.stringify(formItem);
    } else {
      return `${formItem}`;
    }
  }

  protected createFormData(input: Record<string, unknown>): FormData {
    if (input instanceof FormData) {
      return input;
    }
    return Object.keys(input || {}).reduce((formData, key) => {
      const property = input[key];
      const propertyContent: any[] = property instanceof Array ? property : [property];

      for (const formItem of propertyContent) {
        const isFileType = formItem instanceof Blob || formItem instanceof File;
        formData.append(key, isFileType ? formItem : this.stringifyFormItem(formItem));
      }

      return formData;
    }, new FormData());
  }

  public request = async <T = any, _E = any>({
    secure,
    path,
    type,
    query,
    format,
    body,
    ...params
  }: FullRequestParams): Promise<T> => {
    const secureParams =
      ((typeof secure === 'boolean' ? secure : this.secure) &&
        this.securityWorker &&
        (await this.securityWorker(this.securityData))) ||
      {};
    const requestParams = this.mergeRequestParams(params, secureParams);
    const responseFormat = format || this.format || undefined;

    if (type === ContentType.FormData && body && body !== null && typeof body === 'object') {
      body = this.createFormData(body as Record<string, unknown>);
    }

    if (type === ContentType.Text && body && body !== null && typeof body !== 'string') {
      body = JSON.stringify(body);
    }

    return this.instance
      .request({
        ...requestParams,
        headers: {
          ...(requestParams.headers || {}),
          ...(type ? { 'Content-Type': type } : {}),
        },
        params: query,
        responseType: responseFormat,
        data: body,
        url: path,
      })
      .then((response) => response.data);
  };
}

/**
 * @title Music Atlas API
 * @version 0.1.0
 *
 * API for the Music Atlas app
 */
export class Api<SecurityDataType extends unknown> {
  http: HttpClient<SecurityDataType>;

  constructor(http: HttpClient<SecurityDataType>) {
    this.http = http;
  }

  auth = {
    /**
     * No description
     *
     * @tags Auth
     * @name GetAuthMe
     * @request GET:/auth/me
     * @response `200` `GetAuthMeData`
     */
    getAuthMe: (params: RequestParams = {}) =>
      this.http.request<GetAuthMeData, any>({
        path: `/auth/me`,
        method: 'GET',
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Auth
     * @name PostAuthLogin
     * @request POST:/auth/login
     * @response `200` `PostAuthLoginData`
     */
    postAuthLogin: (data: PostAuthLoginPayload, params: RequestParams = {}) =>
      this.http.request<PostAuthLoginData, any>({
        path: `/auth/login`,
        method: 'POST',
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Auth
     * @name PostAuthRecoverPassword
     * @request POST:/auth/recover-password
     * @response `200` `PostAuthRecoverPasswordData`
     */
    postAuthRecoverPassword: (data: PostAuthRecoverPasswordPayload, params: RequestParams = {}) =>
      this.http.request<PostAuthRecoverPasswordData, any>({
        path: `/auth/recover-password`,
        method: 'POST',
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Auth
     * @name PostAuthRegister
     * @request POST:/auth/register
     * @response `200` `PostAuthRegisterData`
     */
    postAuthRegister: (data: PostAuthRegisterPayload, params: RequestParams = {}) =>
      this.http.request<PostAuthRegisterData, any>({
        path: `/auth/register`,
        method: 'POST',
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Auth
     * @name PostAuthResetPassword
     * @request POST:/auth/reset-password
     * @response `200` `PostAuthResetPasswordData`
     */
    postAuthResetPassword: (data: PostAuthResetPasswordPayload, params: RequestParams = {}) =>
      this.http.request<PostAuthResetPasswordData, any>({
        path: `/auth/reset-password`,
        method: 'POST',
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),
  };
  chapters = {
    /**
     * No description
     *
     * @tags Chapters
     * @name DeleteChaptersById
     * @request DELETE:/chapters/{id}
     * @response `200` `DeleteChaptersByIdData`
     */
    deleteChaptersById: (id: string, params: RequestParams = {}) =>
      this.http.request<DeleteChaptersByIdData, any>({
        path: `/chapters/${id}`,
        method: 'DELETE',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Chapters
     * @name GetChapters
     * @request GET:/chapters
     * @response `200` `GetChaptersData`
     */
    getChapters: (query: GetChaptersParams, params: RequestParams = {}) =>
      this.http.request<GetChaptersData, any>({
        path: `/chapters`,
        method: 'GET',
        query: query,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Chapters
     * @name GetChaptersById
     * @request GET:/chapters/{id}
     * @response `200` `GetChaptersByIdData`
     */
    getChaptersById: (id: string, params: RequestParams = {}) =>
      this.http.request<GetChaptersByIdData, any>({
        path: `/chapters/${id}`,
        method: 'GET',
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Chapters
     * @name PatchChaptersById
     * @request PATCH:/chapters/{id}
     * @response `200` `PatchChaptersByIdData`
     */
    patchChaptersById: (id: string, data: PatchChaptersByIdPayload, params: RequestParams = {}) =>
      this.http.request<PatchChaptersByIdData, any>({
        path: `/chapters/${id}`,
        method: 'PATCH',
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Chapters
     * @name PostChapters
     * @request POST:/chapters
     * @response `200` `PostChaptersData`
     */
    postChapters: (data: PostChaptersPayload, params: RequestParams = {}) =>
      this.http.request<PostChaptersData, any>({
        path: `/chapters`,
        method: 'POST',
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Chapters
     * @name PostChaptersReorder
     * @summary Globally reorder chapters (applies to all collections)
     * @request POST:/chapters/reorder
     * @response `200` `PostChaptersReorderData`
     */
    postChaptersReorder: (data: PostChaptersReorderPayload, params: RequestParams = {}) =>
      this.http.request<PostChaptersReorderData, any>({
        path: `/chapters/reorder`,
        method: 'POST',
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),
  };
  classrooms = {
    /**
     * No description
     *
     * @tags Classrooms
     * @name DeleteClassroomsByIdStudentsByStudentId
     * @request DELETE:/classrooms/{id}/students/{studentId}
     * @response `200` `DeleteClassroomsByIdStudentsByStudentIdData`
     */
    deleteClassroomsByIdStudentsByStudentId: (id: string, studentId: string, params: RequestParams = {}) =>
      this.http.request<DeleteClassroomsByIdStudentsByStudentIdData, any>({
        path: `/classrooms/${id}/students/${studentId}`,
        method: 'DELETE',
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Classrooms
     * @name GetClassrooms
     * @request GET:/classrooms
     * @response `200` `GetClassroomsData`
     */
    getClassrooms: (query: GetClassroomsParams, params: RequestParams = {}) =>
      this.http.request<GetClassroomsData, any>({
        path: `/classrooms`,
        method: 'GET',
        query: query,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Classrooms
     * @name GetClassroomsById
     * @request GET:/classrooms/{id}
     * @response `200` `GetClassroomsByIdData`
     */
    getClassroomsById: (id: string, params: RequestParams = {}) =>
      this.http.request<GetClassroomsByIdData, any>({
        path: `/classrooms/${id}`,
        method: 'GET',
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Classrooms
     * @name GetClassroomsDetailsByCode
     * @request GET:/classrooms/details/{code}
     * @response `200` `GetClassroomsDetailsByCodeData`
     */
    getClassroomsDetailsByCode: (code: string, params: RequestParams = {}) =>
      this.http.request<GetClassroomsDetailsByCodeData, any>({
        path: `/classrooms/details/${code}`,
        method: 'GET',
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Classrooms
     * @name PatchClassroomsById
     * @request PATCH:/classrooms/{id}
     * @response `200` `PatchClassroomsByIdData`
     */
    patchClassroomsById: (id: string, data: PatchClassroomsByIdPayload, params: RequestParams = {}) =>
      this.http.request<PatchClassroomsByIdData, any>({
        path: `/classrooms/${id}`,
        method: 'PATCH',
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Classrooms
     * @name PatchClassroomsByIdStudentsByStudentIdRestore
     * @request PATCH:/classrooms/{id}/students/{studentId}/restore
     * @response `200` `PatchClassroomsByIdStudentsByStudentIdRestoreData`
     */
    patchClassroomsByIdStudentsByStudentIdRestore: (id: string, studentId: string, params: RequestParams = {}) =>
      this.http.request<PatchClassroomsByIdStudentsByStudentIdRestoreData, any>({
        path: `/classrooms/${id}/students/${studentId}/restore`,
        method: 'PATCH',
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Classrooms
     * @name PostClassrooms
     * @request POST:/classrooms
     * @response `200` `PostClassroomsData`
     */
    postClassrooms: (data: PostClassroomsPayload, params: RequestParams = {}) =>
      this.http.request<PostClassroomsData, any>({
        path: `/classrooms`,
        method: 'POST',
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Classrooms
     * @name PostClassroomsJoin
     * @request POST:/classrooms/join
     * @response `200` `PostClassroomsJoinData`
     */
    postClassroomsJoin: (data: PostClassroomsJoinPayload, params: RequestParams = {}) =>
      this.http.request<PostClassroomsJoinData, any>({
        path: `/classrooms/join`,
        method: 'POST',
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),
  };
  collections = {
    /**
     * No description
     *
     * @tags Collections
     * @name DeleteCollectionsById
     * @request DELETE:/collections/{id}
     * @response `200` `DeleteCollectionsByIdData`
     */
    deleteCollectionsById: (id: string, params: RequestParams = {}) =>
      this.http.request<DeleteCollectionsByIdData, any>({
        path: `/collections/${id}`,
        method: 'DELETE',
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Collections
     * @name GetCollections
     * @request GET:/collections
     * @response `200` `GetCollectionsData`
     */
    getCollections: (query: GetCollectionsParams, params: RequestParams = {}) =>
      this.http.request<GetCollectionsData, any>({
        path: `/collections`,
        method: 'GET',
        query: query,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Collections
     * @name GetCollectionsById
     * @request GET:/collections/{id}
     * @response `200` `GetCollectionsByIdData`
     */
    getCollectionsById: (id: string, params: RequestParams = {}) =>
      this.http.request<GetCollectionsByIdData, any>({
        path: `/collections/${id}`,
        method: 'GET',
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Collections
     * @name PatchCollectionsById
     * @request PATCH:/collections/{id}
     * @response `200` `PatchCollectionsByIdData`
     */
    patchCollectionsById: (id: string, data: PatchCollectionsByIdPayload, params: RequestParams = {}) =>
      this.http.request<PatchCollectionsByIdData, any>({
        path: `/collections/${id}`,
        method: 'PATCH',
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Collections
     * @name PostCollections
     * @request POST:/collections
     * @response `200` `PostCollectionsData`
     */
    postCollections: (data: PostCollectionsPayload, params: RequestParams = {}) =>
      this.http.request<PostCollectionsData, any>({
        path: `/collections`,
        method: 'POST',
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Collections
     * @name PostCollectionsByIdChapters
     * @request POST:/collections/{id}/chapters
     * @response `200` `PostCollectionsByIdChaptersData`
     */
    postCollectionsByIdChapters: (id: string, data: PostCollectionsByIdChaptersPayload, params: RequestParams = {}) =>
      this.http.request<PostCollectionsByIdChaptersData, any>({
        path: `/collections/${id}/chapters`,
        method: 'POST',
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),
  };
  teachers = {
    /**
     * No description
     *
     * @tags Teachers
     * @name DeleteTeachersById
     * @request DELETE:/teachers/{id}
     * @response `200` `DeleteTeachersByIdData`
     */
    deleteTeachersById: (id: string, params: RequestParams = {}) =>
      this.http.request<DeleteTeachersByIdData, any>({
        path: `/teachers/${id}`,
        method: 'DELETE',
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Teachers, Invitations
     * @name DeleteTeachersInvitationsById
     * @request DELETE:/teachers/invitations/{id}
     * @response `200` `DeleteTeachersInvitationsByIdData`
     */
    deleteTeachersInvitationsById: (id: string, params: RequestParams = {}) =>
      this.http.request<DeleteTeachersInvitationsByIdData, any>({
        path: `/teachers/invitations/${id}`,
        method: 'DELETE',
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Teachers
     * @name GetTeachers
     * @request GET:/teachers
     * @response `200` `GetTeachersData`
     */
    getTeachers: (query: GetTeachersParams, params: RequestParams = {}) =>
      this.http.request<GetTeachersData, any>({
        path: `/teachers`,
        method: 'GET',
        query: query,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Teachers, Invitations
     * @name GetTeachersInvitations
     * @request GET:/teachers/invitations
     * @response `200` `GetTeachersInvitationsData`
     */
    getTeachersInvitations: (query: GetTeachersInvitationsParams, params: RequestParams = {}) =>
      this.http.request<GetTeachersInvitationsData, any>({
        path: `/teachers/invitations`,
        method: 'GET',
        query: query,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Teachers, Invitations
     * @name GetTeachersInvitationsByCode
     * @request GET:/teachers/invitations/{code}
     * @response `200` `GetTeachersInvitationsByCodeData`
     */
    getTeachersInvitationsByCode: (code: string, params: RequestParams = {}) =>
      this.http.request<GetTeachersInvitationsByCodeData, any>({
        path: `/teachers/invitations/${code}`,
        method: 'GET',
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Teachers
     * @name PatchTeachersByIdRestore
     * @request PATCH:/teachers/{id}/restore
     * @response `200` `PatchTeachersByIdRestoreData`
     */
    patchTeachersByIdRestore: (id: string, params: RequestParams = {}) =>
      this.http.request<PatchTeachersByIdRestoreData, any>({
        path: `/teachers/${id}/restore`,
        method: 'PATCH',
        format: 'json',
        ...params,
      }),

    /**
     * @description Creates a new teacher invitation
     *
     * @tags Teachers, Invitations
     * @name PostTeachersInvitations
     * @request POST:/teachers/invitations
     * @response `200` `PostTeachersInvitationsData`
     */
    postTeachersInvitations: (data: PostTeachersInvitationsPayload, params: RequestParams = {}) =>
      this.http.request<PostTeachersInvitationsData, any>({
        path: `/teachers/invitations`,
        method: 'POST',
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),
  };
  notes = {
    /**
     * No description
     *
     * @tags Notes
     * @name GetNotes
     * @request GET:/notes
     * @response `200` `GetNotesData`
     */
    getNotes: (params: RequestParams = {}) =>
      this.http.request<GetNotesData, any>({
        path: `/notes`,
        method: 'GET',
        format: 'json',
        ...params,
      }),
  };
  noteSequences = {
    /**
     * No description
     *
     * @tags Note Sequences
     * @name DeleteNoteSequencesById
     * @request DELETE:/note-sequences/{id}
     * @response `200` `DeleteNoteSequencesByIdData`
     */
    deleteNoteSequencesById: (id: string, params: RequestParams = {}) =>
      this.http.request<DeleteNoteSequencesByIdData, any>({
        path: `/note-sequences/${id}`,
        method: 'DELETE',
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Note Sequences
     * @name GetNoteSequences
     * @request GET:/note-sequences
     * @response `200` `GetNoteSequencesData`
     */
    getNoteSequences: (query: GetNoteSequencesParams, params: RequestParams = {}) =>
      this.http.request<GetNoteSequencesData, any>({
        path: `/note-sequences`,
        method: 'GET',
        query: query,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Note Sequences
     * @name GetNoteSequencesById
     * @request GET:/note-sequences/{id}
     * @response `200` `GetNoteSequencesByIdData`
     */
    getNoteSequencesById: (id: string, params: RequestParams = {}) =>
      this.http.request<GetNoteSequencesByIdData, any>({
        path: `/note-sequences/${id}`,
        method: 'GET',
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Note Sequences
     * @name PatchNoteSequencesById
     * @request PATCH:/note-sequences/{id}
     * @response `200` `PatchNoteSequencesByIdData`
     */
    patchNoteSequencesById: (id: string, data: PatchNoteSequencesByIdPayload, params: RequestParams = {}) =>
      this.http.request<PatchNoteSequencesByIdData, any>({
        path: `/note-sequences/${id}`,
        method: 'PATCH',
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Note Sequences
     * @name PostNoteSequences
     * @request POST:/note-sequences
     * @response `200` `PostNoteSequencesData`
     */
    postNoteSequences: (data: PostNoteSequencesPayload, params: RequestParams = {}) =>
      this.http.request<PostNoteSequencesData, any>({
        path: `/note-sequences`,
        method: 'POST',
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),
  };
  pages = {
    /**
     * No description
     *
     * @tags Pages
     * @name DeletePagesById
     * @request DELETE:/pages/{id}
     * @response `200` `DeletePagesByIdData`
     */
    deletePagesById: (id: string, params: RequestParams = {}) =>
      this.http.request<DeletePagesByIdData, any>({
        path: `/pages/${id}`,
        method: 'DELETE',
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Pages
     * @name GetPages
     * @request GET:/pages
     * @response `200` `GetPagesData`
     */
    getPages: (query: GetPagesParams, params: RequestParams = {}) =>
      this.http.request<GetPagesData, any>({
        path: `/pages`,
        method: 'GET',
        query: query,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Pages
     * @name GetPagesById
     * @request GET:/pages/{id}
     * @response `200` `GetPagesByIdData`
     */
    getPagesById: (id: string, params: RequestParams = {}) =>
      this.http.request<GetPagesByIdData, any>({
        path: `/pages/${id}`,
        method: 'GET',
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Pages
     * @name PatchPagesById
     * @request PATCH:/pages/{id}
     * @response `200` `PatchPagesByIdData`
     */
    patchPagesById: (id: string, data: PatchPagesByIdPayload, params: RequestParams = {}) =>
      this.http.request<PatchPagesByIdData, any>({
        path: `/pages/${id}`,
        method: 'PATCH',
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Pages
     * @name PostPages
     * @request POST:/pages
     * @response `200` `PostPagesData`
     */
    postPages: (data: PostPagesPayload, params: RequestParams = {}) =>
      this.http.request<PostPagesData, any>({
        path: `/pages`,
        method: 'POST',
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Pages
     * @name PostPagesReorder
     * @request POST:/pages/reorder
     * @response `200` `PostPagesReorderData`
     */
    postPagesReorder: (data: PostPagesReorderPayload, params: RequestParams = {}) =>
      this.http.request<PostPagesReorderData, any>({
        path: `/pages/reorder`,
        method: 'POST',
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),
  };
  phraseMaps = {
    /**
     * No description
     *
     * @tags Phrase Maps
     * @name DeletePhraseMapsById
     * @request DELETE:/phrase-maps/{id}
     * @response `200` `DeletePhraseMapsByIdData`
     */
    deletePhraseMapsById: (id: string, params: RequestParams = {}) =>
      this.http.request<DeletePhraseMapsByIdData, any>({
        path: `/phrase-maps/${id}`,
        method: 'DELETE',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Phrase Maps
     * @name DeletePhraseMapsByIdBarsByBarId
     * @request DELETE:/phrase-maps/{id}/bars/{barId}
     * @response `200` `DeletePhraseMapsByIdBarsByBarIdData`
     */
    deletePhraseMapsByIdBarsByBarId: (id: string, barId: string, params: RequestParams = {}) =>
      this.http.request<DeletePhraseMapsByIdBarsByBarIdData, any>({
        path: `/phrase-maps/${id}/bars/${barId}`,
        method: 'DELETE',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Phrase Maps
     * @name GetPhraseMaps
     * @request GET:/phrase-maps
     * @response `200` `GetPhraseMapsData`
     */
    getPhraseMaps: (query: GetPhraseMapsParams, params: RequestParams = {}) =>
      this.http.request<GetPhraseMapsData, any>({
        path: `/phrase-maps`,
        method: 'GET',
        query: query,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Phrase Maps
     * @name GetPhraseMapsById
     * @request GET:/phrase-maps/{id}
     * @response `200` `GetPhraseMapsByIdData`
     */
    getPhraseMapsById: (id: string, params: RequestParams = {}) =>
      this.http.request<GetPhraseMapsByIdData, any>({
        path: `/phrase-maps/${id}`,
        method: 'GET',
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Phrase Maps
     * @name PatchPhraseMapsById
     * @request PATCH:/phrase-maps/{id}
     * @response `200` `PatchPhraseMapsByIdData`
     */
    patchPhraseMapsById: (id: string, data: PatchPhraseMapsByIdPayload, params: RequestParams = {}) =>
      this.http.request<PatchPhraseMapsByIdData, any>({
        path: `/phrase-maps/${id}`,
        method: 'PATCH',
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Phrase Maps
     * @name PatchPhraseMapsByIdBarsByBarId
     * @request PATCH:/phrase-maps/{id}/bars/{barId}
     * @response `200` `PatchPhraseMapsByIdBarsByBarIdData`
     */
    patchPhraseMapsByIdBarsByBarId: (
      id: string,
      barId: string,
      data: PatchPhraseMapsByIdBarsByBarIdPayload,
      params: RequestParams = {},
    ) =>
      this.http.request<PatchPhraseMapsByIdBarsByBarIdData, any>({
        path: `/phrase-maps/${id}/bars/${barId}`,
        method: 'PATCH',
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Phrase Maps
     * @name PostPhraseMaps
     * @request POST:/phrase-maps
     * @response `200` `PostPhraseMapsData`
     */
    postPhraseMaps: (data: PostPhraseMapsPayload, params: RequestParams = {}) =>
      this.http.request<PostPhraseMapsData, any>({
        path: `/phrase-maps`,
        method: 'POST',
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Phrase Maps
     * @name PostPhraseMapsByIdBars
     * @request POST:/phrase-maps/{id}/bars
     * @response `200` `PostPhraseMapsByIdBarsData`
     */
    postPhraseMapsByIdBars: (id: string, data: PostPhraseMapsByIdBarsPayload, params: RequestParams = {}) =>
      this.http.request<PostPhraseMapsByIdBarsData, any>({
        path: `/phrase-maps/${id}/bars`,
        method: 'POST',
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),
  };
  playAlong = {
    /**
     * No description
     *
     * @tags Play-Along
     * @name DeletePlayAlongById
     * @request DELETE:/play-along/{id}
     * @response `200` `DeletePlayAlongByIdData`
     */
    deletePlayAlongById: (id: string, params: RequestParams = {}) =>
      this.http.request<DeletePlayAlongByIdData, any>({
        path: `/play-along/${id}`,
        method: 'DELETE',
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Play-Along
     * @name DeletePlayAlongByIdFiles
     * @request DELETE:/play-along/{id}/files
     * @response `200` `DeletePlayAlongByIdFilesData`
     */
    deletePlayAlongByIdFiles: ({ id, ...query }: DeletePlayAlongByIdFilesParams, params: RequestParams = {}) =>
      this.http.request<DeletePlayAlongByIdFilesData, any>({
        path: `/play-along/${id}/files`,
        method: 'DELETE',
        query: query,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Play-Along
     * @name GetPlayAlong
     * @request GET:/play-along
     * @response `200` `GetPlayAlongData`
     */
    getPlayAlong: (query: GetPlayAlongParams, params: RequestParams = {}) =>
      this.http.request<GetPlayAlongData, any>({
        path: `/play-along`,
        method: 'GET',
        query: query,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Play-Along
     * @name GetPlayAlongById
     * @request GET:/play-along/{id}
     * @response `200` `GetPlayAlongByIdData`
     */
    getPlayAlongById: (id: string, params: RequestParams = {}) =>
      this.http.request<GetPlayAlongByIdData, any>({
        path: `/play-along/${id}`,
        method: 'GET',
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Play-Along
     * @name PatchPlayAlongById
     * @request PATCH:/play-along/{id}
     * @response `200` `PatchPlayAlongByIdData`
     */
    patchPlayAlongById: (id: string, data: PatchPlayAlongByIdPayload, params: RequestParams = {}) =>
      this.http.request<PatchPlayAlongByIdData, any>({
        path: `/play-along/${id}`,
        method: 'PATCH',
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Play-Along
     * @name PostPlayAlong
     * @request POST:/play-along
     * @response `200` `PostPlayAlongData`
     */
    postPlayAlong: (data: PostPlayAlongPayload, params: RequestParams = {}) =>
      this.http.request<PostPlayAlongData, any>({
        path: `/play-along`,
        method: 'POST',
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Play-Along
     * @name PostPlayAlongByIdFiles
     * @request POST:/play-along/{id}/files
     * @response `200` `PostPlayAlongByIdFilesData`
     */
    postPlayAlongByIdFiles: (id: string, data: PostPlayAlongByIdFilesPayload, params: RequestParams = {}) =>
      this.http.request<PostPlayAlongByIdFilesData, any>({
        path: `/play-along/${id}/files`,
        method: 'POST',
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Play-Along
     * @name PostPlayAlongByIdUploadUrl
     * @request POST:/play-along/{id}/upload-url
     * @response `200` `PostPlayAlongByIdUploadUrlData`
     */
    postPlayAlongByIdUploadUrl: (id: string, data: PostPlayAlongByIdUploadUrlPayload, params: RequestParams = {}) =>
      this.http.request<PostPlayAlongByIdUploadUrlData, any>({
        path: `/play-along/${id}/upload-url`,
        method: 'POST',
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),
  };
  practiceEvents = {
    /**
     * No description
     *
     * @tags Practice Events
     * @name GetPracticeEvents
     * @request GET:/practice-events
     * @response `200` `GetPracticeEventsData`
     */
    getPracticeEvents: (query: GetPracticeEventsParams, params: RequestParams = {}) =>
      this.http.request<GetPracticeEventsData, any>({
        path: `/practice-events`,
        method: 'GET',
        query: query,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Practice Events
     * @name PostPracticeEvents
     * @request POST:/practice-events
     * @response `200` `PostPracticeEventsData`
     */
    postPracticeEvents: (data: PostPracticeEventsPayload, params: RequestParams = {}) =>
      this.http.request<PostPracticeEventsData, any>({
        path: `/practice-events`,
        method: 'POST',
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),
  };
  students = {
    /**
     * No description
     *
     * @tags Students
     * @name DeleteStudentsById
     * @request DELETE:/students/{id}
     * @response `200` `DeleteStudentsByIdData`
     */
    deleteStudentsById: (id: string, params: RequestParams = {}) =>
      this.http.request<DeleteStudentsByIdData, any>({
        path: `/students/${id}`,
        method: 'DELETE',
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Students
     * @name GetStudents
     * @request GET:/students
     * @response `200` `GetStudentsData`
     */
    getStudents: (query: GetStudentsParams, params: RequestParams = {}) =>
      this.http.request<GetStudentsData, any>({
        path: `/students`,
        method: 'GET',
        query: query,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Students
     * @name GetStudentsById
     * @request GET:/students/{id}
     * @response `200` `GetStudentsByIdData`
     */
    getStudentsById: (id: string, params: RequestParams = {}) =>
      this.http.request<GetStudentsByIdData, any>({
        path: `/students/${id}`,
        method: 'GET',
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Students
     * @name PatchStudentsById
     * @request PATCH:/students/{id}
     * @response `200` `PatchStudentsByIdData`
     */
    patchStudentsById: (id: string, data: PatchStudentsByIdPayload, params: RequestParams = {}) =>
      this.http.request<PatchStudentsByIdData, any>({
        path: `/students/${id}`,
        method: 'PATCH',
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Students
     * @name PatchStudentsByIdRestore
     * @request PATCH:/students/{id}/restore
     * @response `200` `PatchStudentsByIdRestoreData`
     */
    patchStudentsByIdRestore: (id: string, params: RequestParams = {}) =>
      this.http.request<PatchStudentsByIdRestoreData, any>({
        path: `/students/${id}/restore`,
        method: 'PATCH',
        format: 'json',
        ...params,
      }),
  };
  tunes = {
    /**
     * No description
     *
     * @tags Tunes
     * @name DeleteTunesById
     * @request DELETE:/tunes/{id}
     * @response `200` `DeleteTunesByIdData`
     */
    deleteTunesById: (id: string, params: RequestParams = {}) =>
      this.http.request<DeleteTunesByIdData, any>({
        path: `/tunes/${id}`,
        method: 'DELETE',
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Tunes
     * @name GetTunes
     * @request GET:/tunes
     * @response `200` `GetTunesData`
     */
    getTunes: (params: RequestParams = {}) =>
      this.http.request<GetTunesData, any>({
        path: `/tunes`,
        method: 'GET',
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Tunes
     * @name GetTunesById
     * @request GET:/tunes/{id}
     * @response `200` `GetTunesByIdData`
     */
    getTunesById: (id: string, params: RequestParams = {}) =>
      this.http.request<GetTunesByIdData, any>({
        path: `/tunes/${id}`,
        method: 'GET',
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Tunes
     * @name PatchTunesById
     * @request PATCH:/tunes/{id}
     * @response `200` `PatchTunesByIdData`
     */
    patchTunesById: (id: string, data: PatchTunesByIdPayload, params: RequestParams = {}) =>
      this.http.request<PatchTunesByIdData, any>({
        path: `/tunes/${id}`,
        method: 'PATCH',
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Tunes
     * @name PostTunes
     * @request POST:/tunes
     * @response `200` `PostTunesData`
     */
    postTunes: (data: PostTunesPayload, params: RequestParams = {}) =>
      this.http.request<PostTunesData, any>({
        path: `/tunes`,
        method: 'POST',
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),
  };
  media = {
    /**
     * No description
     *
     * @tags Media
     * @name PostMedia
     * @request POST:/media
     * @response `200` `PostMediaData`
     */
    postMedia: (data: PostMediaPayload, params: RequestParams = {}) =>
      this.http.request<PostMediaData, any>({
        path: `/media`,
        method: 'POST',
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Media
     * @name PostMediaGetUploadUrl
     * @request POST:/media/get-upload-url
     * @response `200` `PostMediaGetUploadUrlData`
     */
    postMediaGetUploadUrl: (query: PostMediaGetUploadUrlParams, params: RequestParams = {}) =>
      this.http.request<PostMediaGetUploadUrlData, any>({
        path: `/media/get-upload-url`,
        method: 'POST',
        query: query,
        format: 'json',
        ...params,
      }),
  };
}

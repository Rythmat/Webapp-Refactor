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

export type DeleteApiAdminFreeAccessByIdData = any;

export type DeleteAuthSessionData = any;

export interface DeleteClassroomsByIdStudentsByStudentIdData {
  id: string;
  removed: boolean;
  removedAt: Date;
}

export interface DeleteCollectionsByIdData {
  deletedCollectionId: string;
  success: boolean;
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

export type GetApiAdminFreeAccessData = any;

export type GetApiAdminUsersData = any;

export interface GetApiAdminUsersParams {
  role?: 'admin' | 'teacher' | 'student';
  search?: string;
}

export type GetApiBillingConfigData = any;

export type GetApiBillingCreditsBalanceData = any;

export type GetApiBillingSubscriptionData = any;

export type GetApiMeSubscriptionData = any;

export type GetApiProgressLessonData = any;

export interface GetApiProgressLessonParams {
  lessonId: string;
  lessonVersion: string | number;
}

export type GetApiProgressSummaryData = any;

export type GetAtlasCitiesData = any;

export type GetAtlasErasData = any;

export type GetAtlasEventsData = any;

export interface GetAtlasEventsParams {
  limit?: string | number;
}

export type GetAtlasModulesData = any;

export type GetAtlasRegionsData = any;

export type GetAtlasSearchData = any;

export interface GetAtlasSearchParams {
  q: string;
}

export interface GetAuthMeData {
  auth0Sub: string | null;
  avatarConfig: null;
  avatarUrl: string | null;
  birthDate: (Date) | null;
  createdAt: Date;
  email: string | null;
  fullName: string | null;
  id: string;
  nickname: string;
  organizations: {
    createdAt: Date;
    id: string;
    organization: {
      auth0OrgId: string | null;
      id: string;
      name: string;
      slug: string | null;
    };
    organizationId: string;
    role: string;
    status: string;
    updatedAt: Date;
  }[];
  role: string;
  school: string | null;
  updatedAt: Date;
  username: string | null;
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
  color: string | null;
  createdAt: Date;
  description: string | null;
  id: string;
  name: string;
  updatedAt: Date;
}

export type GetCollectionsData = {
  color: string | null;
  createdAt: Date;
  description: string | null;
  id: string;
  name: string;
  updatedAt: Date;
}[];

export type GetNotesData = {
  key: string;
  midi: number;
  noteName: string;
  noteNameFlat: string | null;
  noteNameSharp: string | null;
  octave: number;
  offset: number;
}[];

export interface GetPrismChordsByNameData {
  chord: number[];
}

export interface GetPrismChordsData {
  chords: string[];
}

export interface GetPrismChordsProgressionsData {
  keys: string[];
}

export interface GetPrismContoursStartData {
  contours: object;
}

export interface GetPrismModesByModeChordsData {
  chords: object;
}

export interface GetPrismModesByModeChordsDataData {
  chords: object;
}

export interface GetPrismModesByModeData {
  steps: number[];
}

export interface GetPrismModesData {
  modes: object;
}

export interface GetPrismModesFamilyByFamilyData {
  modes: object;
}

export interface GetPrismModesFamilyData {
  families: ('diatonic' | 'harmonic minor' | 'melodic minor' | 'harmonic major' | 'double harmonic')[];
}

export interface GetStudentsByIdData {
  birthDate: (Date) | null;
  classroomCount: number;
  createdAt: Date;
  email: string | null;
  fullName: string | null;
  id: string;
  nickname: string;
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
  avatarConfig?: Record<string, unknown> | null;
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

export type PatchApiAdminFreeAccessByIdData = any;

export interface PatchApiAdminFreeAccessByIdPayload {
  duration: 'perpetual' | 'temporary';
  expiresAt?: string | null;
}

export type PatchApiProgressActivityData = any;

export interface PatchApiProgressActivityPayload {
  activityDefId: string;
  activityInstanceId: string;
  attemptsDelta?: number;
  lessonId: string;
  lessonVersion: number;
  mode: string;
  resumePayloadJson?: any;
  root: string;
  score?: number | null;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
}

export type PatchApiProgressLessonStateData = any;

export interface PatchApiProgressLessonStatePayload {
  currentActivityInstanceId: string | null;
  lessonId: string;
  lessonVersion: number;
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
  color: string | null;
  createdAt: Date;
  description: string | null;
  id: string;
  name: string;
  updatedAt: Date;
}

export interface PatchCollectionsByIdPayload {
  color?: string;
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

export type PostApiAdminFreeAccessData = any;

export interface PostApiAdminFreeAccessPayload {
  duration?: 'perpetual' | 'temporary';
  expiresAt?: string | null;
  type: 'email' | 'domain';
  /** @minLength 1 */
  value: string;
}

export type PostApiBillingCreateCheckoutSessionData = any;

export type PostApiBillingCreatePortalSessionData = any;

export type PostApiBillingCreditsConsumeData = any;

export type PostApiBillingInternalStripeEventData = any;

export interface PostApiBillingInternalStripeEventPayload {
  customerId: string;
  event:
    | 'checkout.session.completed'
    | 'customer.subscription.updated'
    | 'customer.subscription.deleted'
    | 'invoice.payment_succeeded';
  stripePeriodEnd?: number | null;
  stripeSubscriptionId?: string | null;
  tier?: 'free' | 'artist' | 'studio';
  userId?: string;
}

export type PostApiStripeWebhookData = any;

export type PostApiStripeWebhookPayload = string;

export type PostApiStudioAnalyzeVideoData = any;

export interface PostApiStudioAnalyzeVideoPayload {
  keyframes: any[];
}

export type PostApiStudioCurateSoundsData = any;

export type PostApiStudioCurateSoundsPayload = any;

export type PostApiStudioGenerateScoreData = any;

export type PostApiStudioGenerateScorePayload = any;

export type PostApiStudioGenerateTrackData = any;

export interface PostApiStudioGenerateTrackPayload {
  context?: any;
  prompt: string;
  trackType: 'audio' | 'midi';
}

export type PostApiStudioReplicateGenerateData = any;

export type PostApiStudioReplicateGeneratePayload = any;

export type PostApiStudioSearchSfxData = any;

export interface PostApiStudioSearchSfxPayload {
  limit?: number;
  query: string;
}

export type PostAtlasAiAnalyzeData = any;

export interface PostAtlasAiAnalyzePayload {
  city?: string;
  genres?: string[];
  localResults?: {
    genre: string[];
    title: string;
    year: number;
  }[];
  query: string;
  year?: number;
}

export type PostAtlasParseQueryData = any;

export interface PostAtlasParseQueryPayload {
  query: string;
}

export interface PostAuthCompleteSignupStudentData {
  classroomId: string;
  ok: true;
  role: 'student';
}

export interface PostAuthCompleteSignupStudentPayload {
  birthDate: Date;
  code: string;
  nickname: string;
  username: string;
}

export interface PostAuthCompleteSignupTeacherData {
  ok: true;
  role: 'teacher';
}

export interface PostAuthCompleteSignupTeacherPayload {
  code: string;
  fullName: string;
  nickname: string;
}

export type PostAuthSessionData = any;

export interface PostAuthSessionPayload {
  token: string;
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

export interface PostCollectionsData {
  color: string | null;
  createdAt: Date;
  description: string | null;
  id: string;
  name: string;
  updatedAt: Date;
}

export interface PostCollectionsPayload {
  color?: string;
  description?: string | null;
  name: string;
}

export interface PostMediaGetUploadUrlData {
  filePath: string;
  signedUrl: string;
}

export interface PostMediaGetUploadUrlParams {
  contentType: string;
  fileName: string;
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

export interface PutAuthMeAvatarConfigData {
  avatarConfig: any;
}

export interface PutAuthMeAvatarConfigPayload {
  /**
   * @min 2
   * @max 8
   */
  cellSize: number;
  /**
   * @min -30
   * @max 30
   */
  hueShift: number;
  isGradient: boolean;
  /**
   * @min -20
   * @max 20
   */
  lightnessShift: number;
  noiseType: 'simplex' | 'diagonal' | 'circle' | 'sinCos' | 'line';
  orientation: 'pointy' | 'flat';
  /**
   * @min 0
   * @max 199
   */
  paletteIndex: number;
  /**
   * @min -20
   * @max 20
   */
  saturationShift: number;
  seed: number;
  /**
   * @min 5
   * @max 20
   */
  zoom: number;
}

export namespace Auth {
  /**
   * No description
   * @tags Auth
   * @name DeleteAuthSession
   * @request DELETE:/auth/session
   * @response `200` `DeleteAuthSessionData`
   */
  export namespace DeleteAuthSession {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteAuthSessionData;
  }

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
   * @name PostAuthCompleteSignupStudent
   * @request POST:/auth/complete-signup/student
   * @response `200` `PostAuthCompleteSignupStudentData`
   */
  export namespace PostAuthCompleteSignupStudent {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = PostAuthCompleteSignupStudentPayload;
    export type RequestHeaders = {};
    export type ResponseBody = PostAuthCompleteSignupStudentData;
  }

  /**
   * No description
   * @tags Auth
   * @name PostAuthCompleteSignupTeacher
   * @request POST:/auth/complete-signup/teacher
   * @response `200` `PostAuthCompleteSignupTeacherData`
   */
  export namespace PostAuthCompleteSignupTeacher {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = PostAuthCompleteSignupTeacherPayload;
    export type RequestHeaders = {};
    export type ResponseBody = PostAuthCompleteSignupTeacherData;
  }

  /**
   * No description
   * @tags Auth
   * @name PostAuthSession
   * @request POST:/auth/session
   * @response `200` `PostAuthSessionData`
   */
  export namespace PostAuthSession {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = PostAuthSessionPayload;
    export type RequestHeaders = {};
    export type ResponseBody = PostAuthSessionData;
  }

  /**
   * No description
   * @tags Auth
   * @name PutAuthMeAvatarConfig
   * @request PUT:/auth/me/avatar-config
   * @response `200` `PutAuthMeAvatarConfigData`
   */
  export namespace PutAuthMeAvatarConfig {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = PutAuthMeAvatarConfigPayload;
    export type RequestHeaders = {};
    export type ResponseBody = PutAuthMeAvatarConfigData;
  }
}

export namespace Atlas {
  /**
   * No description
   * @tags Atlas
   * @name GetAtlasCities
   * @request GET:/atlas/cities
   * @response `200` `GetAtlasCitiesData`
   */
  export namespace GetAtlasCities {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetAtlasCitiesData;
  }

  /**
   * No description
   * @tags Atlas
   * @name GetAtlasEras
   * @request GET:/atlas/eras
   * @response `200` `GetAtlasErasData`
   */
  export namespace GetAtlasEras {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetAtlasErasData;
  }

  /**
   * No description
   * @tags Atlas
   * @name GetAtlasEvents
   * @request GET:/atlas/events
   * @response `200` `GetAtlasEventsData`
   */
  export namespace GetAtlasEvents {
    export type RequestParams = {};
    export type RequestQuery = {
      limit?: string | number;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetAtlasEventsData;
  }

  /**
   * No description
   * @tags Atlas
   * @name GetAtlasModules
   * @request GET:/atlas/modules
   * @response `200` `GetAtlasModulesData`
   */
  export namespace GetAtlasModules {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetAtlasModulesData;
  }

  /**
   * No description
   * @tags Atlas
   * @name GetAtlasRegions
   * @request GET:/atlas/regions
   * @response `200` `GetAtlasRegionsData`
   */
  export namespace GetAtlasRegions {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetAtlasRegionsData;
  }

  /**
   * No description
   * @tags Atlas
   * @name GetAtlasSearch
   * @request GET:/atlas/search
   * @response `200` `GetAtlasSearchData`
   */
  export namespace GetAtlasSearch {
    export type RequestParams = {};
    export type RequestQuery = {
      q: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetAtlasSearchData;
  }

  /**
   * No description
   * @tags Atlas
   * @name PostAtlasAiAnalyze
   * @request POST:/atlas/ai/analyze
   * @response `200` `PostAtlasAiAnalyzeData`
   */
  export namespace PostAtlasAiAnalyze {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = PostAtlasAiAnalyzePayload;
    export type RequestHeaders = {};
    export type ResponseBody = PostAtlasAiAnalyzeData;
  }

  /**
   * No description
   * @tags Atlas
   * @name PostAtlasParseQuery
   * @request POST:/atlas/parse-query
   * @response `200` `PostAtlasParseQueryData`
   */
  export namespace PostAtlasParseQuery {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = PostAtlasParseQueryPayload;
    export type RequestHeaders = {};
    export type ResponseBody = PostAtlasParseQueryData;
  }
}

export namespace Billing {
  /**
   * No description
   * @tags Billing
   * @name GetApiBillingConfig
   * @request GET:/api/billing/config
   * @response `200` `GetApiBillingConfigData`
   */
  export namespace GetApiBillingConfig {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetApiBillingConfigData;
  }

  /**
   * No description
   * @tags Billing
   * @name GetApiBillingCreditsBalance
   * @request GET:/api/billing/credits/balance
   * @response `200` `GetApiBillingCreditsBalanceData`
   */
  export namespace GetApiBillingCreditsBalance {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetApiBillingCreditsBalanceData;
  }

  /**
   * No description
   * @tags Billing
   * @name GetApiBillingSubscription
   * @request GET:/api/billing/subscription
   * @response `200` `GetApiBillingSubscriptionData`
   */
  export namespace GetApiBillingSubscription {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetApiBillingSubscriptionData;
  }

  /**
   * No description
   * @tags Billing
   * @name PostApiBillingCreditsConsume
   * @request POST:/api/billing/credits/consume
   * @response `200` `PostApiBillingCreditsConsumeData`
   */
  export namespace PostApiBillingCreditsConsume {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = PostApiBillingCreditsConsumeData;
  }

  /**
   * No description
   * @tags Billing
   * @name PostApiBillingInternalStripeEvent
   * @request POST:/api/billing/internal/stripe-event
   * @response `200` `PostApiBillingInternalStripeEventData`
   */
  export namespace PostApiBillingInternalStripeEvent {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = PostApiBillingInternalStripeEventPayload;
    export type RequestHeaders = {};
    export type ResponseBody = PostApiBillingInternalStripeEventData;
  }
}

export namespace Stripe {
  /**
   * @description Creates a Stripe Checkout session in subscription mode for the authenticated user. Finds or creates the Stripe customer automatically.
   * @tags Stripe
   * @name PostApiBillingCreateCheckoutSession
   * @summary Create Stripe Checkout subscription session
   * @request POST:/api/billing/create-checkout-session
   * @secure
   * @response `200` `PostApiBillingCreateCheckoutSessionData`
   */
  export namespace PostApiBillingCreateCheckoutSession {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = PostApiBillingCreateCheckoutSessionData;
  }

  /**
   * @description Creates a Stripe Billing Portal session so the authenticated user can manage their subscription, payment methods, and invoices.
   * @tags Stripe
   * @name PostApiBillingCreatePortalSession
   * @summary Create Stripe Billing Portal session
   * @request POST:/api/billing/create-portal-session
   * @secure
   * @response `200` `PostApiBillingCreatePortalSessionData`
   */
  export namespace PostApiBillingCreatePortalSession {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = PostApiBillingCreatePortalSessionData;
  }

  /**
   * @description Stripe webhook endpoint. Raw body is required for signature verification. Do not add JSON middleware to this route.
   * @tags Stripe
   * @name PostApiStripeWebhook
   * @summary Stripe webhook
   * @request POST:/api/stripe/webhook
   * @response `200` `PostApiStripeWebhookData`
   */
  export namespace PostApiStripeWebhook {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = PostApiStripeWebhookPayload;
    export type RequestHeaders = {};
    export type ResponseBody = PostApiStripeWebhookData;
  }
}

export namespace Me {
  /**
   * @description Returns billing and subscription state for the authenticated user. hasPaidAccess is true for active/trialing subscriptions.
   * @tags Me
   * @name GetApiMeSubscription
   * @summary Get current user subscription status
   * @request GET:/api/me/subscription
   * @secure
   * @response `200` `GetApiMeSubscriptionData`
   */
  export namespace GetApiMeSubscription {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetApiMeSubscriptionData;
  }
}

export namespace Admin {
  /**
   * No description
   * @tags Admin
   * @name DeleteApiAdminFreeAccessById
   * @request DELETE:/api/admin/free-access/{id}
   * @response `200` `DeleteApiAdminFreeAccessByIdData`
   */
  export namespace DeleteApiAdminFreeAccessById {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = DeleteApiAdminFreeAccessByIdData;
  }

  /**
   * No description
   * @tags Admin
   * @name GetApiAdminFreeAccess
   * @request GET:/api/admin/free-access
   * @response `200` `GetApiAdminFreeAccessData`
   */
  export namespace GetApiAdminFreeAccess {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetApiAdminFreeAccessData;
  }

  /**
   * No description
   * @tags Admin
   * @name GetApiAdminUsers
   * @request GET:/api/admin/users
   * @response `200` `GetApiAdminUsersData`
   */
  export namespace GetApiAdminUsers {
    export type RequestParams = {};
    export type RequestQuery = {
      role?: 'admin' | 'teacher' | 'student';
      search?: string;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetApiAdminUsersData;
  }

  /**
   * No description
   * @tags Admin
   * @name PatchApiAdminFreeAccessById
   * @request PATCH:/api/admin/free-access/{id}
   * @response `200` `PatchApiAdminFreeAccessByIdData`
   */
  export namespace PatchApiAdminFreeAccessById {
    export type RequestParams = {
      id: string;
    };
    export type RequestQuery = {};
    export type RequestBody = PatchApiAdminFreeAccessByIdPayload;
    export type RequestHeaders = {};
    export type ResponseBody = PatchApiAdminFreeAccessByIdData;
  }

  /**
   * No description
   * @tags Admin
   * @name PostApiAdminFreeAccess
   * @request POST:/api/admin/free-access
   * @response `200` `PostApiAdminFreeAccessData`
   */
  export namespace PostApiAdminFreeAccess {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = PostApiAdminFreeAccessPayload;
    export type RequestHeaders = {};
    export type ResponseBody = PostApiAdminFreeAccessData;
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
    export type RequestQuery = {};
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

export namespace Progress {
  /**
   * No description
   * @tags Progress
   * @name GetApiProgressLesson
   * @request GET:/api/progress/lesson
   * @response `200` `GetApiProgressLessonData`
   */
  export namespace GetApiProgressLesson {
    export type RequestParams = {};
    export type RequestQuery = {
      lessonId: string;
      lessonVersion: string | number;
    };
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetApiProgressLessonData;
  }

  /**
   * No description
   * @tags Progress
   * @name GetApiProgressSummary
   * @request GET:/api/progress/summary
   * @response `200` `GetApiProgressSummaryData`
   */
  export namespace GetApiProgressSummary {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetApiProgressSummaryData;
  }

  /**
   * No description
   * @tags Progress
   * @name PatchApiProgressActivity
   * @request PATCH:/api/progress/activity
   * @response `200` `PatchApiProgressActivityData`
   */
  export namespace PatchApiProgressActivity {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = PatchApiProgressActivityPayload;
    export type RequestHeaders = {};
    export type ResponseBody = PatchApiProgressActivityData;
  }

  /**
   * No description
   * @tags Progress
   * @name PatchApiProgressLessonState
   * @request PATCH:/api/progress/lessonState
   * @response `200` `PatchApiProgressLessonStateData`
   */
  export namespace PatchApiProgressLessonState {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = PatchApiProgressLessonStatePayload;
    export type RequestHeaders = {};
    export type ResponseBody = PatchApiProgressLessonStateData;
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

export namespace Media {
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

export namespace Music {
  /**
   * No description
   * @tags Music
   * @name GetPrismChords
   * @request GET:/prism/chords
   * @response `200` `GetPrismChordsData`
   */
  export namespace GetPrismChords {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetPrismChordsData;
  }

  /**
   * No description
   * @tags Music
   * @name GetPrismChordsByName
   * @request GET:/prism/chords/{name}
   * @response `200` `GetPrismChordsByNameData`
   */
  export namespace GetPrismChordsByName {
    export type RequestParams = {
      name:
        | 'major'
        | 'major (♭5)'
        | 'minor'
        | 'minor (♭5)'
        | 'augmented'
        | 'diminished'
        | 'suspended 2'
        | 'quartal'
        | 'suspended 4'
        | 'major 4'
        | 'minor 4'
        | 'suspended (#4)'
        | 'suspended (♭2)'
        | 'suspended (♭2♭5)'
        | 'suspended 2(♭5)'
        | 'suspended 2(♭5) add 6'
        | 'suspended 2(♭5) add 6(♭9)'
        | 'major 6'
        | 'minor 6'
        | 'minor 6 add ♭9'
        | 'diminished 7'
        | 'diminished 7(♭9)'
        | 'minor 7(♭5)'
        | 'diminished major 7'
        | 'diminished major 9'
        | 'dominant 7'
        | 'dominant 9'
        | 'major 7'
        | 'major 7(#5)'
        | 'major 7(♭5)'
        | 'major 7(♭9)'
        | 'major 7(#9)'
        | 'major 7(#5#9)'
        | 'minor 7'
        | 'minor 7(#5)'
        | 'minor 7(♭9)'
        | 'minor 7(♭5♭9)'
        | 'minor major 7'
        | 'dominant 7 suspended 2'
        | 'dominant 7 suspended 4'
        | 'major 7 suspended 2'
        | 'major 7 suspended 4'
        | 'dominant 7(♭5)'
        | 'dominant 7(#5)'
        | 'dominant 7(#9)'
        | 'dominant 7(#5#9)'
        | 'major (add 2)'
        | 'major (add 4)'
        | 'dominant 7(#11)'
        | 'major/5'
        | 'major/4'
        | 'major/3'
        | 'dominant 7(♭9)'
        | 'dominant 7(#5♭9)'
        | 'dominant 7(♭5♭9)'
        | 'major/6'
        | 'major 7(#11)'
        | 'major/1'
        | 'minor 6/5'
        | 'minor 6/♭3'
        | 'minor 7(♭5)/4'
        | 'major 7/5'
        | 'major/#5'
        | 'major/7'
        | 'minor 7(♭5)/5'
        | 'minor 6/♭6'
        | 'major 9'
        | 'major 9(#5)'
        | 'minor 9'
        | 'minor 9(♭5)'
        | 'major 6/9'
        | 'minor 6/9'
        | 'diminished 7(add 9)'
        | 'dominant 9 suspended 4'
        | 'dominant (♭9) suspended 4'
        | 'minor major 9'
        | 'diminished 6/9'
        | 'dominant 9(#5)'
        | 'Add2'
        | 'Add4'
        | 'b7dominant7#11'
        | 'diminished7'
        | 'diminished7b9'
        | 'diminishedmajor7'
        | 'dominant7'
        | 'dominant7#11'
        | 'dominant7#5'
        | 'dominant7#5#9'
        | 'dominant7#5b9'
        | 'dominant7#9'
        | 'dominant7b5'
        | 'dominant7b9'
        | 'dominant7sus2'
        | 'dominant7sus4'
        | 'dominant9'
        | 'dominant9#5'
        | 'major4'
        | 'major6'
        | 'major6add9'
        | 'major7'
        | 'major7#11'
        | 'major7#5'
        | 'major7#5#9'
        | 'major7#9'
        | 'major7/5'
        | 'major7b5'
        | 'major7diminished'
        | 'major7sus2'
        | 'major7sus4'
        | 'major9'
        | 'major9#5'
        | 'minor4'
        | 'minor6'
        | 'minor6/5'
        | 'minor6/♭3'
        | 'minor6/♭6'
        | 'minor6add9'
        | 'minor7'
        | 'minor7#5'
        | 'minor7b5'
        | 'minor7b5/4'
        | 'minor7b5/5'
        | 'minor7b5b9'
        | 'minor7b9'
        | 'minor9'
        | 'minor9b5'
        | 'minormajor7'
        | 'minormajor9'
        | 'sus#4'
        | 'sus2'
        | 'sus4'
        | 'susb2'
        | 'susb2b5';
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetPrismChordsByNameData;
  }

  /**
   * No description
   * @tags Music
   * @name GetPrismChordsProgressions
   * @request GET:/prism/chords/progressions
   * @response `200` `GetPrismChordsProgressionsData`
   */
  export namespace GetPrismChordsProgressions {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetPrismChordsProgressionsData;
  }

  /**
   * No description
   * @tags Music
   * @name GetPrismContoursStart
   * @request GET:/prism/contours/start
   * @response `200` `GetPrismContoursStartData`
   */
  export namespace GetPrismContoursStart {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetPrismContoursStartData;
  }

  /**
   * No description
   * @tags Music
   * @name GetPrismModes
   * @request GET:/prism/modes
   * @response `200` `GetPrismModesData`
   */
  export namespace GetPrismModes {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetPrismModesData;
  }

  /**
   * No description
   * @tags Music
   * @name GetPrismModesByMode
   * @request GET:/prism/modes/{mode}
   * @response `200` `GetPrismModesByModeData`
   */
  export namespace GetPrismModesByMode {
    export type RequestParams = {
      mode:
        | 'ionian'
        | 'dorian'
        | 'phrygian'
        | 'lydian'
        | 'mixolydian'
        | 'aeolian'
        | 'locrian'
        | 'harmonicminor'
        | 'locriannat6'
        | 'ionian#5'
        | 'dorian#4'
        | 'phrygiandominant'
        | 'lydian#2'
        | 'altereddiminished'
        | 'melodicminor'
        | 'dorian♭2'
        | 'lydianaugmented'
        | 'lydiandominant'
        | 'mixolydiannat6'
        | 'locriannat2'
        | 'altereddominant'
        | 'harmonicmajor'
        | 'dorian♭5'
        | 'altereddominantnat5'
        | 'melodicminor#4'
        | 'mixolydian♭2'
        | 'lydianaugmented#2'
        | 'locrian𝄫7'
        | 'doubleharmonicmajor'
        | 'lydian#2#6'
        | 'ultraphrygian'
        | 'doubleharmonicminor'
        | 'oriental'
        | 'ionian#2#5'
        | 'locrian𝄫3𝄫7'
        | 'majorblues'
        | 'minorblues'
        | 'bebopdominant'
        | 'halfwholediminished'
        | 'wholehalfdiminished'
        | 'messiaen'
        | 'wholetone'
        | 'majorpentatonic'
        | 'minorpentatonic';
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetPrismModesByModeData;
  }

  /**
   * No description
   * @tags Music
   * @name GetPrismModesByModeChords
   * @request GET:/prism/modes/{mode}/chords
   * @response `200` `GetPrismModesByModeChordsData`
   */
  export namespace GetPrismModesByModeChords {
    export type RequestParams = {
      mode:
        | 'ionian'
        | 'dorian'
        | 'phrygian'
        | 'lydian'
        | 'mixolydian'
        | 'aeolian'
        | 'locrian'
        | 'harmonicminor'
        | 'locriannat6'
        | 'ionian#5'
        | 'dorian#4'
        | 'phrygiandominant'
        | 'lydian#2'
        | 'altereddiminished'
        | 'melodicminor'
        | 'dorian♭2'
        | 'lydianaugmented'
        | 'lydiandominant'
        | 'mixolydiannat6'
        | 'locriannat2'
        | 'altereddominant'
        | 'harmonicmajor'
        | 'dorian♭5'
        | 'altereddominantnat5'
        | 'melodicminor#4'
        | 'mixolydian♭2'
        | 'lydianaugmented#2'
        | 'locrian𝄫7'
        | 'doubleharmonicmajor'
        | 'lydian#2#6'
        | 'ultraphrygian'
        | 'doubleharmonicminor'
        | 'oriental'
        | 'ionian#2#5'
        | 'locrian𝄫3𝄫7';
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetPrismModesByModeChordsData;
  }

  /**
   * No description
   * @tags Music
   * @name GetPrismModesByModeChordsData
   * @request GET:/prism/modes/{mode}/chords/data
   * @response `200` `GetPrismModesByModeChordsDataData`
   */
  export namespace GetPrismModesByModeChordsData {
    export type RequestParams = {
      mode:
        | 'ionian'
        | 'dorian'
        | 'phrygian'
        | 'lydian'
        | 'mixolydian'
        | 'aeolian'
        | 'locrian'
        | 'harmonicminor'
        | 'locriannat6'
        | 'ionian#5'
        | 'dorian#4'
        | 'phrygiandominant'
        | 'lydian#2'
        | 'altereddiminished'
        | 'melodicminor'
        | 'dorian♭2'
        | 'lydianaugmented'
        | 'lydiandominant'
        | 'mixolydiannat6'
        | 'locriannat2'
        | 'altereddominant'
        | 'harmonicmajor'
        | 'dorian♭5'
        | 'altereddominantnat5'
        | 'melodicminor#4'
        | 'mixolydian♭2'
        | 'lydianaugmented#2'
        | 'locrian𝄫7'
        | 'doubleharmonicmajor'
        | 'lydian#2#6'
        | 'ultraphrygian'
        | 'doubleharmonicminor'
        | 'oriental'
        | 'ionian#2#5'
        | 'locrian𝄫3𝄫7';
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetPrismModesByModeChordsDataData;
  }

  /**
   * No description
   * @tags Music
   * @name GetPrismModesFamily
   * @request GET:/prism/modes/family
   * @response `200` `GetPrismModesFamilyData`
   */
  export namespace GetPrismModesFamily {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetPrismModesFamilyData;
  }

  /**
   * No description
   * @tags Music
   * @name GetPrismModesFamilyByFamily
   * @request GET:/prism/modes/family/{family}
   * @response `200` `GetPrismModesFamilyByFamilyData`
   */
  export namespace GetPrismModesFamilyByFamily {
    export type RequestParams = {
      family: 'diatonic' | 'harmonic minor' | 'melodic minor' | 'harmonic major' | 'double harmonic';
    };
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = GetPrismModesFamilyByFamilyData;
  }

  /**
   * No description
   * @tags Music
   * @name GetPrismRhythms
   * @request GET:/prism/rhythms
   * @response `melodies` `object`
   * @response `chords` `object`
   */
  export namespace GetPrismRhythms {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = never;
    export type RequestHeaders = {};
    export type ResponseBody = any;
  }
}

export namespace Studio {
  /**
   * No description
   * @tags Studio
   * @name PostApiStudioAnalyzeVideo
   * @request POST:/api/studio/analyze-video
   * @response `200` `PostApiStudioAnalyzeVideoData`
   */
  export namespace PostApiStudioAnalyzeVideo {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = PostApiStudioAnalyzeVideoPayload;
    export type RequestHeaders = {};
    export type ResponseBody = PostApiStudioAnalyzeVideoData;
  }

  /**
   * No description
   * @tags Studio
   * @name PostApiStudioCurateSounds
   * @request POST:/api/studio/curate-sounds
   * @response `200` `PostApiStudioCurateSoundsData`
   */
  export namespace PostApiStudioCurateSounds {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = PostApiStudioCurateSoundsPayload;
    export type RequestHeaders = {};
    export type ResponseBody = PostApiStudioCurateSoundsData;
  }

  /**
   * No description
   * @tags Studio
   * @name PostApiStudioGenerateScore
   * @request POST:/api/studio/generate-score
   * @response `200` `PostApiStudioGenerateScoreData`
   */
  export namespace PostApiStudioGenerateScore {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = PostApiStudioGenerateScorePayload;
    export type RequestHeaders = {};
    export type ResponseBody = PostApiStudioGenerateScoreData;
  }

  /**
   * No description
   * @tags Studio
   * @name PostApiStudioGenerateTrack
   * @request POST:/api/studio/generate-track
   * @response `200` `PostApiStudioGenerateTrackData`
   */
  export namespace PostApiStudioGenerateTrack {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = PostApiStudioGenerateTrackPayload;
    export type RequestHeaders = {};
    export type ResponseBody = PostApiStudioGenerateTrackData;
  }

  /**
   * No description
   * @tags Studio
   * @name PostApiStudioReplicateGenerate
   * @request POST:/api/studio/replicate-generate
   * @response `200` `PostApiStudioReplicateGenerateData`
   */
  export namespace PostApiStudioReplicateGenerate {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = PostApiStudioReplicateGeneratePayload;
    export type RequestHeaders = {};
    export type ResponseBody = PostApiStudioReplicateGenerateData;
  }

  /**
   * No description
   * @tags Studio
   * @name PostApiStudioSearchSfx
   * @request POST:/api/studio/search-sfx
   * @response `200` `PostApiStudioSearchSfxData`
   */
  export namespace PostApiStudioSearchSfx {
    export type RequestParams = {};
    export type RequestQuery = {};
    export type RequestBody = PostApiStudioSearchSfxPayload;
    export type RequestHeaders = {};
    export type ResponseBody = PostApiStudioSearchSfxData;
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
     * @name DeleteAuthSession
     * @request DELETE:/auth/session
     * @response `200` `DeleteAuthSessionData`
     */
    deleteAuthSession: (params: RequestParams = {}) =>
      this.http.request<DeleteAuthSessionData, any>({
        path: `/auth/session`,
        method: 'DELETE',
        ...params,
      }),

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
     * @name PostAuthCompleteSignupStudent
     * @request POST:/auth/complete-signup/student
     * @response `200` `PostAuthCompleteSignupStudentData`
     */
    postAuthCompleteSignupStudent: (data: PostAuthCompleteSignupStudentPayload, params: RequestParams = {}) =>
      this.http.request<PostAuthCompleteSignupStudentData, any>({
        path: `/auth/complete-signup/student`,
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
     * @name PostAuthCompleteSignupTeacher
     * @request POST:/auth/complete-signup/teacher
     * @response `200` `PostAuthCompleteSignupTeacherData`
     */
    postAuthCompleteSignupTeacher: (data: PostAuthCompleteSignupTeacherPayload, params: RequestParams = {}) =>
      this.http.request<PostAuthCompleteSignupTeacherData, any>({
        path: `/auth/complete-signup/teacher`,
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
     * @name PostAuthSession
     * @request POST:/auth/session
     * @response `200` `PostAuthSessionData`
     */
    postAuthSession: (data: PostAuthSessionPayload, params: RequestParams = {}) =>
      this.http.request<PostAuthSessionData, any>({
        path: `/auth/session`,
        method: 'POST',
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Auth
     * @name PutAuthMeAvatarConfig
     * @request PUT:/auth/me/avatar-config
     * @response `200` `PutAuthMeAvatarConfigData`
     */
    putAuthMeAvatarConfig: (data: PutAuthMeAvatarConfigPayload, params: RequestParams = {}) =>
      this.http.request<PutAuthMeAvatarConfigData, any>({
        path: `/auth/me/avatar-config`,
        method: 'PUT',
        body: data,
        type: ContentType.Json,
        format: 'json',
        ...params,
      }),
  };
  atlas = {
    /**
     * No description
     *
     * @tags Atlas
     * @name GetAtlasCities
     * @request GET:/atlas/cities
     * @response `200` `GetAtlasCitiesData`
     */
    getAtlasCities: (params: RequestParams = {}) =>
      this.http.request<GetAtlasCitiesData, any>({
        path: `/atlas/cities`,
        method: 'GET',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Atlas
     * @name GetAtlasEras
     * @request GET:/atlas/eras
     * @response `200` `GetAtlasErasData`
     */
    getAtlasEras: (params: RequestParams = {}) =>
      this.http.request<GetAtlasErasData, any>({
        path: `/atlas/eras`,
        method: 'GET',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Atlas
     * @name GetAtlasEvents
     * @request GET:/atlas/events
     * @response `200` `GetAtlasEventsData`
     */
    getAtlasEvents: (query: GetAtlasEventsParams, params: RequestParams = {}) =>
      this.http.request<GetAtlasEventsData, any>({
        path: `/atlas/events`,
        method: 'GET',
        query: query,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Atlas
     * @name GetAtlasModules
     * @request GET:/atlas/modules
     * @response `200` `GetAtlasModulesData`
     */
    getAtlasModules: (params: RequestParams = {}) =>
      this.http.request<GetAtlasModulesData, any>({
        path: `/atlas/modules`,
        method: 'GET',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Atlas
     * @name GetAtlasRegions
     * @request GET:/atlas/regions
     * @response `200` `GetAtlasRegionsData`
     */
    getAtlasRegions: (params: RequestParams = {}) =>
      this.http.request<GetAtlasRegionsData, any>({
        path: `/atlas/regions`,
        method: 'GET',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Atlas
     * @name GetAtlasSearch
     * @request GET:/atlas/search
     * @response `200` `GetAtlasSearchData`
     */
    getAtlasSearch: (query: GetAtlasSearchParams, params: RequestParams = {}) =>
      this.http.request<GetAtlasSearchData, any>({
        path: `/atlas/search`,
        method: 'GET',
        query: query,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Atlas
     * @name PostAtlasAiAnalyze
     * @request POST:/atlas/ai/analyze
     * @response `200` `PostAtlasAiAnalyzeData`
     */
    postAtlasAiAnalyze: (data: PostAtlasAiAnalyzePayload, params: RequestParams = {}) =>
      this.http.request<PostAtlasAiAnalyzeData, any>({
        path: `/atlas/ai/analyze`,
        method: 'POST',
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Atlas
     * @name PostAtlasParseQuery
     * @request POST:/atlas/parse-query
     * @response `200` `PostAtlasParseQueryData`
     */
    postAtlasParseQuery: (data: PostAtlasParseQueryPayload, params: RequestParams = {}) =>
      this.http.request<PostAtlasParseQueryData, any>({
        path: `/atlas/parse-query`,
        method: 'POST',
        body: data,
        type: ContentType.Json,
        ...params,
      }),
  };
  billing = {
    /**
     * No description
     *
     * @tags Billing
     * @name GetApiBillingConfig
     * @request GET:/api/billing/config
     * @response `200` `GetApiBillingConfigData`
     */
    getApiBillingConfig: (params: RequestParams = {}) =>
      this.http.request<GetApiBillingConfigData, any>({
        path: `/api/billing/config`,
        method: 'GET',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Billing
     * @name GetApiBillingCreditsBalance
     * @request GET:/api/billing/credits/balance
     * @response `200` `GetApiBillingCreditsBalanceData`
     */
    getApiBillingCreditsBalance: (params: RequestParams = {}) =>
      this.http.request<GetApiBillingCreditsBalanceData, any>({
        path: `/api/billing/credits/balance`,
        method: 'GET',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Billing
     * @name GetApiBillingSubscription
     * @request GET:/api/billing/subscription
     * @response `200` `GetApiBillingSubscriptionData`
     */
    getApiBillingSubscription: (params: RequestParams = {}) =>
      this.http.request<GetApiBillingSubscriptionData, any>({
        path: `/api/billing/subscription`,
        method: 'GET',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Billing
     * @name PostApiBillingCreditsConsume
     * @request POST:/api/billing/credits/consume
     * @response `200` `PostApiBillingCreditsConsumeData`
     */
    postApiBillingCreditsConsume: (params: RequestParams = {}) =>
      this.http.request<PostApiBillingCreditsConsumeData, any>({
        path: `/api/billing/credits/consume`,
        method: 'POST',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Billing
     * @name PostApiBillingInternalStripeEvent
     * @request POST:/api/billing/internal/stripe-event
     * @response `200` `PostApiBillingInternalStripeEventData`
     */
    postApiBillingInternalStripeEvent: (data: PostApiBillingInternalStripeEventPayload, params: RequestParams = {}) =>
      this.http.request<PostApiBillingInternalStripeEventData, any>({
        path: `/api/billing/internal/stripe-event`,
        method: 'POST',
        body: data,
        type: ContentType.Json,
        ...params,
      }),
  };
  stripe = {
    /**
     * @description Creates a Stripe Checkout session in subscription mode for the authenticated user. Finds or creates the Stripe customer automatically.
     *
     * @tags Stripe
     * @name PostApiBillingCreateCheckoutSession
     * @summary Create Stripe Checkout subscription session
     * @request POST:/api/billing/create-checkout-session
     * @secure
     * @response `200` `PostApiBillingCreateCheckoutSessionData`
     */
    postApiBillingCreateCheckoutSession: (params: RequestParams = {}) =>
      this.http.request<PostApiBillingCreateCheckoutSessionData, any>({
        path: `/api/billing/create-checkout-session`,
        method: 'POST',
        secure: true,
        ...params,
      }),

    /**
     * @description Creates a Stripe Billing Portal session so the authenticated user can manage their subscription, payment methods, and invoices.
     *
     * @tags Stripe
     * @name PostApiBillingCreatePortalSession
     * @summary Create Stripe Billing Portal session
     * @request POST:/api/billing/create-portal-session
     * @secure
     * @response `200` `PostApiBillingCreatePortalSessionData`
     */
    postApiBillingCreatePortalSession: (params: RequestParams = {}) =>
      this.http.request<PostApiBillingCreatePortalSessionData, any>({
        path: `/api/billing/create-portal-session`,
        method: 'POST',
        secure: true,
        ...params,
      }),

    /**
     * @description Stripe webhook endpoint. Raw body is required for signature verification. Do not add JSON middleware to this route.
     *
     * @tags Stripe
     * @name PostApiStripeWebhook
     * @summary Stripe webhook
     * @request POST:/api/stripe/webhook
     * @response `200` `PostApiStripeWebhookData`
     */
    postApiStripeWebhook: (data: PostApiStripeWebhookPayload, params: RequestParams = {}) =>
      this.http.request<PostApiStripeWebhookData, any>({
        path: `/api/stripe/webhook`,
        method: 'POST',
        body: data,
        type: ContentType.Json,
        ...params,
      }),
  };
  me = {
    /**
     * @description Returns billing and subscription state for the authenticated user. hasPaidAccess is true for active/trialing subscriptions.
     *
     * @tags Me
     * @name GetApiMeSubscription
     * @summary Get current user subscription status
     * @request GET:/api/me/subscription
     * @secure
     * @response `200` `GetApiMeSubscriptionData`
     */
    getApiMeSubscription: (params: RequestParams = {}) =>
      this.http.request<GetApiMeSubscriptionData, any>({
        path: `/api/me/subscription`,
        method: 'GET',
        secure: true,
        ...params,
      }),
  };
  admin = {
    /**
     * No description
     *
     * @tags Admin
     * @name DeleteApiAdminFreeAccessById
     * @request DELETE:/api/admin/free-access/{id}
     * @response `200` `DeleteApiAdminFreeAccessByIdData`
     */
    deleteApiAdminFreeAccessById: (id: string, params: RequestParams = {}) =>
      this.http.request<DeleteApiAdminFreeAccessByIdData, any>({
        path: `/api/admin/free-access/${id}`,
        method: 'DELETE',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin
     * @name GetApiAdminFreeAccess
     * @request GET:/api/admin/free-access
     * @response `200` `GetApiAdminFreeAccessData`
     */
    getApiAdminFreeAccess: (params: RequestParams = {}) =>
      this.http.request<GetApiAdminFreeAccessData, any>({
        path: `/api/admin/free-access`,
        method: 'GET',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin
     * @name GetApiAdminUsers
     * @request GET:/api/admin/users
     * @response `200` `GetApiAdminUsersData`
     */
    getApiAdminUsers: (query: GetApiAdminUsersParams, params: RequestParams = {}) =>
      this.http.request<GetApiAdminUsersData, any>({
        path: `/api/admin/users`,
        method: 'GET',
        query: query,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin
     * @name PatchApiAdminFreeAccessById
     * @request PATCH:/api/admin/free-access/{id}
     * @response `200` `PatchApiAdminFreeAccessByIdData`
     */
    patchApiAdminFreeAccessById: (id: string, data: PatchApiAdminFreeAccessByIdPayload, params: RequestParams = {}) =>
      this.http.request<PatchApiAdminFreeAccessByIdData, any>({
        path: `/api/admin/free-access/${id}`,
        method: 'PATCH',
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Admin
     * @name PostApiAdminFreeAccess
     * @request POST:/api/admin/free-access
     * @response `200` `PostApiAdminFreeAccessData`
     */
    postApiAdminFreeAccess: (data: PostApiAdminFreeAccessPayload, params: RequestParams = {}) =>
      this.http.request<PostApiAdminFreeAccessData, any>({
        path: `/api/admin/free-access`,
        method: 'POST',
        body: data,
        type: ContentType.Json,
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
    getCollections: (params: RequestParams = {}) =>
      this.http.request<GetCollectionsData, any>({
        path: `/collections`,
        method: 'GET',
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
  progress = {
    /**
     * No description
     *
     * @tags Progress
     * @name GetApiProgressLesson
     * @request GET:/api/progress/lesson
     * @response `200` `GetApiProgressLessonData`
     */
    getApiProgressLesson: (query: GetApiProgressLessonParams, params: RequestParams = {}) =>
      this.http.request<GetApiProgressLessonData, any>({
        path: `/api/progress/lesson`,
        method: 'GET',
        query: query,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Progress
     * @name GetApiProgressSummary
     * @request GET:/api/progress/summary
     * @response `200` `GetApiProgressSummaryData`
     */
    getApiProgressSummary: (params: RequestParams = {}) =>
      this.http.request<GetApiProgressSummaryData, any>({
        path: `/api/progress/summary`,
        method: 'GET',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Progress
     * @name PatchApiProgressActivity
     * @request PATCH:/api/progress/activity
     * @response `200` `PatchApiProgressActivityData`
     */
    patchApiProgressActivity: (data: PatchApiProgressActivityPayload, params: RequestParams = {}) =>
      this.http.request<PatchApiProgressActivityData, any>({
        path: `/api/progress/activity`,
        method: 'PATCH',
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Progress
     * @name PatchApiProgressLessonState
     * @request PATCH:/api/progress/lessonState
     * @response `200` `PatchApiProgressLessonStateData`
     */
    patchApiProgressLessonState: (data: PatchApiProgressLessonStatePayload, params: RequestParams = {}) =>
      this.http.request<PatchApiProgressLessonStateData, any>({
        path: `/api/progress/lessonState`,
        method: 'PATCH',
        body: data,
        type: ContentType.Json,
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
  media = {
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
  music = {
    /**
     * No description
     *
     * @tags Music
     * @name GetPrismChords
     * @request GET:/prism/chords
     * @response `200` `GetPrismChordsData`
     */
    getPrismChords: (params: RequestParams = {}) =>
      this.http.request<GetPrismChordsData, any>({
        path: `/prism/chords`,
        method: 'GET',
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Music
     * @name GetPrismChordsByName
     * @request GET:/prism/chords/{name}
     * @response `200` `GetPrismChordsByNameData`
     */
    getPrismChordsByName: (
      name:
        | 'major'
        | 'major (♭5)'
        | 'minor'
        | 'minor (♭5)'
        | 'augmented'
        | 'diminished'
        | 'suspended 2'
        | 'quartal'
        | 'suspended 4'
        | 'major 4'
        | 'minor 4'
        | 'suspended (#4)'
        | 'suspended (♭2)'
        | 'suspended (♭2♭5)'
        | 'suspended 2(♭5)'
        | 'suspended 2(♭5) add 6'
        | 'suspended 2(♭5) add 6(♭9)'
        | 'major 6'
        | 'minor 6'
        | 'minor 6 add ♭9'
        | 'diminished 7'
        | 'diminished 7(♭9)'
        | 'minor 7(♭5)'
        | 'diminished major 7'
        | 'diminished major 9'
        | 'dominant 7'
        | 'dominant 9'
        | 'major 7'
        | 'major 7(#5)'
        | 'major 7(♭5)'
        | 'major 7(♭9)'
        | 'major 7(#9)'
        | 'major 7(#5#9)'
        | 'minor 7'
        | 'minor 7(#5)'
        | 'minor 7(♭9)'
        | 'minor 7(♭5♭9)'
        | 'minor major 7'
        | 'dominant 7 suspended 2'
        | 'dominant 7 suspended 4'
        | 'major 7 suspended 2'
        | 'major 7 suspended 4'
        | 'dominant 7(♭5)'
        | 'dominant 7(#5)'
        | 'dominant 7(#9)'
        | 'dominant 7(#5#9)'
        | 'major (add 2)'
        | 'major (add 4)'
        | 'dominant 7(#11)'
        | 'major/5'
        | 'major/4'
        | 'major/3'
        | 'dominant 7(♭9)'
        | 'dominant 7(#5♭9)'
        | 'dominant 7(♭5♭9)'
        | 'major/6'
        | 'major 7(#11)'
        | 'major/1'
        | 'minor 6/5'
        | 'minor 6/♭3'
        | 'minor 7(♭5)/4'
        | 'major 7/5'
        | 'major/#5'
        | 'major/7'
        | 'minor 7(♭5)/5'
        | 'minor 6/♭6'
        | 'major 9'
        | 'major 9(#5)'
        | 'minor 9'
        | 'minor 9(♭5)'
        | 'major 6/9'
        | 'minor 6/9'
        | 'diminished 7(add 9)'
        | 'dominant 9 suspended 4'
        | 'dominant (♭9) suspended 4'
        | 'minor major 9'
        | 'diminished 6/9'
        | 'dominant 9(#5)'
        | 'Add2'
        | 'Add4'
        | 'b7dominant7#11'
        | 'diminished7'
        | 'diminished7b9'
        | 'diminishedmajor7'
        | 'dominant7'
        | 'dominant7#11'
        | 'dominant7#5'
        | 'dominant7#5#9'
        | 'dominant7#5b9'
        | 'dominant7#9'
        | 'dominant7b5'
        | 'dominant7b9'
        | 'dominant7sus2'
        | 'dominant7sus4'
        | 'dominant9'
        | 'dominant9#5'
        | 'major4'
        | 'major6'
        | 'major6add9'
        | 'major7'
        | 'major7#11'
        | 'major7#5'
        | 'major7#5#9'
        | 'major7#9'
        | 'major7/5'
        | 'major7b5'
        | 'major7diminished'
        | 'major7sus2'
        | 'major7sus4'
        | 'major9'
        | 'major9#5'
        | 'minor4'
        | 'minor6'
        | 'minor6/5'
        | 'minor6/♭3'
        | 'minor6/♭6'
        | 'minor6add9'
        | 'minor7'
        | 'minor7#5'
        | 'minor7b5'
        | 'minor7b5/4'
        | 'minor7b5/5'
        | 'minor7b5b9'
        | 'minor7b9'
        | 'minor9'
        | 'minor9b5'
        | 'minormajor7'
        | 'minormajor9'
        | 'sus#4'
        | 'sus2'
        | 'sus4'
        | 'susb2'
        | 'susb2b5',
      params: RequestParams = {},
    ) =>
      this.http.request<GetPrismChordsByNameData, any>({
        path: `/prism/chords/${name}`,
        method: 'GET',
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Music
     * @name GetPrismChordsProgressions
     * @request GET:/prism/chords/progressions
     * @response `200` `GetPrismChordsProgressionsData`
     */
    getPrismChordsProgressions: (params: RequestParams = {}) =>
      this.http.request<GetPrismChordsProgressionsData, any>({
        path: `/prism/chords/progressions`,
        method: 'GET',
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Music
     * @name GetPrismContoursStart
     * @request GET:/prism/contours/start
     * @response `200` `GetPrismContoursStartData`
     */
    getPrismContoursStart: (params: RequestParams = {}) =>
      this.http.request<GetPrismContoursStartData, any>({
        path: `/prism/contours/start`,
        method: 'GET',
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Music
     * @name GetPrismModes
     * @request GET:/prism/modes
     * @response `200` `GetPrismModesData`
     */
    getPrismModes: (params: RequestParams = {}) =>
      this.http.request<GetPrismModesData, any>({
        path: `/prism/modes`,
        method: 'GET',
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Music
     * @name GetPrismModesByMode
     * @request GET:/prism/modes/{mode}
     * @response `200` `GetPrismModesByModeData`
     */
    getPrismModesByMode: (
      mode:
        | 'ionian'
        | 'dorian'
        | 'phrygian'
        | 'lydian'
        | 'mixolydian'
        | 'aeolian'
        | 'locrian'
        | 'harmonicminor'
        | 'locriannat6'
        | 'ionian#5'
        | 'dorian#4'
        | 'phrygiandominant'
        | 'lydian#2'
        | 'altereddiminished'
        | 'melodicminor'
        | 'dorian♭2'
        | 'lydianaugmented'
        | 'lydiandominant'
        | 'mixolydiannat6'
        | 'locriannat2'
        | 'altereddominant'
        | 'harmonicmajor'
        | 'dorian♭5'
        | 'altereddominantnat5'
        | 'melodicminor#4'
        | 'mixolydian♭2'
        | 'lydianaugmented#2'
        | 'locrian𝄫7'
        | 'doubleharmonicmajor'
        | 'lydian#2#6'
        | 'ultraphrygian'
        | 'doubleharmonicminor'
        | 'oriental'
        | 'ionian#2#5'
        | 'locrian𝄫3𝄫7'
        | 'majorblues'
        | 'minorblues'
        | 'bebopdominant'
        | 'halfwholediminished'
        | 'wholehalfdiminished'
        | 'messiaen'
        | 'wholetone'
        | 'majorpentatonic'
        | 'minorpentatonic',
      params: RequestParams = {},
    ) =>
      this.http.request<GetPrismModesByModeData, any>({
        path: `/prism/modes/${mode}`,
        method: 'GET',
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Music
     * @name GetPrismModesByModeChords
     * @request GET:/prism/modes/{mode}/chords
     * @response `200` `GetPrismModesByModeChordsData`
     */
    getPrismModesByModeChords: (
      mode:
        | 'ionian'
        | 'dorian'
        | 'phrygian'
        | 'lydian'
        | 'mixolydian'
        | 'aeolian'
        | 'locrian'
        | 'harmonicminor'
        | 'locriannat6'
        | 'ionian#5'
        | 'dorian#4'
        | 'phrygiandominant'
        | 'lydian#2'
        | 'altereddiminished'
        | 'melodicminor'
        | 'dorian♭2'
        | 'lydianaugmented'
        | 'lydiandominant'
        | 'mixolydiannat6'
        | 'locriannat2'
        | 'altereddominant'
        | 'harmonicmajor'
        | 'dorian♭5'
        | 'altereddominantnat5'
        | 'melodicminor#4'
        | 'mixolydian♭2'
        | 'lydianaugmented#2'
        | 'locrian𝄫7'
        | 'doubleharmonicmajor'
        | 'lydian#2#6'
        | 'ultraphrygian'
        | 'doubleharmonicminor'
        | 'oriental'
        | 'ionian#2#5'
        | 'locrian𝄫3𝄫7',
      params: RequestParams = {},
    ) =>
      this.http.request<GetPrismModesByModeChordsData, any>({
        path: `/prism/modes/${mode}/chords`,
        method: 'GET',
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Music
     * @name GetPrismModesByModeChordsData
     * @request GET:/prism/modes/{mode}/chords/data
     * @response `200` `GetPrismModesByModeChordsDataData`
     */
    getPrismModesByModeChordsData: (
      mode:
        | 'ionian'
        | 'dorian'
        | 'phrygian'
        | 'lydian'
        | 'mixolydian'
        | 'aeolian'
        | 'locrian'
        | 'harmonicminor'
        | 'locriannat6'
        | 'ionian#5'
        | 'dorian#4'
        | 'phrygiandominant'
        | 'lydian#2'
        | 'altereddiminished'
        | 'melodicminor'
        | 'dorian♭2'
        | 'lydianaugmented'
        | 'lydiandominant'
        | 'mixolydiannat6'
        | 'locriannat2'
        | 'altereddominant'
        | 'harmonicmajor'
        | 'dorian♭5'
        | 'altereddominantnat5'
        | 'melodicminor#4'
        | 'mixolydian♭2'
        | 'lydianaugmented#2'
        | 'locrian𝄫7'
        | 'doubleharmonicmajor'
        | 'lydian#2#6'
        | 'ultraphrygian'
        | 'doubleharmonicminor'
        | 'oriental'
        | 'ionian#2#5'
        | 'locrian𝄫3𝄫7',
      params: RequestParams = {},
    ) =>
      this.http.request<GetPrismModesByModeChordsDataData, any>({
        path: `/prism/modes/${mode}/chords/data`,
        method: 'GET',
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Music
     * @name GetPrismModesFamily
     * @request GET:/prism/modes/family
     * @response `200` `GetPrismModesFamilyData`
     */
    getPrismModesFamily: (params: RequestParams = {}) =>
      this.http.request<GetPrismModesFamilyData, any>({
        path: `/prism/modes/family`,
        method: 'GET',
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Music
     * @name GetPrismModesFamilyByFamily
     * @request GET:/prism/modes/family/{family}
     * @response `200` `GetPrismModesFamilyByFamilyData`
     */
    getPrismModesFamilyByFamily: (
      family: 'diatonic' | 'harmonic minor' | 'melodic minor' | 'harmonic major' | 'double harmonic',
      params: RequestParams = {},
    ) =>
      this.http.request<GetPrismModesFamilyByFamilyData, any>({
        path: `/prism/modes/family/${family}`,
        method: 'GET',
        format: 'json',
        ...params,
      }),

    /**
     * No description
     *
     * @tags Music
     * @name GetPrismRhythms
     * @request GET:/prism/rhythms
     * @response `melodies` `object`
     * @response `chords` `object`
     */
    getPrismRhythms: (params: RequestParams = {}) =>
      this.http.request<any, object>({
        path: `/prism/rhythms`,
        method: 'GET',
        ...params,
      }),
  };
  studio = {
    /**
     * No description
     *
     * @tags Studio
     * @name PostApiStudioAnalyzeVideo
     * @request POST:/api/studio/analyze-video
     * @response `200` `PostApiStudioAnalyzeVideoData`
     */
    postApiStudioAnalyzeVideo: (data: PostApiStudioAnalyzeVideoPayload, params: RequestParams = {}) =>
      this.http.request<PostApiStudioAnalyzeVideoData, any>({
        path: `/api/studio/analyze-video`,
        method: 'POST',
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Studio
     * @name PostApiStudioCurateSounds
     * @request POST:/api/studio/curate-sounds
     * @response `200` `PostApiStudioCurateSoundsData`
     */
    postApiStudioCurateSounds: (data: PostApiStudioCurateSoundsPayload, params: RequestParams = {}) =>
      this.http.request<PostApiStudioCurateSoundsData, any>({
        path: `/api/studio/curate-sounds`,
        method: 'POST',
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Studio
     * @name PostApiStudioGenerateScore
     * @request POST:/api/studio/generate-score
     * @response `200` `PostApiStudioGenerateScoreData`
     */
    postApiStudioGenerateScore: (data: PostApiStudioGenerateScorePayload, params: RequestParams = {}) =>
      this.http.request<PostApiStudioGenerateScoreData, any>({
        path: `/api/studio/generate-score`,
        method: 'POST',
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Studio
     * @name PostApiStudioGenerateTrack
     * @request POST:/api/studio/generate-track
     * @response `200` `PostApiStudioGenerateTrackData`
     */
    postApiStudioGenerateTrack: (data: PostApiStudioGenerateTrackPayload, params: RequestParams = {}) =>
      this.http.request<PostApiStudioGenerateTrackData, any>({
        path: `/api/studio/generate-track`,
        method: 'POST',
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Studio
     * @name PostApiStudioReplicateGenerate
     * @request POST:/api/studio/replicate-generate
     * @response `200` `PostApiStudioReplicateGenerateData`
     */
    postApiStudioReplicateGenerate: (data: PostApiStudioReplicateGeneratePayload, params: RequestParams = {}) =>
      this.http.request<PostApiStudioReplicateGenerateData, any>({
        path: `/api/studio/replicate-generate`,
        method: 'POST',
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @tags Studio
     * @name PostApiStudioSearchSfx
     * @request POST:/api/studio/search-sfx
     * @response `200` `PostApiStudioSearchSfxData`
     */
    postApiStudioSearchSfx: (data: PostApiStudioSearchSfxPayload, params: RequestParams = {}) =>
      this.http.request<PostApiStudioSearchSfxData, any>({
        path: `/api/studio/search-sfx`,
        method: 'POST',
        body: data,
        type: ContentType.Json,
        ...params,
      }),
  };
}

import { GetAuthMeData } from '../MusicAtlasContext/musicAtlas.generated';

export type UserRole = 'admin' | 'teacher' | 'student';

export type AuthOrganization = {
  id: string;
  auth0OrgId: string | null;
  slug: string | null;
  name: string;
};

export type AuthOrganizationMembership = {
  id: string;
  organizationId: string;
  role: string;
  status: string;
  organization: AuthOrganization;
  createdAt: Date;
  updatedAt: Date;
};

export type AuthAppUser = Omit<GetAuthMeData, 'role'> & {
  role: UserRole;
  auth0Sub: string | null;
  avatarUrl: string | null;
  organizations: AuthOrganizationMembership[];
};

export type AuthContextData = {
  userId: string | null;
  token: string | null;
  appSessionId: string | null;
  expiresAt: number | null;
  error: string | null;
  role: UserRole | null;
  isAuth0Loading: boolean;
  isAuth0Authenticated: boolean;
  isPending: boolean;
  isBootstrapLoading: boolean;
  appUser: AuthAppUser | null;
};

export type CreateTeacherParams = {
  code: string;
  nickname: string;
  fullName: string;
};

export type CreateStudentParams = {
  username: string;
  code: string;
  nickname: string;
  birthDate: Date;
};

export type AuthContextActions = {
  setToken: (token: string | null) => void;
  signInWithEmailAndPassword: (
    email: string,
    password: string,
  ) => Promise<void>;
  signInWithUsernameAndPassword: (
    username: string,
    password: string,
  ) => Promise<void>;
  signInWithProvider: (provider: 'google' | 'apple') => Promise<void>;
  signUp: () => Promise<void>;
  signUpAsTeacher: (input: CreateTeacherParams) => Promise<void>;
  signUpAsStudent: (input: CreateStudentParams) => Promise<void>;
  signOut: () => Promise<void>;
};

export type AuthContextValue = AuthContextData & AuthContextActions;

import { PostAuthRegisterPayload } from '../MusicAtlasContext/musicAtlas.generated';

export type UserRole = PostAuthRegisterPayload['role'] | 'admin';

export type AuthContextData = {
  userId: string | null;
  token: string | null;
  expiresAt: number | null;
  error: string | null;
  role: UserRole | null;
  isPending: boolean;
};

export type CreateTeacherParams = {
  email: string;
  password: string;
  code: string;
  nickname: string;
  fullName: string;
};

export type CreateStudentParams = {
  username: string;
  password: string;
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
  signUpAsTeacher: (input: CreateTeacherParams) => Promise<void>;
  signUpAsStudent: (input: CreateStudentParams) => Promise<void>;
  signOut: () => Promise<void>;
};

export type AuthContextValue = AuthContextData & AuthContextActions;

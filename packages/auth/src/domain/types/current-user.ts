// file: packages/auth/src/domain/types/current-user.ts

export interface ICurrentUser {
  id: string;
  email: string;
  roles: string[];
}

export const CURRENT_USER_KEY = "currentUser";

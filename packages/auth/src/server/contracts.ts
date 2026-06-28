export interface IAuthUserResponseDto {
  id: string;
  email: string;
  displayName?: string | null;
  emailConfirmed: boolean;
  state: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;
}

export interface IAuthResponseDto {
  user: IAuthUserResponseDto;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface ILoginRequestDto {
  email: string;
  password: string;
}

export interface ILogoutRequestDto {
  refreshToken: string;
}

export interface IRefreshRequestDto {
  refreshToken: string;
}

export interface IRegisterRequestDto {
  email: string;
  password: string;
  displayName?: string;
}

export interface IRoleResponseDto {
  id: string;
  name: string;
  normalizedName: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ICreateRoleRequestDto {
  name: string;
  description?: string | null;
}

export interface IUpdateRoleRequestDto {
  name?: string;
  description?: string | null;
}

export interface IAssignRoleRequestDto {
  roleName: string;
}

export interface IUserRolesResponseDto {
  userId?: string;
  roles: string[];
}

import type {
  IAuthResponseDto,
  IAuthUserResponseDto,
  ILoginRequestDto,
  ILogoutRequestDto,
  IRefreshRequestDto,
  IRegisterRequestDto,
} from "@genspire/auth/server/contracts";

export type {
  IAuthResponseDto,
  IAuthUserResponseDto,
  ILoginRequestDto,
  ILogoutRequestDto,
  IRefreshRequestDto,
  IRegisterRequestDto,
};

export type IAuthResponse = IAuthResponseDto;
export type IAuthUser = IAuthUserResponseDto;
export type IAuthLoginRequest = ILoginRequestDto;
export type IAuthRegisterRequest = IRegisterRequestDto;
export type IAuthRefreshRequest = IRefreshRequestDto;
export type IAuthLogoutRequest = ILogoutRequestDto;

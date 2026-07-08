import type {
  IAuthLoginRequest,
  IAuthLogoutRequest,
  IAuthRefreshRequest,
  IAuthRegisterRequest,
  IAuthResponse,
} from "../../domain/types/auth-sdk-types.js";

export interface IAuthTransport {
  login(input: IAuthLoginRequest): Promise<IAuthResponse>;
  register(input: IAuthRegisterRequest): Promise<IAuthResponse>;
  refresh(input: IAuthRefreshRequest): Promise<IAuthResponse>;
  logout(input: IAuthLogoutRequest): Promise<void>;
}

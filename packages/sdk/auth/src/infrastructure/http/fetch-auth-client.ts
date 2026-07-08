import type { IAuthTransport } from "../../application/contracts/auth-transport.js";
import type {
  IAuthLoginRequest,
  IAuthLogoutRequest,
  IAuthRefreshRequest,
  IAuthRegisterRequest,
  IAuthResponse,
} from "../../domain/types/auth-sdk-types.js";
import {
  FetchAuthHttpTransport,
  type IFetchAuthHttpTransportOptions,
} from "./fetch-auth-http-transport.js";

export interface IFetchAuthClientOptions extends IFetchAuthHttpTransportOptions {
  basePath?: string;
}

export class FetchAuthClient implements IAuthTransport {
  private readonly transport: FetchAuthHttpTransport;
  private readonly basePath: string;

  constructor(options: IFetchAuthClientOptions | FetchAuthHttpTransport) {
    if (options instanceof FetchAuthHttpTransport) {
      this.transport = options;
      this.basePath = "";
      return;
    }

    this.transport = new FetchAuthHttpTransport(options);
    this.basePath = options.basePath ?? "";
  }

  async login(input: IAuthLoginRequest): Promise<IAuthResponse> {
    return await this.transport.post<IAuthResponse>(this.resolvePath("/login"), input);
  }

  async register(input: IAuthRegisterRequest): Promise<IAuthResponse> {
    return await this.transport.post<IAuthResponse>(
      this.resolvePath("/register"),
      input,
    );
  }

  async refresh(input: IAuthRefreshRequest): Promise<IAuthResponse> {
    return await this.transport.post<IAuthResponse>(this.resolvePath("/refresh"), input);
  }

  async logout(input: IAuthLogoutRequest): Promise<void> {
    await this.transport.post(this.resolvePath("/logout"), input);
  }

  private resolvePath(path: string): string {
    return `${this.basePath}${path}`;
  }
}

// file: packages/auth/src/server/controllers/auth.controller.ts

import { AllowAnonymous, Authorize, Controller, Get, Post } from "@genspire/server";
import type { RequestContext } from "@genspire/server";
import { problem, json } from "@genspire/server";
import { defineProblemDetailsType } from "@genspire/server";
import { AuthService } from "../../application/services/auth.service.js";
import { getAuthRequestMetadata } from "../auth-request-metadata.js";
import { requireCurrentUser } from "../current-user.js";
import { RegisterRequestDto } from "../dtos/register-request.dto.js";
import { LoginRequestDto } from "../dtos/login-request.dto.js";
import { RefreshRequestDto } from "../dtos/refresh-request.dto.js";
import { LogoutRequestDto } from "../dtos/logout-request.dto.js";
import { AuthResponseDto } from "../dtos/auth-response.dto.js";
import { AuthUserResponseDto } from "../dtos/auth-user.dto.js";

const errorResponse = {
  400: {
    description: "Validation error",
    body: defineProblemDetailsType("Validation problem response"),
  },
  401: {
    description: "Unauthorized",
    body: defineProblemDetailsType("Unauthorized problem response"),
  },
  409: {
    description: "Conflict",
    body: defineProblemDetailsType("Conflict problem response"),
  },
} as const;

@Controller("/", {
  tag: "Auth",
  description: "Authentication endpoints",
})
export class AuthController {
  static inject = [AuthService];

  constructor(private readonly authService: AuthService) {}

  @AllowAnonymous()
  @Post("/register", {
    summary: "Register a new user",
    requestBody: RegisterRequestDto,
    response: AuthResponseDto,
    responses: errorResponse,
  })
  async register(ctx: RequestContext): Promise<Response> {
    const body = await ctx.json<RegisterRequestDto>();
    const metadata = getAuthRequestMetadata(ctx);
    const result = await this.authService.register({
      email: body.email,
      password: body.password,
      displayName: body.displayName ?? null,
      metadata,
    });
    return json(result, { status: 201 });
  }

  @AllowAnonymous()
  @Post("/login", {
    summary: "Login with email and password",
    requestBody: LoginRequestDto,
    response: AuthResponseDto,
    responses: {
      401: {
        description: "Invalid credentials",
        body: defineProblemDetailsType("Invalid credentials"),
      },
    },
  })
  async login(ctx: RequestContext): Promise<Response> {
    const body = await ctx.json<LoginRequestDto>();
    const metadata = getAuthRequestMetadata(ctx);
    const result = await this.authService.login({
      email: body.email,
      password: body.password,
      metadata,
    });
    return json(result);
  }

  @AllowAnonymous()
  @Post("/refresh", {
    summary: "Refresh access token",
    requestBody: RefreshRequestDto,
    response: AuthResponseDto,
    responses: errorResponse,
  })
  async refresh(ctx: RequestContext): Promise<Response> {
    const body = await ctx.json<RefreshRequestDto>();
    const metadata = getAuthRequestMetadata(ctx);
    const result = await this.authService.refresh({
      refreshToken: body.refreshToken,
      metadata,
    });
    return json(result);
  }

  @AllowAnonymous()
  @Post("/logout", {
    summary: "Logout and revoke refresh token",
    requestBody: LogoutRequestDto,
    responses: {
      200: {
        description: "Logged out successfully",
      },
    },
  })
  async logout(ctx: RequestContext): Promise<Response> {
    const body = await ctx.json<LogoutRequestDto>();
    const metadata = getAuthRequestMetadata(ctx);
    const result = await this.authService.logout({
      refreshToken: body.refreshToken,
      metadata,
    });
    return json(result);
  }

  @Authorize()
  @Get("/me", {
    summary: "Get current user from access token",
    response: AuthUserResponseDto,
    responses: {
      401: {
        description: "Unauthorized",
        body: defineProblemDetailsType("Unauthorized"),
      },
    },
  })
  async me(ctx: RequestContext): Promise<Response> {
    const currentUser = requireCurrentUser(ctx);
    const metadata = getAuthRequestMetadata(ctx);
    const user = await this.authService.getUserProfile(currentUser.id, metadata);

    if (!user) {
      return problem({
        title: "Unauthorized",
        status: 401,
        detail: "User not found or inactive.",
        code: "AUTH_INVALID_TOKEN",
      });
    }

    return json(user);
  }
}
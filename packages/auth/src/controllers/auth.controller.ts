import { AllowAnonymous, Authorize, Controller, Get, Post } from "@genspire/server";
import type { RequestContext } from "@genspire/server";
import { problem, json } from "@genspire/server";
import { defineProblemDetailsType } from "@genspire/server";
import { AuthService } from "../services/auth.service.js";
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

@Controller("/auth", {
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
    const result = await this.authService.register(body);
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
    const result = await this.authService.login(body);
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
    const result = await this.authService.refresh(body);
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
    const result = await this.authService.logout(body);
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
    const authHeader = ctx.header("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return problem({
        title: "Unauthorized",
        status: 401,
        detail: "Missing or invalid authorization header.",
        code: "AUTH_MISSING_TOKEN",
      });
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      return problem({
        title: "Unauthorized",
        status: 401,
        detail: "Missing or invalid authorization header.",
        code: "AUTH_MISSING_TOKEN",
      });
    }

    const user = await this.authService.getCurrentUserFromAccessToken(token);
    if (!user) {
      return problem({
        title: "Unauthorized",
        status: 401,
        detail: "Invalid or expired access token.",
        code: "AUTH_INVALID_TOKEN",
      });
    }

    return json(user);
  }
}

export interface AuthPrincipal {
  sub: string;
  email: string;
  typ: "access";
  iss?: string;
  aud?: string;
  iat?: number;
  exp?: number;
}

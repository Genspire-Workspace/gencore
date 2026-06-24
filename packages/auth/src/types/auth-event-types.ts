// file: packages\auth\src\types\auth-event-types.ts

export type AuthEventType =
  | "register_success"
  | "register_failed"
  | "login_success"
  | "login_failed"
  | "refresh_success"
  | "refresh_failed"
  | "logout"
  | "me_access"
  | "ip_blocked"
  | "user_blocked";

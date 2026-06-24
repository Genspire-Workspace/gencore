export interface IAuthorizationRequirement {
  roles?: readonly string[];
}

export interface IRouteAuthorizationMetadata {
  allowAnonymous?: boolean;
  requiresAuthentication?: boolean;
  authorize?: IAuthorizationRequirement;
}

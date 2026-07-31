export interface AuthIntegrationCapabilities {
  readonly passwordLogin: boolean;
  readonly registration: boolean;
  readonly passwordRecovery: boolean;
  readonly googleOAuth: boolean;
}

/** Verified against the completed local Laravel auth contract on 2026-07-31. */
export const AUTH_CAPABILITIES: AuthIntegrationCapabilities = {
  passwordLogin: true,
  registration: true,
  passwordRecovery: true,
  googleOAuth: true,
};

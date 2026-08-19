export const MOBILE_ONBOARDING_MEDIA_QUERY = '(max-width: 767px)'

export function getMobileOnboardingMediaQuery(): MediaQueryList | null {
  if (
    typeof window === 'undefined'
    || typeof window.matchMedia !== 'function'
  ) {
    return null
  }

  return window.matchMedia(MOBILE_ONBOARDING_MEDIA_QUERY)
}

export function isMobileOnboardingViewport(): boolean {
  return getMobileOnboardingMediaQuery()?.matches ?? false
}

import { SetMetadata } from '@nestjs/common';

export const SKIP_TOS_CHECK_KEY = 'skipTosCheck';

/**
 * Decorator to bypass the global TermsOfServiceGuard on specific routes.
 * Use this for public endpoints or endpoints required for the acceptance flow itself.
 */
export const SkipTosCheck = () => SetMetadata(SKIP_TOS_CHECK_KEY, true);
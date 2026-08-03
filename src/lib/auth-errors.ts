function contains(lower: string, terms: string[]): boolean {
  return terms.some((term) => lower.includes(term));
}

export function friendlyAuthError(
  error: { message?: string } | null,
  fallback = "Something went wrong. Please try again.",
): string {
  if (!error) return fallback;

  const m = error.message ?? "";
  const lower = m.toLowerCase();

  if (contains(lower, ["network", "failed to fetch", "fetch error", "load failed"])) {
    return "Network error. Please check your connection and try again.";
  }
  if (contains(lower, ["at least", "minimum", "8 characters", "6 characters"])) {
    return "Password must be at least 8 characters.";
  }
  if (contains(lower, ["new password should be different", "same as old", "previous password"])) {
    return "New password must be different from your current password.";
  }
  if (contains(lower, ["session has expired", "session expired", "link has expired"])) {
    return "This reset link has expired. Please request a new one.";
  }
  if (contains(lower, ["not allowed to update", "permission", "forbidden"])) {
    return "You don't have permission to update this account.";
  }
  if (contains(lower, ["invalid email", "not a valid email", "email address invalid"])) {
    return "Please enter a valid email address.";
  }
  if (contains(lower, ["email not confirmed", "confirm your email"])) {
    return "Please confirm your email address before requesting a password reset.";
  }
  if (contains(lower, ["rate limit", "too many requests", "slow down"])) {
    return "Too many requests. Please wait a moment and try again.";
  }
  if (contains(lower, ["user not found", "no user found", "unable to validate", "unknown email"])) {
    return "We couldn't find an account with that email address.";
  }
  if (contains(lower, ["invalid", "expired", "link", "token", "code"])) {
    return "This reset link is invalid or has expired. Please request a new one.";
  }

  return m || fallback;
}

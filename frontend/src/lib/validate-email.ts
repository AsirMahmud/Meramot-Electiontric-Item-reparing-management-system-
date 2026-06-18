/**
 * Shared email validation utility.
 * Checks format and rejects common disposable/fake domains.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "tempmail.com",
  "throwaway.email",
  "yopmail.com",
  "sharklasers.com",
  "guerrillamailblock.com",
  "grr.la",
  "dispostable.com",
  "trashmail.com",
  "10minutemail.com",
  "temp-mail.org",
  "fakeinbox.com",
  "maildrop.cc",
]);

/**
 * Returns an error message string if the email is invalid, or null if it's valid.
 */
export function validateEmail(email: string): string | null {
  const trimmed = email.trim();

  if (!trimmed) {
    return "Email is required.";
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return "Please enter a valid email address (e.g. you@example.com).";
  }

  const domain = trimmed.split("@")[1]?.toLowerCase();

  if (!domain) {
    return "Please enter a valid email address.";
  }

  if (DISPOSABLE_DOMAINS.has(domain)) {
    return "Disposable/temporary email addresses are not allowed. Please use a real email.";
  }

  return null;
}

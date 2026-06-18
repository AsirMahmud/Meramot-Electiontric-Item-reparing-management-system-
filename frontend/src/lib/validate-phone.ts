/**
 * Shared BD phone number validation utility.
 * Validates Bangladeshi mobile numbers (01X-XXXXXXXX format).
 *
 * Valid BD operator prefixes:
 *   013 → Grameenphone
 *   014 → Banglalink
 *   015 → Teletalk
 *   016 → Airtel/Robi
 *   017 → Grameenphone
 *   018 → Robi
 *   019 → Banglalink
 */

// Matches: 01[3-9] followed by exactly 8 digits (total 11 digits)
// Also allows optional +880 or 880 prefix
const BD_PHONE_REGEX = /^(?:\+?880|0)1[3-9]\d{8}$/;

/**
 * Returns an error message string if the phone number is invalid, or null if valid.
 */
export function validateBDPhone(phone: string): string | null {
  const trimmed = phone.trim().replace(/[\s-]/g, "");

  if (!trimmed) {
    return "Phone number is required.";
  }

  if (!BD_PHONE_REGEX.test(trimmed)) {
    return "Enter a valid BD number (e.g. 01712345678). Must start with 01 and be 11 digits.";
  }

  return null;
}

/**
 * Normalizes a BD phone number to the local 01X format.
 * Strips +880 / 880 prefix if present.
 */
export function normalizeBDPhone(phone: string): string {
  const trimmed = phone.trim().replace(/[\s-]/g, "");

  if (trimmed.startsWith("+880")) {
    return "0" + trimmed.slice(4);
  }
  if (trimmed.startsWith("880")) {
    return "0" + trimmed.slice(3);
  }
  return trimmed;
}

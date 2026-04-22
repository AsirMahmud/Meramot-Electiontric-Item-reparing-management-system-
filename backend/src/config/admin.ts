const DEFAULT_ADMIN_EMAILS = [
  "asirmahmuhddd@gmail.com",
  "mustahid000@gmail.com",
  "siamkhandaker616@gmail.com",
  "farhan.tanvir3@g.bracu.ac.bd"
];

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function getAdminEmails() {
  const envEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);

  return new Set(
    [...DEFAULT_ADMIN_EMAILS, ...envEmails].map(normalizeEmail)
  );
}

export function isAdminEmail(email?: string | null) {
  if (!email) return false;
  return getAdminEmails().has(normalizeEmail(email));
}
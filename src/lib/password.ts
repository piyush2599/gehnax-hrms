// Common dictionary words whose presence (alone or lightly decorated) makes a password weak
const COMMON_WORDS = [
  "password","passw0rd","qwerty","letmein","welcome","iloveyou",
  "monkey","dragon","master","shadow","sunshine","princess","football",
  "superman","batman","trustno","admin","employee","changeme","hello",
  "gehnax","india","login","secret","access","default","user","test",
  "abc","qaz","zaq","123456","654321",
];

// Exact blacklist for common full passwords
const COMMON_EXACT = new Set([
  "123456789012","12345678901","1234567890","123456789",
  "abcdefghijkl","abcdefghijk","abcdefghij",
  "qwertyuiop12","qwertyuiopas","qwertyuiop",
]);

export interface PasswordRule {
  label: string;
  pass: boolean;
}

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  rules: PasswordRule[];
}

function isCommon(password: string): boolean {
  const lower = password.toLowerCase();
  // Exact match blacklist
  if (COMMON_EXACT.has(lower)) return true;
  // Check if the password is just a common word optionally surrounded by digits/symbols
  // e.g. "Password@123", "p@ssw0rd2024", "Admin#12345"
  for (const word of COMMON_WORDS) {
    // Strip leading/trailing non-alpha chars and digits, see if the core is a common word
    const stripped = lower.replace(/[^a-z]/g, "");
    if (stripped === word || stripped.startsWith(word) || stripped.endsWith(word)) {
      // Only flag if the word makes up >60% of the stripped content
      if (word.length / Math.max(stripped.length, 1) >= 0.6) return true;
    }
  }
  return false;
}

export function validatePassword(password: string): PasswordValidationResult {
  const rules: PasswordRule[] = [
    { label: "At least 12 characters",          pass: password.length >= 12 },
    { label: "At least one uppercase letter",    pass: /[A-Z]/.test(password) },
    { label: "At least one lowercase letter",    pass: /[a-z]/.test(password) },
    { label: "At least one number",              pass: /[0-9]/.test(password) },
    { label: "At least one special character",   pass: /[^A-Za-z0-9]/.test(password) },
    { label: "Not a commonly used password",     pass: !isCommon(password) },
  ];

  const errors = rules.filter((r) => !r.pass).map((r) => r.label);
  return { valid: errors.length === 0, errors, rules };
}

/** Server-only: returns an error string or null */
export function checkPassword(password: string): string | null {
  const { valid, errors } = validatePassword(password);
  if (!valid) return errors[0];
  return null;
}

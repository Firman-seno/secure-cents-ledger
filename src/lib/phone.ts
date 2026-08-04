/** Shared (client + server) Indonesian WhatsApp number helpers. */

/** Normalises 08xx / +628xx / 628xx to the canonical 628xx form. */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "").replace(/^\+/, "");
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

/** Indonesian mobile numbers: 628 followed by 8-12 digits. */
export function isValidIndonesianPhone(raw: string): boolean {
  return /^628\d{8,12}$/.test(normalizePhone(raw));
}

export function formatPhoneDisplay(raw: string): string {
  const n = normalizePhone(raw);
  return n ? `+${n}` : "";
}

export function maskPhone(raw: string): string {
  const n = normalizePhone(raw);
  if (n.length < 6) return `+${n}`;
  return `+${n.slice(0, 5)}${"*".repeat(Math.max(0, n.length - 8))}${n.slice(-3)}`;
}

export interface PasswordCheck {
  valid: boolean;
  message?: string;
}

export function checkPasswordStrength(password: string): PasswordCheck {
  if (password.length < 8) return { valid: false, message: "Password must be at least 8 characters." };
  if (!/[A-Z]/.test(password)) return { valid: false, message: "Password must contain an uppercase letter." };
  if (!/[a-z]/.test(password)) return { valid: false, message: "Password must contain a lowercase letter." };
  if (!/\d/.test(password)) return { valid: false, message: "Password must contain a number." };
  return { valid: true };
}

/**
 * Mirrors backend `normalize_phone`.
 * Accepts:  0712 345 678 | 712345678 | 254712345678 | +254712345678
 * Returns:  +254712345678   (throws on invalid)
 */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, "");

  let local: string;
  if (digits.startsWith("254")) local = digits.slice(3);
  else if (digits.startsWith("0")) local = digits.slice(1);
  else local = digits;

  if (!/^[71]\d{8}$/.test(local)) {
    throw new Error("Enter a valid Kenyan phone number (e.g. 0712 345 678).");
  }
  return `+254${local}`;
}

export function isValidPhone(input: string): boolean {
  try { normalizePhone(input); return true; } catch { return false; }
}
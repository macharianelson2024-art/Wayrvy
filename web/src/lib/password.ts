export interface PasswordCheck {
  length: boolean;
  notNumeric: boolean;
  notCommon: boolean;
  ok: boolean;
}

const COMMON = new Set([
  "password", "12345678", "qwerty123", "password1", "letmein123", "admin123",
]);

export function checkPassword(pw: string): PasswordCheck {
  const length = pw.length >= 8;
  const notNumeric = !/^\d+$/.test(pw);
  const notCommon = !COMMON.has(pw.toLowerCase());
  return { length, notNumeric, notCommon, ok: length && notNumeric && notCommon };
}
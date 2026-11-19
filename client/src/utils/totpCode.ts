export const TOTP_CODE_LENGTH = 6

export function isCompleteTotpCode(code: string): boolean {
  return code.length === TOTP_CODE_LENGTH
}

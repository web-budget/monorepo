export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 128

export interface PasswordRequirementStatus {
  minLength: boolean
  uppercase: boolean
  number: boolean
}

export function passwordRequirementStatus(password: string): PasswordRequirementStatus {
  return {
    minLength: password.length >= PASSWORD_MIN_LENGTH && password.length <= PASSWORD_MAX_LENGTH,
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
  }
}

export function meetsPasswordRequirements(password: string): boolean {
  return Object.values(passwordRequirementStatus(password)).every(Boolean)
}

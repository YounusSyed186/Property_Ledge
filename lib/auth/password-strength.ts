export type PasswordStrengthLevel = "weak" | "fair" | "good" | "strong";

export interface PasswordStrengthResult {
  score: number; // 0 to 4
  label: PasswordStrengthLevel;
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (hasUppercase && hasLowercase) score++;
  if (hasNumber && hasSpecialChar) score++;

  // Cap score between 0 and 4
  const finalScore = password.length === 0 ? 0 : Math.min(4, Math.max(1, score));

  let label: PasswordStrengthLevel = "weak";
  if (finalScore === 2) label = "fair";
  if (finalScore === 3) label = "good";
  if (finalScore >= 4) label = "strong";

  return {
    score: finalScore,
    label,
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar,
  };
}

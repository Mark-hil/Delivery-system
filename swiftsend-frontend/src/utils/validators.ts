export const isEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

// Accepts Ghanaian-style numbers like 0244812556 or +233244812556, with optional spacing.
export const isPhone = (value: string): boolean =>
  /^(\+?233|0)[\s-]?\d{2}[\s-]?\d{3}[\s-]?\d{4}$/.test(value.trim());

export const isEmailOrPhone = (value: string): boolean =>
  isEmail(value) || isPhone(value);

export interface PasswordCheck {
  valid: boolean;
  messages: string[];
}

export const checkPassword = (value: string): PasswordCheck => {
  const messages: string[] = [];
  if (value.length < 8) messages.push("At least 8 characters");
  if (!/[A-Z]/.test(value)) messages.push("One uppercase letter");
  if (!/[0-9]/.test(value)) messages.push("One number");
  return { valid: messages.length === 0, messages };
};

export const isRequired = (value: string): boolean => value.trim().length > 0;

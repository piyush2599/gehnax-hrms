export const VALID_ROLES = ["super_admin", "finance_admin", "hr_admin", "manager", "employee"] as const;

/** Returns true if the user has ANY of the specified roles. */
export function hasRole(userRoles: string[], ...allowed: string[]): boolean {
  return userRoles.some((r) => allowed.includes(r));
}

/** Returns true if the user has NONE of the elevated roles (purely an employee). */
export function isEmployeeOnly(userRoles: string[]): boolean {
  return !hasRole(userRoles, "super_admin", "finance_admin", "hr_admin", "manager");
}

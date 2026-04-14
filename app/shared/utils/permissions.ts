export const ROLES = {
  SUPER_ADMIN: 1,
  OVERSEER: 8,
  PASTOR_LEADER: 3,
} as const;

export type RoleId = typeof ROLES[keyof typeof ROLES];

export const isSuperAdmin = (roleId?: number | null): boolean => roleId === ROLES.SUPER_ADMIN;
export const isOverseer = (roleId?: number | null): boolean => roleId === ROLES.OVERSEER;
export const isPastorLeader = (roleId?: number | null): boolean => roleId === ROLES.PASTOR_LEADER;



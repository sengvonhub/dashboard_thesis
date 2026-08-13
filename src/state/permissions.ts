export const Permissions = {
  READ_OWN_PROFILE: "read_own_profile",

  // Attendance
  VIEW_OWN_ATTENDANCE: "view_own_attendance",
  VIEW_TEAM_ATTENDANCE: "view_team_attendance",
  MANAGE_ATTENDANCE_SETTINGS: "manage_attendance_settings",

  // Leave
  REQUEST_LEAVE: "request_leave",
  APPROVE_LEAVE: "approve_leave",
  VIEW_TEAM_LEAVE: "view_team_leave",

  // Salary
  VIEW_OWN_SALARY: "view_own_salary",
  VIEW_TEAM_SALARY: "view_team_salary",
  MANAGE_SALARY: "manage_salary",

  // Staff / users
  VIEW_USERS: "view_users",
  VIEW_OWN_PROFILE: "view_own_profile",
  MANAGE_STAFF: "manage_staff",
  MANAGE_USERS: "manage_users",

  // Company
  VIEW_COMPANY: "view_company",
  MANAGE_COMPANY: "manage_company",

  MANAGE_ROLES: "manage_roles",
  MANAGE_DEPARTMENTS: "manage_departments",
} as const;

export type PermissionCode = (typeof Permissions)[keyof typeof Permissions];

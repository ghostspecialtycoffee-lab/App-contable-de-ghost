export const firestorePaths = {
  users: () => "users",
  user: (userId: string) => `users/${userId}`,
  organizations: () => "organizations",
  organization: (organizationId: string) => `organizations/${organizationId}`,
  organizationMembers: (organizationId: string) =>
    `organizations/${organizationId}/members`,
  organizationMember: (organizationId: string, userId: string) =>
    `organizations/${organizationId}/members/${userId}`,
  organizationBranches: (organizationId: string) =>
    `organizations/${organizationId}/branches`,
  organizationBranch: (organizationId: string, branchId: string) =>
    `organizations/${organizationId}/branches/${branchId}`,
  organizationAuditLogs: (organizationId: string) =>
    `organizations/${organizationId}/auditLogs`,
} as const;

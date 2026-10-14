// Main app shell: top navigation with expandable module groups (Corporate, Branch, Sports Facility, etc.)
export const DashboardLocators = {
  corporateMenu: 'span.ui-menu-label:has-text("Corporate")',
  userManagementMenuItem: 'text=User Management',
  branchMenu: 'span.ui-menu-label:has-text("Branch")',
  branchListMenuItem: 'text=Branch List',
} as const;

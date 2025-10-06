// Role-based permissions configuration and helpers

const PERMISSIONS = {
  super_admin: {
    hitl_quotes: ['view', 'edit', 'edit_pricing', 'delete', 'create'],
    quotes: ['view', 'edit', 'delete', 'create'],
    orders: ['view', 'edit', 'delete', 'status_change', 'upload', 'assign'],
    users: ['view', 'edit', 'delete', 'create'],
    admins: ['view', 'edit', 'delete', 'create'],
    settings: ['view', 'edit'],
    settings_system: ['view', 'edit'],
    analytics: ['view', 'export'],
    logs: ['view'],
    messages: ['send']
  },
  manager: {
    hitl_quotes: ['view', 'edit'],
    quotes: ['view', 'edit'],
    orders: ['view', 'edit', 'status_change', 'upload'],
    users: ['view', 'edit'],
    admins: [],
    settings: ['view', 'edit'],
    settings_system: [],
    analytics: ['view'],
    logs: [],
    messages: ['send']
  },
  project_manager: {
    hitl_quotes: ['view', 'edit'],
    quotes: ['view'],
    orders: ['view', 'edit', 'status_change', 'upload', 'assign'],
    users: ['view'],
    admins: [],
    settings: [],
    settings_system: [],
    analytics: ['view'],
    logs: [],
    messages: ['send']
  },
  associate: {
    hitl_quotes: ['view'],
    quotes: ['view'],
    orders: ['view', 'status_change', 'upload'],
    users: [],
    admins: [],
    settings: [],
    settings_system: [],
    analytics: [],
    logs: [],
    messages: ['send']
  },
  accountant: {
    hitl_quotes: ['view'],
    quotes: ['view'],
    orders: ['view'],
    users: ['view'],
    admins: [],
    settings: [],
    settings_system: [],
    analytics: ['view', 'export'],
    logs: [],
    messages: []
  },
  sales: {
    hitl_quotes: ['view'],
    quotes: ['view'],
    orders: ['view'],
    users: ['view', 'create'],
    admins: [],
    settings: [],
    settings_system: [],
    analytics: ['view'],
    logs: [],
    messages: ['send']
  }
};

function normalizeRole(role) {
  const r = (role || '').toString().trim().toLowerCase();
  if (!r) return null;
  return r;
}

export function hasPermission(role, resource, action) {
  const r = normalizeRole(role);
  if (!r || !(r in PERMISSIONS)) return false;
  const res = PERMISSIONS[r] || {};
  const actions = res[resource] || [];
  return actions.includes(action);
}

// Specific helpers
export const canViewHITLQuotes = (role) => hasPermission(role, 'hitl_quotes', 'view');
export const canEditHITLQuote = (role) => hasPermission(role, 'hitl_quotes', 'edit');
export const canDeleteHITLQuote = (role) => hasPermission(role, 'hitl_quotes', 'delete');
export const canCreateHITLQuote = (role) => hasPermission(role, 'hitl_quotes', 'create');

export const canViewQuotes = (role) => hasPermission(role, 'quotes', 'view');
export const canEditQuote = (role) => hasPermission(role, 'quotes', 'edit');
export const canDeleteQuote = (role) => hasPermission(role, 'quotes', 'delete');
export const canCreateQuote = (role) => hasPermission(role, 'quotes', 'create');

export const canViewOrders = (role) => hasPermission(role, 'orders', 'view');
export const canEditOrder = (role) => hasPermission(role, 'orders', 'edit');
export const canDeleteOrder = (role) => hasPermission(role, 'orders', 'delete');
export const canChangeOrderStatus = (role) => hasPermission(role, 'orders', 'status_change');
export const canUploadFiles = (role) => hasPermission(role, 'orders', 'upload');
export const canAssignOrders = (role) => hasPermission(role, 'orders', 'assign');

export const canSendMessages = (role) => hasPermission(role, 'messages', 'send');

export const canViewUsers = (role) => hasPermission(role, 'users', 'view');
export const canEditUsers = (role) => hasPermission(role, 'users', 'edit');
export const canCreateUsers = (role) => hasPermission(role, 'users', 'create');
export const canDeleteUsers = (role) => hasPermission(role, 'users', 'delete');

export const canManageAdmins = (role) => hasPermission(role, 'admins', 'view') || hasPermission(role, 'admins', 'edit') || hasPermission(role, 'admins', 'create') || hasPermission(role, 'admins', 'delete');

export const canViewSettings = (role) => hasPermission(role, 'settings', 'view');
export const canEditSettings = (role) => hasPermission(role, 'settings', 'edit');
export const canViewSystemSettings = (role) => hasPermission(role, 'settings_system', 'view');
export const canEditSystemSettings = (role) => hasPermission(role, 'settings_system', 'edit');

export const canViewAnalytics = (role) => hasPermission(role, 'analytics', 'view');
export const canExportData = (role) => hasPermission(role, 'analytics', 'export');

export const canViewLogs = (role) => hasPermission(role, 'logs', 'view');

export default PERMISSIONS;

// Compatibility facade: database, authentication and settings have dedicated modules.
export { data } from '../database/connection.js';
export { hashPassword, verifyPassword } from '../auth/passwords.js';
export { initializeAccounts, userByName, changePassword } from '../auth/accounts.js';
export { createSession, getSession, deleteSession } from '../auth/sessions.js';
export { setting, setSetting } from '../database/settings.js';

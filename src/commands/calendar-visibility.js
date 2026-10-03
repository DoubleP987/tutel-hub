export function calendarEnabled(config, options) {
  return Boolean(config?.channel_id && options?.enabled !== false);
}

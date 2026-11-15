// Deliberately select a staging database; never inherit the shared CRM database.
export function databaseConfig(env = process.env) {
  let url = null;
  try {
    const value = new URL(env.SUPABASE_URL);
    if (value.protocol === 'https:' && !value.username && !value.password && value.pathname === '/' && !value.search && !value.hash) url = value.origin;
  } catch {}
  const key = env.SUPABASE_PUBLISHABLE_KEY || '';
  const enabled = env.DATABASE_STAGING_APPROVED === 'true' && !!url && key.startsWith('sb_publishable_');
  return {enabled, url: enabled ? url : null, publishableKey: enabled ? key : null};
}

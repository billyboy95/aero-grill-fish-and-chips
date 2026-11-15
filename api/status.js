import {json} from '../lib/server.js';
import {paymentConfig} from '../lib/payment-config.js';
import {databaseConfig} from '../lib/database-config.js';
export default async function handler(req,res) {
  if (req.method !== 'GET') return json(res,405,{message:'Method not allowed'});
  const payment = paymentConfig(), db = databaseConfig();
  let database = db.enabled ? 'unavailable' : 'not_configured';
  if (db.enabled) {
    try {
      const response = await fetch(`${db.url}/rest/v1/restaurant_tenants?select=business_mode&id=eq.aero-grill`, {
        headers:{apikey:db.publishableKey}, signal:AbortSignal.timeout(5000)
      });
      const rows = response.ok ? await response.json() : [];
      database = rows[0]?.business_mode === 'demo' ? 'ready' : 'not_demo';
    } catch {}
  }
  const ready = database === 'ready';
  return json(res, db.enabled && !ready ? 503 : 200, {
    ok: !db.enabled || ready, apiHealthy:true, project:'aero-grill',version:'1.1.1',
    database, orderingReady:ready, liveOrders:false,
    publicConfig:ready ? {supabaseUrl:db.url,supabaseKey:db.publishableKey} : null,
    yoco:ready && payment.enabled,paymentMode:ready && payment.enabled ? payment.mode : 'disabled',
    whatsapp:false, simulationUrl:'/demo/', wallets:'Provider/device dependent; not verified',nfc:'external-certified-yoco-app'
  });
}

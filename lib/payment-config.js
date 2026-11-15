export function paymentConfig(env=process.env){
 const mode=env.PAYMENT_MODE||'disabled';
 const key=env.YOCO_SECRET_KEY||'';
 const test=mode==='test'&&key.startsWith('sk_test_');
 const live=mode==='live'&&key.startsWith('sk_live_')&&env.RESTAURANT_LIVE_APPROVED==='true';
 let origin=null;try{const u=new URL(env.PUBLIC_BASE_URL);if(u.protocol==='https:'&&!u.username&&!u.password&&u.pathname==='/')origin=u.origin}catch{}
 return {mode,origin,enabled:!!((test||live)&&origin&&env.YOCO_WEBHOOK_SECRET&&env.RESTAURANT_INTERNAL_SECRET)};
}

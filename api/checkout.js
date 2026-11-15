import {json,rpc,rawBody} from '../lib/server.js';
import {paymentConfig} from '../lib/payment-config.js';
export const config={api:{bodyParser:false}};
export default async function handler(req,res){
 if(req.method!=='POST')return json(res,405,{message:'Method not allowed'});
 const settings=paymentConfig();
 if(!settings.enabled)return json(res,503,{message:'Online payments are not activated. No payment initiated.'});
 try{
  const p=JSON.parse((await rawBody(req)).toString());
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if(!uuid.test(p.id)||!uuid.test(p.token))return json(res,400,{message:'Invalid order reference'});
  const args={p_id:p.id,p_token:p.token,p_secret:process.env.RESTAURANT_INTERNAL_SECRET,p_checkout:null};
  const order=await rpc('restaurant_internal_order',args);
  if(order.payment_status!=='pending')return json(res,409,{message:'Order is not awaiting payment'});
  if(!Number.isSafeInteger(order.amount_cents)||order.amount_cents<=0)throw Error('Invalid order amount');
  // Identical provider idempotency key and body make retries safe, including a lost response.
  const r=await fetch('https://payments.yoco.com/api/checkouts',{method:'POST',signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${process.env.YOCO_SECRET_KEY}`,'Content-Type':'application/json','Idempotency-Key':p.id},body:JSON.stringify({amount:order.amount_cents,currency:'ZAR',successUrl:`${settings.origin}/?payment=return#track`,cancelUrl:`${settings.origin}/?payment=cancel#track`,failureUrl:`${settings.origin}/?payment=failed#track`,metadata:{orderId:p.id,tenant:'aero-grill'}})});
  const checkout=await r.json();
  if(!r.ok||!checkout.id||!checkout.redirectUrl||checkout.processingMode!==settings.mode)throw Error('Unexpected checkout response');
  const redirect=new URL(checkout.redirectUrl);
  if(redirect.protocol!=='https:'||!['c.yoco.com','payments.yoco.com'].includes(redirect.hostname))throw Error('Invalid checkout URL');
  if(order.external_checkout_id&&order.external_checkout_id!==checkout.id)throw Error('Checkout mismatch');
  await rpc('restaurant_internal_order',{...args,p_checkout:checkout.id});
  return json(res,200,{redirectUrl:checkout.redirectUrl,checkoutId:checkout.id,mode:settings.mode});
 }catch{return json(res,502,{message:'Payment checkout could not be started. Your order remains saved; retry payment from Track order.'})}
}

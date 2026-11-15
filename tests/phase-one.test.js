import test from 'node:test';import assert from 'node:assert/strict';import crypto from 'node:crypto';
import {verifyStandardWebhook,rawBody} from '../lib/server.js';
import {paymentConfig} from '../lib/payment-config.js';
import {deliveryQuote,validateCheckout,nextStatuses,readStored} from '../assets/checkout-model.js';
import checkout from '../api/checkout.js';import webhook from '../api/yoco-webhook.js';
const profile={content_approved:true,delivery_enabled:true,delivery_zones:[{id:'test',name:'Test area',fee_cents:2500,postcodes:['1500']}]};
const order={customer_name:'Demo Customer',phone:'082 000 0000',fulfilment:'Collection',payment_method:'cash',notes:'',delivery:{address:'1 Test Street',postcode:'1500',zone_id:'test'}};
const secret='whsec_'+Buffer.from('unit-test-signing-secret').toString('base64');
function signed(body,ts=String(Math.floor(Date.now()/1000))){const id='evt_fixture';return {headers:{'webhook-id':id,'webhook-timestamp':ts,'webhook-signature':'v1,'+crypto.createHmac('sha256',Buffer.from(secret.slice(6),'base64')).update(`${id}.${ts}.${body}`).digest('base64')},body}}
function response(){return {status(n){this.code=n;return this},setHeader(){return this},send(body){this.data=JSON.parse(body);return this}}}
test('valid webhook signature, stale timestamp and tampered body',()=>{const r=signed('{}');assert.ok(verifyStandardWebhook(r,Buffer.from('{}'),secret));assert.equal(verifyStandardWebhook(r,Buffer.from('{"changed":true}'),secret),false);assert.equal(verifyStandardWebhook(signed('{}','NaN'),Buffer.from('{}'),secret),false);assert.equal(verifyStandardWebhook(signed('{}','1'),Buffer.from('{}'),secret),false)});
test('oversized bodies rejected',async()=>{await assert.rejects(()=>rawBody({body:'x'.repeat(262145)}),/too large/)});
test('payments fail closed and test keys cannot activate live mode',()=>{assert.equal(paymentConfig({}).enabled,false);const e={PAYMENT_MODE:'test',YOCO_SECRET_KEY:'sk_test_fixture',YOCO_WEBHOOK_SECRET:secret,RESTAURANT_INTERNAL_SECRET:'test',PUBLIC_BASE_URL:'https://preview.example'};assert.equal(paymentConfig(e).enabled,true);assert.equal(paymentConfig({...e,PAYMENT_MODE:'live',RESTAURANT_LIVE_APPROVED:'true'}).enabled,false);assert.equal(paymentConfig({...e,PUBLIC_BASE_URL:'http://preview.example'}).enabled,false)});
test('delivery fee is calculated from configuration and matching postcode',()=>{assert.equal(deliveryQuote(profile,'Delivery','test','1500').fee,2500);assert.ok(deliveryQuote(profile,'Delivery','test','9999').error);assert.ok(deliveryQuote({...profile,content_approved:false},'Delivery','test','1500').error);assert.equal(deliveryQuote(null,'Collection','','').fee,0)});
test('checkout validates name, phone and delivery address',()=>{assert.equal(validateCheckout(order,profile),null);assert.match(validateCheckout({...order,phone:'123'},profile),/mobile/);assert.match(validateCheckout({...order,fulfilment:'Delivery',delivery:{...order.delivery,address:''}},profile),/address/)});
test('unpaid online orders cannot progress to preparation',()=>{assert.deepEqual(nextStatuses('New','online','pending'),['Cancelled']);assert.deepEqual(nextStatuses('Ready','cash','unpaid'),['Completed']);assert.deepEqual(nextStatuses('Completed','cash','paid'),[])});
test('corrupt local storage does not crash startup',()=>{assert.deepEqual(readStored({getItem:()=>'{bad'},'x',[]),[]);assert.deepEqual(readStored({getItem:()=>'{"a":1}'},'x',[]),[])});
test('disabled checkout does not contact payment gateway',async()=>{const res=response();await checkout({method:'POST',headers:{},body:'{}'},res);assert.equal(res.code,503)});
test('signed Yoco metadata checkoutId reaches reconciliation; missing currency is rejected',async()=>{
 const previous={...process.env};const originalFetch=global.fetch;
 Object.assign(process.env,{DATABASE_STAGING_APPROVED:'true',SUPABASE_URL:'https://staging.example',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture',PAYMENT_MODE:'test',YOCO_SECRET_KEY:'sk_test_fixture',YOCO_WEBHOOK_SECRET:secret,RESTAURANT_INTERNAL_SECRET:'fixture',PUBLIC_BASE_URL:'https://preview.example'});
 let calls=[];global.fetch=async(url,opts)=>{calls.push(JSON.parse(opts.body));return {ok:true,json:async()=>true}};
 try{const body=JSON.stringify({type:'payment.succeeded',payload:{metadata:{checkoutId:'checkout_fixture'},amount:12300,currency:'ZAR',mode:'test'}});const res=response();await webhook({...signed(body),method:'POST'},res);assert.equal(res.code,200);assert.equal(calls[0].p_checkout,'checkout_fixture');
 const bad=JSON.stringify({type:'payment.succeeded',payload:{metadata:{checkoutId:'checkout_fixture'},amount:12300,mode:'test'}});const r=response();await webhook({...signed(bad),method:'POST'},r);assert.equal(r.code,422);assert.equal(calls.length,1);
 }finally{global.fetch=originalFetch;for(const k of Object.keys(process.env))if(!(k in previous))delete process.env[k];Object.assign(process.env,previous)}
});

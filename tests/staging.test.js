import test from 'node:test';
import assert from 'node:assert/strict';
import {databaseConfig} from '../lib/database-config.js';
import status from '../api/status.js';
import whatsapp from '../api/whatsapp.js';
const response=()=>({status(n){this.code=n;return this},setHeader(){return this},send(s){this.data=JSON.parse(s);return this}});
const env={DATABASE_STAGING_APPROVED:'true',SUPABASE_URL:'https://staging.example',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture'};
test('database is disconnected by default and private keys are never public config',()=>{
  assert.equal(databaseConfig({}).enabled,false);
  assert.equal(databaseConfig({...env,DATABASE_STAGING_APPROVED:'false'}).enabled,false);
  assert.equal(databaseConfig({...env,SUPABASE_PUBLISHABLE_KEY:'sb_secret_fixture'}).enabled,false);
  assert.equal(databaseConfig({...env,SUPABASE_URL:'https://user:password@staging.example'}).enabled,false);
  assert.equal(databaseConfig(env).enabled,true);
});
test('status distinguishes an available API from an unconfigured database',async()=>{
  const res=response();await status({method:'GET'},res);
  assert.equal(res.code,200);assert.equal(res.data.apiHealthy,true);
  assert.equal(res.data.database,'not_configured');assert.equal(res.data.orderingReady,false);
  assert.equal(res.data.publicConfig,null);assert.equal(res.data.liveOrders,false);
});
test('status checks the tenant and fails closed on live or unavailable databases',async()=>{
  const previous={...process.env},originalFetch=global.fetch;
  try {
    Object.assign(process.env,env);
    global.fetch=async()=>({ok:true,json:async()=>[{business_mode:'demo'}]});
    let res=response();await status({method:'GET'},res);assert.equal(res.code,200);assert.equal(res.data.orderingReady,true);
    global.fetch=async()=>({ok:true,json:async()=>[{business_mode:'live'}]});
    res=response();await status({method:'GET'},res);assert.equal(res.code,503);assert.equal(res.data.publicConfig,null);
    global.fetch=async()=>{throw Error('Offline')};
    res=response();await status({method:'GET'},res);assert.equal(res.code,503);assert.equal(res.data.database,'unavailable');
  } finally {global.fetch=originalFetch;for(const key of Object.keys(process.env))if(!(key in previous))delete process.env[key];Object.assign(process.env,previous)}
});
test('WhatsApp cannot send solely because credentials are present',async()=>{
  const previous={...process.env},originalFetch=global.fetch;
  try {
    Object.assign(process.env,{WA_APP_SECRET:'fixture',WA_ACCESS_TOKEN:'fixture',WA_SEND_APPROVED:'false'});
    let calls=0;global.fetch=async()=>{calls++;throw Error('Must not send')};
    const res=response();await whatsapp({method:'POST',headers:{},body:'{}'},res);
    assert.equal(res.code,503);assert.equal(calls,0);
  } finally {global.fetch=originalFetch;for(const key of Object.keys(process.env))if(!(key in previous))delete process.env[key];Object.assign(process.env,previous)}
});

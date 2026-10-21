import {createClient} from 'npm:@supabase/supabase-js@2.117.3';
import Stripe from 'npm:stripe@23.0.0';
import {billingHandler} from './handler.mjs';
const site='https://gestionale-social.vercel.app';
Deno.serve(async req=>{
 const key=Deno.env.get('KAIRO_STRIPE_TEST_KEY')||'';
 const safeKey=/^(rk|sk)_test_/.test(key);
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 const stripe=safeKey?new Stripe(key,{httpClient:Stripe.createFetchHttpClient(),maxNetworkRetries:2,timeout:15000}):null;
 return billingHandler({db,stripe,site,enabled:Deno.env.get('KAIRO_BILLING_TEST_ENABLED')==='true',webhookReady:!!Deno.env.get('KAIRO_STRIPE_TEST_WEBHOOK_SECRET'),allowedUsers:(Deno.env.get('KAIRO_BILLING_TEST_USERS')||'').split(',').map(s=>s.trim()).filter(Boolean),authenticate:async request=>{const token=(request.headers.get('authorization')||'').replace(/^Bearer /,'');if(!token)return null;const r=await db.auth.getUser(token);return r.error?null:r.data.user}})(req);
});

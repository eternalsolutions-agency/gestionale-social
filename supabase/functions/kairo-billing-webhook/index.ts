import {createClient} from 'npm:@supabase/supabase-js@2.117.3';
import Stripe from 'npm:stripe@23.0.0';
import {webhookHandler} from './handler.mjs';
Deno.serve(req=>{
 const key=Deno.env.get('KAIRO_STRIPE_TEST_KEY')||'';
 const stripe=/^(rk|sk)_test_/.test(key)?new Stripe(key,{httpClient:Stripe.createFetchHttpClient(),maxNetworkRetries:2,timeout:15000}):null;
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 return webhookHandler({stripe,db,secret:Deno.env.get('KAIRO_STRIPE_TEST_WEBHOOK_SECRET'),cryptoProvider:Stripe.createSubtleCryptoProvider()})(req);
});

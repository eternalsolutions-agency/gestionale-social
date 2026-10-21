import {BILLING_PLANS,BILLING_PORTAL,selectedPrice,pricePlan,checkoutPayload,safeStripeRedirect} from '../_shared/billing-core.mjs';
export function billingHandler({db,stripe,authenticate,site,enabled,allowedUsers,webhookReady}){
 const cors={'Access-Control-Allow-Origin':site,'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store'};
 const json=(value,status=200)=>Response.json(value,{status,headers:cors});
 const checked=async(promise)=>{const r=await promise;if(r.error)throw r.error;return r.data};
 async function account(owner){return await checked(db.from('kairo_test_billing_accounts').select('*').eq('owner_id',owner).maybeSingle())}
 return async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return json({error:'Metodo non disponibile.'},405);
  const origin=req.headers.get('origin');if(origin&&origin!==site)return json({error:'Origine non consentita.'},403);
  try{
   const user=await authenticate(req);if(!user)return json({error:'Accedi a RP Social.'},401);
   let body;try{body=await req.json()}catch{return json({error:'Richiesta non valida.'},400)}
   if(!['status','checkout','portal','cancel_checkout'].includes(body.action))return json({error:'Operazione non disponibile.'},400);
   const business=await checked(db.from('businesses').select('id,owner_id').eq('id',body.business_id).maybeSingle());
   if(!business||business.owner_id!==user.id)return json({error:'Solo il titolare può gestire l’abbonamento.'},403);
   const row=await account(user.id),ready=!!stripe&&enabled&&webhookReady&&allowedUsers.includes(user.id);
   if(body.action==='status')return json({mode:'test',ready,catalog:Object.entries(BILLING_PLANS).map(([id,p])=>({id,name:p.name,month:p.month,year:p.year})),subscription:row?{plan:row.plan,interval:row.billing_interval,status:row.status,cancel_at_period_end:row.cancel_at_period_end,paid_until:row.paid_until,has_customer:!!row.customer_id,checkout_pending:!!row.checkout_attempt,checkout_plan:row.checkout_plan,checkout_interval:row.checkout_interval}:null,note:ready?'Modalità test: nessun incasso reale e nessuna modifica alle quote reali.':'Checkout test in preparazione. Il titolare deve completare la configurazione server.'});
   if(!ready)return json({error:'Il checkout test non è ancora attivo. Completa la configurazione server.'},503);
   if(body.action==='portal'){
    if(!row?.customer_id)return json({error:'Non hai ancora un abbonamento test da gestire.'},409);
    const portal=await stripe.billingPortal.sessions.create({customer:row.customer_id,configuration:BILLING_PORTAL,return_url:site+'/abbonamento'});
    return json({url:safeStripeRedirect(portal.url)});
   }
   if(body.action==='cancel_checkout'){
    if(row?.checkout_session_id){const session=await stripe.checkout.sessions.retrieve(row.checkout_session_id);if(session.status==='complete')return json({error:'Il checkout è già completato. Aggiorna lo stato o apri Gestisci abbonamento.'},409);if(session.status==='open')await stripe.checkout.sessions.expire(session.id)}
    if(row?.checkout_attempt&&!row.checkout_session_id)return json({error:'Il checkout è ancora in preparazione. Attendi e riprova.'},409);
    if(row)await checked(db.from('kairo_test_billing_accounts').update({checkout_attempt:null,checkout_session_id:null,checkout_expires_at:null}).eq('owner_id',user.id).eq('checkout_attempt',row.checkout_attempt));
    return json({cancelled:true});
   }
   let price;try{price=selectedPrice(body.plan,body.interval)}catch(e){return json({error:e.message},400)}
   const remotePrice=await stripe.prices.retrieve(price);pricePlan(remotePrice);if(!remotePrice.active)return json({error:'Piano non disponibile.'},409);
   const claim=await checked(db.rpc('kairo_test_checkout_claim',{p_owner:user.id,p_plan:body.plan,p_interval:body.interval}));
   let customer=claim.customer_id;
   if(!customer){const created=await stripe.customers.create({email:user.email,metadata:{application:'kairo',owner_id:user.id}},{idempotencyKey:'kairo-test-customer-'+user.id});customer=created.id;await checked(db.from('kairo_test_billing_accounts').update({customer_id:customer}).eq('owner_id',user.id))}
   if(claim.checkout_session_id){const old=await stripe.checkout.sessions.retrieve(claim.checkout_session_id);if(old.status==='open')return json({url:safeStripeRedirect(old.url)});return json({error:'Il checkout è terminato. Aggiorna lo stato prima di continuare.'},409)}
   const active=await stripe.subscriptions.list({customer,status:'all',limit:100});
   if(active.has_more||active.data.some(s=>s.metadata?.application==='kairo'&&!['canceled','incomplete_expired'].includes(s.status)))return json({error:'Esiste già un abbonamento test. Attendi la sincronizzazione o apri Gestisci abbonamento.'},409);
   const session=await stripe.checkout.sessions.create(checkoutPayload({customer,owner:user.id,price,site,attempt:claim.checkout_attempt}),{idempotencyKey:'kairo-test-checkout-'+claim.checkout_attempt});
   await checked(db.from('kairo_test_billing_accounts').update({checkout_session_id:session.id,checkout_expires_at:new Date(session.expires_at*1000).toISOString()}).eq('owner_id',user.id).eq('checkout_attempt',claim.checkout_attempt));
   return json({url:safeStripeRedirect(session.url)});
  }catch(e){if(String(e.message).includes('Hai già')||String(e.message).includes('Hai un checkout'))return json({error:e.message},409);return json({error:'Non riesco a completare l’operazione Stripe. Riprova tra poco.'},502)}
 };
}

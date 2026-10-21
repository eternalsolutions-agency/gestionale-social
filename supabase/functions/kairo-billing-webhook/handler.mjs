import {BILLING_EVENTS,subscriptionSnapshot} from '../_shared/billing-core.mjs';
export function webhookHandler({stripe,db,secret,cryptoProvider}){
 return async req=>{
  if(req.method!=='POST')return new Response('Method not allowed',{status:405});
  if(!stripe||!secret)return Response.json({error:'Webhook non configurato.'},{status:503});
  let event;try{event=await stripe.webhooks.constructEventAsync(await req.text(),req.headers.get('stripe-signature')||'',secret,300,cryptoProvider)}catch{return Response.json({error:'Firma non valida.'},{status:400})}
  if(event.livemode!==false||event.account)return Response.json({error:'Ambiente non consentito.'},{status:400});
  if(!BILLING_EVENTS.includes(event.type))return Response.json({ignored:true});
  try{
   const checked=async promise=>{const r=await promise;if(r.error)throw r.error;return r.data};
   const prior=await checked(db.from('kairo_test_billing_events').select('event_id').eq('event_id',event.id).maybeSingle());if(prior)return Response.json({duplicate:true});
   const object=event.data.object;
   if(event.type==='checkout.session.expired'){
    await checked(db.from('kairo_test_billing_accounts').update({checkout_attempt:null,checkout_session_id:null,checkout_expires_at:null}).eq('checkout_session_id',object.id));
    return Response.json({received:true});
   }
   const subId=event.type.startsWith('customer.subscription.')?object.id:object.parent?.subscription_details?.subscription||object.subscription;
   if(!subId)return Response.json({ignored:true});
   // Fetch current Stripe state, never apply the possibly stale webhook payload as entitlement data.
   const sub=await stripe.subscriptions.retrieve(subId,{expand:['latest_invoice']});
   if(sub.metadata?.application!=='kairo')return Response.json({ignored:true});
   const invoice=typeof sub.latest_invoice==='string'?await stripe.invoices.retrieve(sub.latest_invoice):sub.latest_invoice;
   const snapshot=subscriptionSnapshot(sub,invoice);
   const owner=await checked(db.from('kairo_test_billing_accounts').select('owner_id').eq('customer_id',snapshot.customer_id).maybeSingle());
   if(!owner||owner.owner_id!==snapshot.owner_id)return Response.json({ignored:true});
   const result=await checked(db.rpc('kairo_test_billing_event',{p_event_id:event.id,p_type:event.type,p_created:event.created,p_snapshot:snapshot}));
   return Response.json({received:true,result});
  }catch{return Response.json({error:'Sincronizzazione non completata. Stripe può ritentare.'},{status:500})}
 };
}

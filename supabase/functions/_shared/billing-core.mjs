export const BILLING_ACCOUNT='acct_1USsfnFMrRGLG1OB';
export const BILLING_PORTAL='bpc_1USspZFMrRGLG1OBU8Od6yPh';
export const BILLING_PLANS={
 start:{name:'Start',month:2900,year:27840,stripeAmounts:{month:3538,year:33965},prices:{month:'price_1UTF7LFMrRGLG1OBBnD11Hnv',year:'price_1UTF7QFMrRGLG1OB0AnReKdz'}},
 pro:{name:'Pro',month:4900,year:47040,stripeAmounts:{month:5978,year:57389},prices:{month:'price_1UTF7VFMrRGLG1OBBvaDxBIJ',year:'price_1UTF7bFMrRGLG1OB254rUyuQ'}},
 premium:{name:'Premium',month:6900,year:66240,stripeAmounts:{month:8418,year:80813},prices:{month:'price_1UTF7hFMrRGLG1OBkZoo8oWA',year:'price_1UTF7nFMrRGLG1OBG6E2AT4V'}}
};
export const BILLING_EVENTS=['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed','checkout.session.expired','invoice.paid','invoice.payment_failed','customer.subscription.created','customer.subscription.updated','customer.subscription.deleted'];
export function selectedPrice(plan,interval){if(!Object.hasOwn(BILLING_PLANS,plan)||!['month','year'].includes(interval))throw Error('Scegli un piano e un periodo validi.');return BILLING_PLANS[plan].prices[interval]}
export function pricePlan(price){for(const [plan,p]of Object.entries(BILLING_PLANS))for(const interval of ['month','year'])if(p.prices[interval]===price.id&&price.currency==='eur'&&price.unit_amount===p.stripeAmounts[interval]&&price.recurring?.interval===interval&&(!price.recurring.interval_count||price.recurring.interval_count===1)&&price.livemode===false)return{plan,interval};throw Error('Prezzo Stripe non riconosciuto per RP Social test.');}
export function subscriptionSnapshot(sub,invoice){
 if(sub.livemode!==false||sub.metadata?.application!=='kairo'||sub.items?.data?.length!==1)throw Error('Abbonamento non valido per RP Social test.');
 const item=sub.items.data[0];if(item.quantity!==1)throw Error('Quantità non valida.');
 const choice=pricePlan(item.price),customer=typeof sub.customer==='string'?sub.customer:sub.customer?.id;
 const invoiceSub=invoice?.parent?.subscription_details?.subscription||invoice?.subscription;
 const paid=invoice?.livemode===false&&invoice?.status==='paid'&&invoiceSub===sub.id&&invoice.customer===customer&&sub.status==='active';
 const end=item.current_period_end||sub.current_period_end;
 if(paid&&(!Number.isFinite(end)||end<=0))throw Error('Periodo di fatturazione non valido.');
 return {subscription_id:sub.id,customer_id:customer,owner_id:sub.metadata.owner_id,...choice,status:sub.status,cancel_at_period_end:!!sub.cancel_at_period_end,paid:!!paid,paid_until:paid?new Date(end*1000).toISOString():null};
}
export function checkoutPayload({customer,owner,price,site,attempt}){
 const suffix=attempt.replace(/-/g,'').slice(0,8).split('').map(c=>String.fromCharCode(97+parseInt(c,16))).join('');
 return{mode:'subscription',customer,client_reference_id:owner,line_items:[{price,quantity:1}],automatic_tax:{enabled:true},subscription_data:{trial_period_days:7,billing_mode:{type:'flexible'},metadata:{application:'kairo',owner_id:owner}},metadata:{application:'kairo',owner_id:owner},billing_address_collection:'required',tax_id_collection:{enabled:true},customer_update:{name:'auto',address:'auto'},integration_identifier:'kairo_sandbox_'+suffix,success_url:site+'/abbonamento?checkout=returned',cancel_url:site+'/abbonamento?checkout=cancelled'};
}
export function safeStripeRedirect(value){const u=new URL(value);if(u.protocol!=='https:'||!['checkout.stripe.com','billing.stripe.com'].includes(u.hostname)||u.username||u.password)throw Error('Collegamento Stripe non valido.');return u.href;}

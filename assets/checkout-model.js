export function readStored(storage,key,fallback){try{const value=JSON.parse(storage.getItem(key));if(value===null)return fallback;if(Array.isArray(fallback)&&!Array.isArray(value))return fallback;return value}catch{return fallback}}
export function deliveryQuote(profile,fulfilment,zoneId,postcode){
 if(fulfilment!=='Delivery')return {fee:0};
 if(!profile?.content_approved||!profile?.delivery_enabled)return {fee:0,error:true,message:'Delivery is not activated'};
 const zone=profile.delivery_zones?.find(z=>z.id===zoneId&&z.postcodes?.includes(postcode));
 if(!zone||!Number.isSafeInteger(zone.fee_cents)||zone.fee_cents<0)return {fee:0,error:true,message:'Choose a supported area and postcode'};
 return {fee:zone.fee_cents};
}
export function validateCheckout(p,profile){
 if(p.customer_name.length<2||p.customer_name.length>80)return 'Enter your full name';
 if(!/^(\+27|0)\d{9}$/.test(p.phone.replace(/[^\d+]/g,'')))return 'Enter a valid South African mobile number';
 if(!['Collection','Dine-in','Delivery'].includes(p.fulfilment))return 'Choose an order type';
 if(!['cash','online'].includes(p.payment_method))return 'Choose a payment method';
 if(p.notes.length>400)return 'Instructions must be under 400 characters';
 const q=deliveryQuote(profile,p.fulfilment,p.delivery.zone_id,p.delivery.postcode);if(q.error)return q.message;
 if(p.fulfilment==='Delivery'&&(p.delivery.address.length<5||p.delivery.address.length>250))return 'Enter your delivery address';
 return null;
}
export function nextStatuses(status,method,payment){if(method==='online'&&payment!=='paid')return ['New','Preparing'].includes(status)?['Cancelled']:[];return {New:['Preparing','Cancelled'],Preparing:['Ready','Cancelled'],Ready:['Completed']}[status]||[]}

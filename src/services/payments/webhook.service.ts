// ==========================================================
// CREDI MARKETPLACE
// Payment Webhook Service
// ==========================================================


import crypto from 'crypto';



export function verifyWebhookSignature(
 payload:string,
 signature:string,
 secret:string
){


 const hash =
 crypto
 .createHmac(
   'sha256',
   secret
 )
 .update(payload)
 .digest('hex');


 return crypto
 .timingSafeEqual(
   Buffer.from(hash),
   Buffer.from(signature)
 );

}

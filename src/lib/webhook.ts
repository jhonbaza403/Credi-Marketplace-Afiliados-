// ==========================================================
// Payment Webhook Handler
// ==========================================================



import {
 verifySignature
}
from './signatures';



export function validateWebhook(

 payload:string,

 signature:string

){


 const secret =
 process.env
 .PAYMENT_WEBHOOK_SECRET;



 if(!secret){

  throw new Error(
   'Missing webhook secret'
  );

 }



 return verifySignature(

  payload,

  signature,

  secret

 );

}

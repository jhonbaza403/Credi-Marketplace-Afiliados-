// ==========================================================
// Webhook Signature Verification
// ==========================================================


import crypto from 'crypto';



export function createSignature(
 payload:string,
 secret:string
){


 return crypto

 .createHmac(
  'sha256',
  secret
 )

 .update(payload)

 .digest('hex');


}





export function verifySignature(

 payload:string,

 signature:string,

 secret:string

){


 const expected =
 createSignature(
  payload,
  secret
 );


 return crypto
 .timingSafeEqual(

  Buffer.from(signature),

  Buffer.from(expected)

 );

}

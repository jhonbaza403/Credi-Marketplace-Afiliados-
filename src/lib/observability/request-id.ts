// ==========================================================
// CREDI MARKETPLACE
// Request ID Generator
// ==========================================================


import crypto from 'crypto';



export function createRequestId(){

 return crypto.randomUUID();

}




export function getRequestId(
 headers:Headers
){

 return (

  headers.get(
   'x-request-id'
  )

 )
 ??
 createRequestId();

}

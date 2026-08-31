// ==========================================================
// Hash Utilities
// ==========================================================


import crypto from 'crypto';



export function hashValue(
 value:string,
 salt:string
){

 return crypto
 .createHash('sha256')
 .update(
  value + salt
 )
 .digest('hex');

}

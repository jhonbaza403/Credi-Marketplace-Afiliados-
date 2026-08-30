// ==========================================================
// Validation Helpers
// ==========================================================


export function isUUID(
 value:string
){

 return /^[0-9a-f]{8}-[0-9a-f-]{27}$/i
 .test(value);

}




export function isEmail(
 value:string
){

 return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
 .test(value);

}

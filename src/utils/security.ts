// ==========================================================
// Security Helpers
// ==========================================================


export function sanitizeString(
 value:string
){

 return value
 .trim()
 .replace(
  /[<>]/g,
  ''
 );

}




export function generateId(){

 return crypto.randomUUID();

}

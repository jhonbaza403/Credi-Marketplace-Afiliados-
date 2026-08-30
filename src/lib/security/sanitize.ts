// ==========================================================
// Input Sanitization
// ==========================================================



export function sanitizeInput(
 value:string
){

 return value

 .trim()

 .replace(
  /<script.*?>.*?<\/script>/gi,
  ''
 )

 .replace(
  /[<>]/g,
  ''

 );

}





export function sanitizeObject<
T extends Record<string,unknown>
>(
 object:T
){

 const result = {} as T;



 for(
  const key
  in object
 ){

  const value =
  object[key];



  result[key] =
   typeof value === 'string'

   ? sanitizeInput(value)

   : value as T[Extract<keyof T,string>];

 }



 return result;

}

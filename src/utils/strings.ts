// ==========================================================
// String Utilities
// ==========================================================


export function slugify(
 value:string
){

 return value
 .toLowerCase()
 .trim()
 .replace(
  /\s+/g,
  '-'
 );

}

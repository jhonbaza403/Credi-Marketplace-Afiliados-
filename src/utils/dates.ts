// ==========================================================
// Date Utilities
// ==========================================================


export function isExpired(
 date:string|Date
){

 return new Date(date)
 <
 new Date();

}



export function addMinutes(
 minutes:number
){

 return new Date(
  Date.now()
  +
  minutes * 60000
 );

}

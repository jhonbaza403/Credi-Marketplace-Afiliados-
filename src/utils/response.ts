// ==========================================================
// API Response Formatter
// ==========================================================


export function successResponse<T>(
 data:T,
 requestId?:string
){

 return {

  success:true,

  data,

  requestId:

   requestId ?? null

 };

}




export function errorResponse(
 message:string,
 requestId?:string
){

 return {

  success:false,

  error:{
    message
  },

  requestId:

   requestId ?? null

 };

}

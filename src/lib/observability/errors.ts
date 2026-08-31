// ==========================================================
// CREDI MARKETPLACE
// Error Handler
// ==========================================================


import {
 logger
}
from './logger';




export function captureError(
 error:unknown,
 context?:Record<string,unknown>
){


 const message =

 error instanceof Error

 ? error.message

 : 'Unknown error';



 logger.error(

  message,

  {

   metadata:
    context

  }

 );


 return {

  message

 };

}

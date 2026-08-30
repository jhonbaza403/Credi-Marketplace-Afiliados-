// ==========================================================
// CREDI MARKETPLACE
// Structured Logger
// ==========================================================



type LogLevel =
'info'
|
'warn'
|
'error';



interface LogContext {

 requestId?:string;

 userId?:string;

 action?:string;

 metadata?:unknown;

}




function writeLog(

 level:LogLevel,

 message:string,

 context?:LogContext

){


 const payload = {

  timestamp:
   new Date()
   .toISOString(),

  level,

  message,

  ...context

 };



 console.log(
  JSON.stringify(payload)
 );

}





export const logger = {


 info(
  message:string,
  context?:LogContext
 ){

  writeLog(
   'info',
   message,
   context
  );

 },



 warn(
  message:string,
  context?:LogContext
 ){

  writeLog(
   'warn',
   message,
   context
  );

 },



 error(
  message:string,
  context?:LogContext
 ){

  writeLog(
   'error',
   message,
   context
  );

 },


};

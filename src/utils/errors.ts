// ==========================================================
// Application Errors
// ==========================================================


export class AppError extends Error {

  statusCode:number;


  constructor(
    message:string,
    statusCode=500
  ){

    super(message);

    this.name='AppError';

    this.statusCode=statusCode;

  }

}



export class ValidationError
extends AppError {

 constructor(
  message:string
 ){

  super(
   message,
   400
  );

 }

}



export class UnauthorizedError
extends AppError {

 constructor(){

  super(
   'Unauthorized',
   401
  );

 }

}



export class ForbiddenError
extends AppError {

 constructor(){

  super(
   'Forbidden',
   403
  );

 }

}

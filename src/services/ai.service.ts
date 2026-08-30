// ==========================================================
// AI Service
// Gemini Integration Layer
// ==========================================================


export interface AIRequest {

 prompt:string;

 userId:string;

}



export async function askAI(
 input:AIRequest
){


 if(
  input.prompt.length > 4000
 ){

  throw new Error(
   'Prompt too long'
  );

 }



 /*
 
 Aquí irá:

 - Gemini API
 - rate limit
 - token budget
 - logging
 - timeout
 
 */


 return {

  message:
  'AI service ready'

 };

}

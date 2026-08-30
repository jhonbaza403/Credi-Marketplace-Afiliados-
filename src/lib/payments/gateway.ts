// ==========================================================
// CREDI MARKETPLACE
// Payment Gateway Abstraction
// ==========================================================


export interface PaymentRequest {

 orderId:string;

 amount:number;

 currency:string;

}



export interface PaymentResponse {

 paymentId:string;

 status:
 'pending'
 |
 'paid'
 |
 'failed';

}




export async function createPayment(
 input:PaymentRequest
):Promise<PaymentResponse>{


 /*
 
 Aquí se conecta:

 - Stripe
 - Binance Pay
 - PayPal
 - Transferencias
 - Otros proveedores

 */


 return {

  paymentId:
   crypto.randomUUID(),

  status:
   'pending'

 };

}

// ==========================================================
// CREDI MARKETPLACE
// Payment Reconciliation Service
// ==========================================================


export interface ReconciliationResult {

 matched:boolean;

 paymentId:string;

 externalReference:string;

}



export async function reconcilePayment(
 externalReference:string
):Promise<ReconciliationResult>{


 /*
 
 Aquí se conectará:

 - proveedor de pago
 - webhook recibido
 - payment_transactions
 - orders
 - seller_balance
 
 */


 return {

   matched:false,

   paymentId:'',

   externalReference

 };

}

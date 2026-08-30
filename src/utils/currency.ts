// ==========================================================
// Currency Utilities
// ==========================================================


export function formatCurrency(
 amount:number,
 currency:string='USD'
){

 return new Intl.NumberFormat(
  'en-US',
  {
   style:'currency',
   currency
  }
 )
 .format(amount);

}




export function roundMoney(
 value:number
){

 return Number(
  value.toFixed(2)
 );

}

// ==========================================================
// CREDI MARKETPLACE
// Order State Machine
// ==========================================================


export type OrderStatus =
 | 'pending'
 | 'paid'
 | 'failed'
 | 'cancelled'
 | 'refunded';



const transitions:Record<
OrderStatus,
OrderStatus[]
>={


 pending:[
   'paid',
   'failed',
   'cancelled'
 ],


 paid:[
   'cancelled',
   'refunded'
 ],


 failed:[],


 cancelled:[],


 refunded:[]

};



export function canChangeOrderStatus(
 current:OrderStatus,
 next:OrderStatus
){

 return transitions[current]
 .includes(next);

}

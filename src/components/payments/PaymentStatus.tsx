// ==========================================================
// ARCHIVO:
// src/components/payments/PaymentStatus.tsx
//
// Estado financiero del pago
// ==========================================================


type PaymentState =

| 'pending'

| 'processing'

| 'completed'

| 'failed'

| 'expired'

| 'refunded';



interface PaymentStatusProps {

status:PaymentState;

transactionId?:string;

}



const PAYMENT_STATUS = {


pending:{
label:'Pendiente',
style:'bg-yellow-100 text-yellow-700',
},


processing:{
label:'Procesando',
style:'bg-blue-100 text-blue-700',
},


completed:{
label:'Completado',
style:'bg-green-100 text-green-700',
},


failed:{
label:'Fallido',
style:'bg-red-100 text-red-700',
},


expired:{
label:'Expirado',
style:'bg-gray-100 text-gray-700',
},


refunded:{
label:'Reembolsado',
style:'bg-purple-100 text-purple-700',
},


} as const;




export default function PaymentStatus({

status,

transactionId,

}:PaymentStatusProps){



const config =
PAYMENT_STATUS[status];



return (

<div

className="
space-y-3

"

>


<span

className={`

inline-flex

rounded-full

px-4

py-2

text-sm

font-bold

${config.style}

`}

>

{config.label}

</span>



{

transactionId && (

<p

className="
break-all

text-xs

text-gray-500

"

>

ID Transacción:

{transactionId}

</p>

)

}



</div>


);


}

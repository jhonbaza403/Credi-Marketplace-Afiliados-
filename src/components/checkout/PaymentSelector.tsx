// ==========================================================
// ARCHIVO:
// src/components/checkout/PaymentSelector.tsx
//
// Selector de métodos de pago B2B
//
// Binance Pay
// USDT TRC20
// Transferencia bancaria
// ==========================================================


'use client';


interface PaymentMethod {


id:string;


name:string;


description:string;


icon:string;


}



interface PaymentSelectorProps {


methods:readonly PaymentMethod[];


selected?:string;


onChange:(id:string)=>void;


}



export default function PaymentSelector({

methods,

selected,

onChange,

}:PaymentSelectorProps){



return (

<div

className="
space-y-4

"

>


<h3

className="
font-bold

text-lg

"

>

Método de pago

</h3>




{

methods.map(

(method)=>(


<button

key={method.id}

type="button"

onClick={()=>onChange(method.id)}

className={`

w-full

rounded-2xl

border

p-5

text-left

transition

${

selected===method.id

?

'border-black bg-gray-100'

:

'hover:bg-gray-50'

}

`}

>


<div

className="
flex

items-center

gap-4

"

>


<span

className="
text-2xl

"

>

{method.icon}

</span>



<div>

<p

className="
font-semibold

"

>

{method.name}

</p>



<p

className="
text-sm

text-gray-500

"

>

{method.description}

</p>


</div>



</div>



</button>


)

)

}



</div>


);


}

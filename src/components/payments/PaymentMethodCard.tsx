// ==========================================================
// ARCHIVO:
// src/components/payments/PaymentMethodCard.tsx
//
// Credi Marketplace
//
// Tarjeta premium de métodos de pago
//
// Soporta:
// - Fiat
// - Crypto
// - Binance Pay
// - USDT TRC20
// - Transferencia bancaria
//
// ==========================================================


interface PaymentMethodCardProps {


name:string;


description:string;


icon:string;


currency:string;


network?:string;


selected?:boolean;


onSelect?:()=>void;


}



export default function PaymentMethodCard({

name,

description,

icon,

currency,

network,

selected=false,

onSelect,

}:PaymentMethodCardProps){



return (

<button

type="button"

onClick={onSelect}

className={`

w-full

rounded-3xl

border

p-6

text-left

transition

shadow-sm

hover:shadow-lg


${

selected

?

'border-black bg-gray-100'

:

'bg-white'

}

`}

>


<div

className="
flex

items-center

gap-5

"

>


<div

className="
flex

h-14

w-14

items-center

justify-center

rounded-2xl

bg-gray-900

text-2xl

text-white

"

>

{icon}

</div>



<div

className="
flex-1

"

>


<h3

className="
font-bold

text-lg

"

>

{name}

</h3>



<p

className="
mt-1

text-sm

text-gray-600

"

>

{description}

</p>


<div

className="
mt-3

flex

gap-2

"

>


<span

className="
rounded-full

bg-gray-100

px-3

py-1

text-xs

font-semibold

"

>

{currency}

</span>



{

network && (

<span

className="
rounded-full

bg-blue-100

px-3

py-1

text-xs

font-semibold

text-blue-700

"

>

{network}

</span>

)

}


</div>


</div>


</div>


</button>


);


}

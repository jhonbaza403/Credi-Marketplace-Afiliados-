// ==========================================================
// ARCHIVO:
// src/components/orders/OrderCard.tsx
//
// Tarjeta premium de orden
// ==========================================================


import OrderStatusBadge from './OrderStatusBadge';



interface OrderCardProps {


id:string;


product:string;


customer:string;


amount:number;


status:
'pending'
|'confirmed'
|'processing'
|'shipped'
|'delivered'
|'cancelled'
|'refunded';


date:string;


}



export default function OrderCard({

id,

product,

customer,

amount,

status,

date,

}:OrderCardProps){



return (

<article

className="
rounded-3xl

border

bg-white

p-6

shadow-sm

transition

hover:shadow-lg

"

>


<div

className="
flex

justify-between

items-start

"

>


<div>


<h3

className="
text-lg

font-bold

"

>

Pedido #{id}

</h3>



<p

className="
mt-1

text-sm

text-gray-500

"

>

{date}

</p>


</div>



<OrderStatusBadge

status={status}

/>


</div>




<div

className="
mt-5

space-y-2

"

>


<p>

<strong>

Producto:

</strong>

{product}

</p>



<p>

<strong>

Cliente:

</strong>

{customer}

</p>



<p

className="
text-xl

font-bold

"

>

${amount.toFixed(2)}

</p>



</div>



</article>


);


}

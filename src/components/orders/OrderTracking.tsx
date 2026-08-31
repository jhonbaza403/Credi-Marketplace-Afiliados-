// ==========================================================
// ARCHIVO:
// src/components/orders/OrderTracking.tsx
//
// Seguimiento logístico premium
// ==========================================================


interface OrderTrackingProps {


trackingNumber:string;


carrier:string;


status:string;


}



export default function OrderTracking({

trackingNumber,

carrier,

status,

}:OrderTrackingProps){



return (

<section

className="
rounded-3xl

border

bg-white

p-6

shadow-sm

"

>


<h2

className="
text-xl

font-bold

"

>

Seguimiento del envío

</h2>



<div

className="
mt-5

space-y-3

"

>


<p>

Transportadora:

<strong>

 {carrier}

</strong>

</p>



<p>

Código:

<strong>

 {trackingNumber}

</strong>

</p>



<div

className="
rounded-xl

bg-gray-100

p-4

font-semibold

"

>

Estado actual:

{status}

</div>



</div>


</section>


);


}

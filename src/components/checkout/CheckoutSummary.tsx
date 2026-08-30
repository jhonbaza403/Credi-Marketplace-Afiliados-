// ==========================================================
// ARCHIVO:
// src/components/checkout/CheckoutSummary.tsx
//
// Resumen financiero del checkout
// ==========================================================


interface CheckoutSummaryProps {


subtotal:number;


commission?:number;


shipping?:number;


tax?:number;


}



export default function CheckoutSummary({

subtotal,

commission=0,

shipping=0,

tax=0,

}:CheckoutSummaryProps){



const total =

subtotal +

shipping +

tax +

commission;




return (

<section

className="
rounded-2xl

border

bg-white

p-6

shadow-sm

"

>


<h3

className="
text-xl

font-bold

"

>

Resumen del pedido

</h3>



<div

className="
mt-5

space-y-3

text-sm

"

>


<div className="flex justify-between">

<span>

Subtotal

</span>

<strong>

${subtotal.toFixed(2)}

</strong>

</div>



<div className="flex justify-between">

<span>

Comisión plataforma

</span>

<strong>

${commission.toFixed(2)}

</strong>

</div>



<div className="flex justify-between">

<span>

Envío

</span>

<strong>

${shipping.toFixed(2)}

</strong>

</div>



<div className="flex justify-between">

<span>

Impuestos

</span>

<strong>

${tax.toFixed(2)}

</strong>

</div>



<hr />



<div

className="
flex

justify-between

text-lg

font-bold

"

>


<span>

Total

</span>


<strong>

${total.toFixed(2)}

</strong>


</div>



</div>


</section>


);


}

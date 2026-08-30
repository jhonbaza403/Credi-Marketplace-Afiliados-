// ==========================================================
// ARCHIVO:
// src/components/payments/RefundModal.tsx
//
// Modal premium de devolución financiera
//
// Preparado para:
// - Auditoría
// - Supabase
// - Gestión administrativa
//
// ==========================================================


'use client';


interface RefundModalProps {


open:boolean;


orderId:string;


amount:number;


reason:string;


onReasonChange:(value:string)=>void;


onClose:()=>void;


onConfirm:()=>void;


}



export default function RefundModal({

open,

orderId,

amount,

reason,

onReasonChange,

onClose,

onConfirm,

}:RefundModalProps){



if(!open)

return null;



return (

<div

className="
fixed

inset-0

z-50

flex

items-center

justify-center

bg-black/60

backdrop-blur-sm

"

>


<div

className="
w-full

max-w-lg

rounded-3xl

bg-white

p-8

shadow-2xl

"

>


<h2

className="
text-2xl

font-bold

"

>

Solicitar reembolso

</h2>



<div

className="
mt-5

space-y-3

"

>


<p>

Pedido:

<strong>

 #{orderId}

</strong>

</p>



<p>

Monto:

<strong>

${amount.toFixed(2)}

</strong>

</p>



<textarea

value={reason}

onChange={
e=>onReasonChange(e.target.value)
}

placeholder="Motivo del reembolso"

className="
h-32

w-full

rounded-xl

border

p-3

"

/>



</div>




<div

className="
mt-6

flex

justify-end

gap-3

"

>


<button

onClick={onClose}

className="
rounded-xl

border

px-5

py-3

"

>

Cancelar

</button>



<button

onClick={onConfirm}

className="
rounded-xl

bg-red-600

px-5

py-3

font-semibold

text-white

"

>

Confirmar devolución

</button>


</div>



</div>


</div>


);


}

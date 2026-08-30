// ==========================================================
// ARCHIVO:
// src/components/orders/OrderStatusBadge.tsx
//
// Credi Marketplace
//
// Estado visual premium de órdenes
//
// ==========================================================


type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';



interface OrderStatusBadgeProps {

  status: OrderStatus;

}



const STATUS_CONFIG = {

  pending: {
    label:'Pendiente',
    style:'bg-yellow-100 text-yellow-700',
  },

  confirmed:{
    label:'Confirmado',
    style:'bg-blue-100 text-blue-700',
  },

  processing:{
    label:'Procesando',
    style:'bg-purple-100 text-purple-700',
  },

  shipped:{
    label:'Enviado',
    style:'bg-indigo-100 text-indigo-700',
  },

  delivered:{
    label:'Entregado',
    style:'bg-green-100 text-green-700',
  },

  cancelled:{
    label:'Cancelado',
    style:'bg-red-100 text-red-700',
  },

  refunded:{
    label:'Reembolsado',
    style:'bg-gray-100 text-gray-700',
  },

} as const;



export default function OrderStatusBadge({

status,

}:OrderStatusBadgeProps){


const config =
STATUS_CONFIG[status];


return (

<span

className={`

inline-flex

rounded-full

px-4

py-1

text-xs

font-bold

${config.style}

`}

>

{config.label}

</span>

);


}

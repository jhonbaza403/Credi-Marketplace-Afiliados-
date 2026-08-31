// ==========================================================
// ARCHIVO:
// src/components/notifications/NotificationBell.tsx
//
// Credi Marketplace
//
// Campana de notificaciones
//
// Preparado para:
// - Supabase Realtime
// - Web Push
// - Eventos de pedidos
// - Pagos
// - Afiliados
//
// ==========================================================


'use client';


interface NotificationBellProps {

count?:number;

onClick?:()=>void;

}



export default function NotificationBell({

count = 0,

onClick,

}:NotificationBellProps){


return (

<button

type="button"

onClick={onClick}

className="
relative

flex

h-12

w-12

items-center

justify-center

rounded-2xl

bg-white

shadow-md

transition

hover:scale-105

"

>


<span

className="
text-2xl

"

>

🔔

</span>



{

count > 0 && (

<span

className="
absolute

right-0

top-0

flex

h-6

min-w-6

items-center

justify-center

rounded-full

bg-red-600

px-1

text-xs

font-bold

text-white

"

>

{count > 99 ? '99+' : count}

</span>

)

}


</button>


);


}

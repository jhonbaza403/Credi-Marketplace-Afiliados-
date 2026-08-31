// ==========================================================
// ARCHIVO:
// src/components/notifications/NotificationCenter.tsx
//
// Centro completo de notificaciones
//
// Arquitectura:
// - Cliente React
// - Supabase Realtime Ready
// - Gestión lectura/no lectura
//
// ==========================================================


'use client';



import NotificationItem from './NotificationItem';



interface Notification {


id:string;


title:string;


message:string;


date:string;


read:boolean;


type?:
'order'
|'payment'
|'affiliate'
|'security'
|'system';


}



interface NotificationCenterProps {


notifications:readonly Notification[];


}



export default function NotificationCenter({

notifications,

}:NotificationCenterProps){



return (

<section

className="
w-full

max-w-xl

rounded-3xl

border

bg-white

p-6

shadow-xl

"

>


<header

className="
mb-5

flex

items-center

justify-between

"

>


<h2

className="
text-xl

font-bold

"

>

Notificaciones

</h2>



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

{

notifications.filter(

n=>!n.read

).length

}

nuevas

</span>



</header>



<div

className="
space-y-3

"

>


{

notifications.length === 0 ? (

<p

className="
text-center

text-sm

text-gray-500

"

>

No tienes notificaciones

</p>


)

:

(

notifications.map(notification=>(


<NotificationItem

key={notification.id}

{...notification}

/>


))

)


}


</div>



</section>


);


}

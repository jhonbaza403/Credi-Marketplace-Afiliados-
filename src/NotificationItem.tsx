// ==========================================================
// ARCHIVO:
// src/components/notifications/NotificationItem.tsx
//
// Elemento individual de notificación
// ==========================================================


interface NotificationItemProps {


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



const TYPE_ICON = {


order:'📦',

payment:'💳',

affiliate:'🤝',

security:'🔐',

system:'⚙️',


};




export default function NotificationItem({

title,

message,

date,

read,

type='system',

}:NotificationItemProps){



return (

<div

className={`

flex

gap-4

rounded-2xl

p-4

transition


${

read

?

'bg-white'

:

'bg-blue-50'

}

`}

>


<div

className="
text-2xl

"

>

{TYPE_ICON[type]}

</div>



<div

className="flex-1"

>


<div

className="
flex

justify-between

gap-3

"

>


<h4

className="
font-bold

"

>

{title}

</h4>



<span

className="
text-xs

text-gray-400

"

>

{date}

</span>


</div>




<p

className="
mt-1

text-sm

text-gray-600

"

>

{message}

</p>



</div>


</div>


);


}

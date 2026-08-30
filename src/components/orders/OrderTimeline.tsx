// ==========================================================
// ARCHIVO:
// src/components/orders/OrderTimeline.tsx
//
// Línea temporal de seguimiento
// ==========================================================


interface TimelineEvent {


title:string;


description:string;


date:string;


completed:boolean;


}



interface OrderTimelineProps {


events:readonly TimelineEvent[];


}



export default function OrderTimeline({

events,

}:OrderTimelineProps){


return (

<div

className="
space-y-6

"

>


{

events.map(

(event,index)=>(


<div

key={index}

className="
flex

gap-4

"

>


<div

className={`

mt-1

h-4

w-4

rounded-full

${

event.completed

?

'bg-green-600'

:

'bg-gray-300'

}

`}

/>



<div>

<h4

className="
font-semibold

"

>

{event.title}

</h4>



<p

className="
text-sm

text-gray-600

"

>

{event.description}

</p>



<span

className="
text-xs

text-gray-400

"

>

{event.date}

</span>


</div>



</div>


)

)


}


</div>


);


}

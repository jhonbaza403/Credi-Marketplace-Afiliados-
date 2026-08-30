// ==========================================================
// ARCHIVO:
// src/components/ai/AIChatMessage.tsx
//
// Credi Marketplace AI
//
// Mensajes individuales del asistente IA
//
// ==========================================================


interface AIChatMessageProps {


role:
'user'
|
'assistant';



content:string;



timestamp?:string;


}



export default function AIChatMessage({

role,

content,

timestamp,

}:AIChatMessageProps){



const isAssistant =
role === 'assistant';



return (

<div

className={`

flex

w-full

gap-3


${

isAssistant

?

'justify-start'

:

'justify-end'

}

`}

>


{

isAssistant && (

<div

className="
flex

h-10

w-10

items-center

justify-center

rounded-full

bg-black

text-white

"

>

AI

</div>

)

}



<div

className={`

max-w-[80%]

rounded-3xl

px-5

py-3


${

isAssistant

?

'bg-gray-100 text-gray-900'

:

'bg-black text-white'

}

`}

>


<p

className="
text-sm

leading-relaxed

"

>

{content}

</p>



{

timestamp && (

<span

className="
mt-2

block

text-xs

opacity-60

"

>

{timestamp}

</span>

)

}



</div>



</div>


);


}

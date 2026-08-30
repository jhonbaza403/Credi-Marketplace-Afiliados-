// ==========================================================
// ARCHIVO:
// src/components/ai/AIAssistant.tsx
//
// Credi Marketplace AI Assistant
//
// Centro inteligente:
// - Ventas
// - Productos
// - Clientes
// - Afiliados
//
// ==========================================================


'use client';


import {

useState

} from 'react';


import AIChatMessage from './AIChatMessage';

import AIInput from './AIInput';



interface Message {


id:string;


role:
'user'
|
'assistant';


content:string;


timestamp:string;


}




export default function AIAssistant(){



const [

messages,

setMessages

]=useState<Message[]>([


{

id:'welcome',

role:'assistant',

content:
'Hola, soy el asistente inteligente de Credi Marketplace. ¿En qué puedo ayudarte?',

timestamp:
'Ahora',

}


]);






async function sendMessage(

text:string

){



const userMessage:Message={


id:

crypto.randomUUID(),


role:'user',


content:text,


timestamp:'Ahora'


};




setMessages(

previous=>[

...previous,

userMessage

]

);




// Preparado para:
// src/services/ai

const response =
'Procesando tu solicitud inteligente...';



setTimeout(()=>{


setMessages(

previous=>[

...previous,

{

id:

crypto.randomUUID(),


role:'assistant',


content:response,


timestamp:'Ahora'


}

]

);


},500);



}




return (

<section

className="
flex

h-[600px]

flex-col

rounded-3xl

border

bg-white

shadow-2xl

"

>


<header

className="
flex

items-center

gap-3

border-b

p-5

"

>


<div

className="
flex

h-12

w-12

items-center

justify-center

rounded-full

bg-black

font-bold

text-white

"

>

AI

</div>



<div>


<h2

className="
font-bold

"

>

Credi AI Assistant

</h2>


<p

className="
text-xs

text-gray-500

"

>

Inteligencia comercial

</p>


</div>



</header>





<div

className="
flex-1

space-y-4

overflow-y-auto

p-5

"

>


{

messages.map(message=>(


<AIChatMessage

key={message.id}

{...message}

/>


))

}


</div>





<footer

className="
p-5

"

>


<AIInput

onSend={sendMessage}

/>


</footer>



</section>


);


}

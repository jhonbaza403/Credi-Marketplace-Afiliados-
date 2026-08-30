// ==========================================================
// ARCHIVO:
// src/components/ai/AIInput.tsx
//
// Entrada inteligente del asistente IA
//
// ==========================================================


'use client';


import {

useState

} from 'react';



interface AIInputProps {


onSend:(message:string)=>void;


disabled?:boolean;


}



export default function AIInput({

onSend,

disabled=false,

}:AIInputProps){



const [

value,

setValue

]=useState('');




function submit(){


const message=value.trim();


if(!message)

return;



onSend(message);


setValue('');

}



return (

<div

className="
flex

gap-3

rounded-3xl

border

bg-white

p-3

shadow-lg

"

>


<input

value={value}

onChange={
e=>setValue(e.target.value)
}

onKeyDown={

e=>{

if(e.key==='Enter')

submit();

}

}

placeholder="
Pregunta sobre productos, ventas o pedidos...
"

disabled={disabled}

className="
flex-1

rounded-2xl

px-4

outline-none

"

/>



<button

type="button"

disabled={disabled}

onClick={submit}

className="
rounded-2xl

bg-black

px-6

font-semibold

text-white

disabled:opacity-50

"

>

Enviar

</button>



</div>


);


}

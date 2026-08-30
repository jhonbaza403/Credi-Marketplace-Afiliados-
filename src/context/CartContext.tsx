"use client";

import {
createContext,
useContext,
useEffect,
useMemo,
useState,
type ReactNode,
} from "react";

import { z } from "zod";



// ==========================================================
// VALIDACIÓN
// ==========================================================

const MAX_CART_QUANTITY = 99;


const CartProductSchema = z.object({

id:z.string(),

name:z.string(),

slug:z.string().optional(),

image:z.string().optional(),

price:z.number().nonnegative(),

currency:z.string().optional(),

sellerId:z.string().optional(),

quantity:z.number()
.int()
.min(1)
.max(MAX_CART_QUANTITY),

});



// ==========================================================
// TIPOS
// ==========================================================

export interface CartProduct {

id:string;

name:string;

slug?:string;

image?:string;

price:number;

currency?:string;

sellerId?:string;

quantity:number;

}



interface CartContextValue {


items:CartProduct[];


totalItems:number;


subtotal:number;


addItem(
product:Omit<CartProduct,"quantity">,
quantity?:number
):void;


removeItem(id:string):void;


updateQuantity(
id:string,
quantity:number
):void;


clearCart():void;


hasItem(id:string):boolean;


}




const CART_STORAGE_KEY =
"credi-marketplace-cart";



const CartContext =
createContext<CartContextValue | undefined>(
undefined
);





export function CartProvider({

children,

}:{

children:ReactNode;

}){


const [items,setItems]=
useState<CartProduct[]>([]);




useEffect(()=>{


try{


const stored =
localStorage.getItem(
CART_STORAGE_KEY
);


if(!stored)return;



const parsed =
JSON.parse(stored);



const result =
z.array(CartProductSchema)
.safeParse(parsed);



if(result.success){

setItems(result.data);

}


}

catch{


setItems([]);

}


},[]);






useEffect(()=>{


try{


localStorage.setItem(

CART_STORAGE_KEY,

JSON.stringify(items)

);


}

catch{


}


},[items]);






function addItem(

product:Omit<CartProduct,"quantity">,

quantity=1

){


const safeQuantity =
Math.min(
quantity,
MAX_CART_QUANTITY
);



setItems(current=>{


const exists =
current.find(
item=>item.id===product.id
);



if(exists){


return current.map(item=>


item.id===product.id

?

{

...item,

quantity:
Math.min(
item.quantity + safeQuantity,
MAX_CART_QUANTITY
)

}

:

item

);


}



return [

...current,

{

...product,

quantity:safeQuantity

}

];


});


}






function removeItem(id:string){


setItems(
current=>
current.filter(
item=>item.id!==id
)
);


}






function updateQuantity(

id:string,

quantity:number

){


if(quantity<=0){

removeItem(id);

return;

}



setItems(current=>

current.map(item=>

item.id===id

?

{

...item,

quantity:
Math.min(
quantity,
MAX_CART_QUANTITY
)

}

:

item

)

);


}






function clearCart(){

setItems([]);

}





function hasItem(id:string){

return items.some(
item=>item.id===id
);

}





const totalItems =
useMemo(()=>


items.reduce(

(total,item)=>

total+item.quantity,

0

),

[items]);





const subtotal =
useMemo(()=>


items.reduce(

(total,item)=>

total+(item.price*item.quantity),

0

),

[items]);







const value =
useMemo(()=>({

items,

totalItems,

subtotal,

addItem,

removeItem,

updateQuantity,

clearCart,

hasItem,


}),

[
items,
totalItems,
subtotal
]

);





return (

<CartContext.Provider value={value}>

{children}

</CartContext.Provider>

);


}





export function useCart(){


const context =
useContext(CartContext);



if(!context){

throw new Error(
"useCart debe utilizarse dentro de CartProvider"
);

}


return context;


}

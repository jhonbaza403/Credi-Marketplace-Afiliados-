// ==========================================================
// ARCHIVO: src/lib/validation/common.ts
// Credi Marketplace
//
// Shared Validation Utilities
//
// Security Layer
// API Validation
// Enterprise Commerce
// ==========================================================



export const MAX_STRING_LENGTH = 10_000;


export const MAX_QUANTITY = 99;




// ==========================================================
// STRING
// ==========================================================


export function isNonEmptyString(

value: unknown,

maxLength = MAX_STRING_LENGTH,

): value is string {


return (

typeof value === "string" &&

value.trim().length > 0 &&

value.trim().length <= maxLength

);


}





export function normalizeString(

value: unknown,

): string | null {


if(typeof value !== "string"){

return null;

}



const normalized =
value.trim();



return normalized.length > 0

?

normalized

:

null;


}







// ==========================================================
// UUID
// ==========================================================


export function isUUID(

value: unknown,

): value is string {


return (

typeof value === "string" &&

/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(

value

)

);


}








// ==========================================================
// NUMBERS
// ==========================================================


export function isPositiveInteger(

value: unknown,

max = Number.MAX_SAFE_INTEGER,

): value is number {


return (

typeof value === "number" &&

Number.isSafeInteger(value) &&

value > 0 &&

value <= max

);


}






export function isValidQuantity(

value: unknown,

): value is number {


return isPositiveInteger(

value,

MAX_QUANTITY

);


}






export function isNonNegativeNumber(

value: unknown,

): value is number {


return (

typeof value === "number" &&

Number.isFinite(value) &&

value >= 0

);


}







// ==========================================================
// MONEY
// ==========================================================


export function roundMoney(

value:number,

):number {


return Math.round(

(value + Number.EPSILON) * 100

) / 100;


}






export function isValidCurrency(

value:unknown,

): value is string {


return (

typeof value === "string" &&

[

"USD",

"VES",

"COP",

"MXN",

].includes(value)

);


}







// ==========================================================
// EMAIL
// ==========================================================


export function isValidEmail(

value:unknown,

):value is string {


if(typeof value !== "string"){

return false;

}



return /^[^\s@]+@[^\s@]+\.[^\s@]+$/

.test(

value.trim()

);


}








// ==========================================================
// URL
// ==========================================================


export function isValidUrl(

value:unknown,

):value is string {


if(typeof value !== "string"){

return false;

}



try{


const url =
new URL(value);



return (

url.protocol === "https:" ||

url.protocol === "http:"

);


}

catch{


return false;


}


}







// ==========================================================
// JSON SAFE
// ==========================================================


export function safeJsonStringify(

value:unknown,

):string {


try{


return JSON.stringify(value);


}

catch{


return "{}";


}


}






// ==========================================================
// SANITIZATION
// ==========================================================


export function sanitizeText(

value:unknown,

):string | null {


if(typeof value !== "string"){

return null;

}



return value

.replace(
/[<>]/g,
""
)

.trim()

|| null;


}

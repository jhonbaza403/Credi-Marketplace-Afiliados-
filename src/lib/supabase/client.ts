// ==========================================================
// ARCHIVO: src/lib/supabase/client.ts
// Credi Marketplace
//
// Supabase Browser Client
//
// Next.js 16
// React 19
// Supabase SSR
// ==========================================================


import {
  createBrowserClient,
} from "@supabase/ssr";





// ==========================================================
// VARIABLES
// ==========================================================


const supabaseUrl =
process.env.NEXT_PUBLIC_SUPABASE_URL;


const supabasePublishableKey =
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;






// ==========================================================
// CLIENT FACTORY
// ==========================================================


export function createClient(){


if(!supabaseUrl){


throw new Error(

"NEXT_PUBLIC_SUPABASE_URL no está configurada"

);


}



if(!supabasePublishableKey){


throw new Error(

"NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY no está configurada"

);


}




return createBrowserClient(

supabaseUrl,

supabasePublishableKey

);


}

// ==========================================================
// CREDI MARKETPLACE
// Product Business Service
// ==========================================================

import { createServerClient }
from '@/lib/supabase/server';


export async function getProducts(){

 const supabase =
 await createServerClient();


 const {
  data,
  error
 } =
 await supabase
 .from('products')
 .select('*')
 .eq(
  'active',
  true
 );


 if(error){

  throw new Error(error.message);

 }


 return data;

}





export async function getProductById(
 productId:string
){


 const supabase =
 await createServerClient();


 const {
  data,
  error
 }
 =
 await supabase
 .from('products')
 .select('*')
 .eq(
  'id',
  productId
 )
 .single();



 if(error){

  throw new Error(error.message);

 }


 return data;

}

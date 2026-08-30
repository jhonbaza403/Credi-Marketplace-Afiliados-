// ==========================================================
// ARCHIVO: src/context/AuthContext.tsx
//
// Credi Marketplace
//
// Global Authentication Context
//
// Supabase Auth
// User Profile
// Roles & Permissions
//
// Next.js 16
// ==========================================================


"use client";


import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";


import type {
  User,
} from "@supabase/supabase-js";


import {
  createClient,
} from "@/lib/supabase/client";




// ==========================================================
// TIPOS
// ==========================================================


export type UserRole =
  | "admin"
  | "vendor"
  | "customer";



export interface Profile {


  id: string;


  full_name?: string | null;


  avatar_url?: string | null;


  role: UserRole;


  created_at?: string;



}




interface AuthContextType {


  user:

  User | null;



  profile:

  Profile | null;



  loading:

  boolean;



  logout():

  Promise<void>;


}





// ==========================================================
// CONTEXT
// ==========================================================


const AuthContext =
createContext<AuthContextType | undefined>(
  undefined,
);







// ==========================================================
// PROVIDER
// ==========================================================


export function AuthProvider({

children,

}:{

children:React.ReactNode;

}) {



const [
  user,
  setUser,
]
=
useState<User|null>(null);



const [
  profile,
  setProfile,
]
=
useState<Profile|null>(null);



const [
  loading,
  setLoading,
]
=
useState(true);





// ========================================================
// CARGAR PERFIL
// ========================================================


async function loadProfile(
  userId:string,
){


const supabase =
createClient();



const {

data,

error,

}

=
await supabase

.from("profiles")

.select(
`
id,
full_name,
avatar_url,
role,
created_at
`
)

.eq(
"id",
userId,
)

.maybeSingle();





if(error){

console.error(
"Error cargando perfil:",
error,
);

setProfile(null);

return;

}



setProfile(
data as Profile | null,
);



}







// ========================================================
// SESIÓN
// ========================================================


useEffect(()=>{


const supabase =
createClient();



let mounted=true;





async function initialize(){


try{


const {

data,

}
=
await supabase.auth.getUser();





if(!mounted)
return;





const currentUser =
data.user ?? null;



setUser(
currentUser,
);





if(currentUser){

await loadProfile(
currentUser.id,
);

}
else{

setProfile(null);

}



}

catch(error){


console.error(
"Error inicializando autenticación:",
error,
);


setUser(null);

setProfile(null);


}

finally{


if(mounted){

setLoading(false);

}


}


}





initialize();





const {

data:{
subscription,

},

}

=
supabase.auth.onAuthStateChange(

async (
_event,

session,

)=>{


if(!mounted)
return;




const currentUser =
session?.user ?? null;



setUser(
currentUser,
);



if(currentUser){

await loadProfile(
currentUser.id,
);

}
else{

setProfile(null);

}


});






return ()=>{


mounted=false;


subscription.unsubscribe();


};



},[]);








// ========================================================
// LOGOUT
// ========================================================


async function logout(){


const supabase =
createClient();



await supabase.auth.signOut();



setUser(null);


setProfile(null);


}







return (


<AuthContext.Provider

value={{

user,

profile,

loading,

logout,

}}

>


{children}


</AuthContext.Provider>


);



}









// ==========================================================
// HOOK
// ==========================================================


export function useAuth(){


const context =
useContext(
AuthContext,
);



if(!context){


throw new Error(

"useAuth debe utilizarse dentro de AuthProvider",

);


}



return context;



}

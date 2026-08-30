// ==========================================================
// ARCHIVO:
// src/components/user/UserProfileCard.tsx
//
// Perfil profesional usuario B2B/B2C
// ==========================================================


import UserReputationBadge from './UserReputationBadge';



interface UserProfileCardProps {


name:string;


email?:string;


company?:string;


reputation:number;


verified?:boolean;


}



export default function UserProfileCard({

name,

email,

company,

reputation,

verified,

}:UserProfileCardProps){



return (

<section

className="
rounded-3xl

border

bg-white

p-6

shadow-sm

"

>


<div

className="
flex

items-center

gap-4

"

>


<div

className="
flex

h-16

w-16

items-center

justify-center

rounded-full

bg-gray-900

text-xl

font-bold

text-white

"

>

{

name

.charAt(0)

.toUpperCase()

}

</div>




<div>

<h2

className="
text-xl

font-bold

"

>

{name}

</h2>



{

company && (

<p

className="
text-sm

text-gray-500

"

>

{company}

</p>

)

}



{

email && (

<p

className="
text-sm

text-gray-500

"

>

{email}

</p>

)

}


</div>



</div>




<div

className="
mt-6

"

>

<UserReputationBadge

score={reputation}

verified={verified}

/>

</div>



</section>


);


}

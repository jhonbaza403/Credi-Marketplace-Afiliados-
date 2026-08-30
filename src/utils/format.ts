// ==========================================================
// CREDI MARKETPLACE
// Formatting Utilities
// Next.js 16.3 · TypeScript
// ==========================================================


// ==========================================================
// NUMBER FORMAT
// ==========================================================


export function formatNumber(
 value:number,
 locale='es-ES'
){

 return new Intl.NumberFormat(
  locale
 )
 .format(value);

}



// ==========================================================
// CURRENCY FORMAT
// ==========================================================


export function formatPrice(
 value:number,
 currency='USD',
 locale='en-US'
){

 return new Intl.NumberFormat(
  locale,
  {
    style:'currency',
    currency,
    minimumFractionDigits:2,
  }
 )
 .format(value);

}



// ==========================================================
// DATE FORMAT
// ==========================================================


export function formatDate(
 value:string|Date,
 locale='es-ES'
){

 return new Intl.DateTimeFormat(
  locale,
  {
    year:'numeric',
    month:'long',
    day:'numeric',
  }
 )
 .format(
  new Date(value)
 );

}




// ==========================================================
// DATE AND TIME FORMAT
// ==========================================================


export function formatDateTime(
 value:string|Date,
 locale='es-ES'
){

 return new Intl.DateTimeFormat(
  locale,
  {
    dateStyle:'medium',
    timeStyle:'short',
  }
 )
 .format(
  new Date(value)
 );

}



// ==========================================================
// SHORT TEXT
// ==========================================================


export function truncate(
 value:string,
 length:number=100
){

 if(value.length <= length){

  return value;

 }


 return (
  value.substring(
   0,
   length
  )
  +
  '...'
 );

}




// ==========================================================
// CAPITALIZE
// ==========================================================


export function capitalize(
 value:string
){

 if(!value){

  return '';

 }


 return (
  value.charAt(0)
  .toUpperCase()
  +
  value.slice(1)
  .toLowerCase()
 );

}



// ==========================================================
// FULL NAME FORMAT
// ==========================================================


export function formatName(
 firstName:string,
 lastName?:string
){

 return [
  firstName,
  lastName
 ]
 .filter(Boolean)
 .join(' ');

}



// ==========================================================
// FILE SIZE FORMAT
// ==========================================================


export function formatFileSize(
 bytes:number
){

 if(bytes === 0){

  return '0 Bytes';

 }


 const units=[
  'Bytes',
  'KB',
  'MB',
  'GB',
  'TB'
 ];


 const index =
 Math.floor(
  Math.log(bytes)
  /
  Math.log(1024)
 );


 return `${(
  bytes /
  Math.pow(1024,index)
 ).toFixed(2)} ${units[index]}`;

}



// ==========================================================
// PERCENTAGE FORMAT
// ==========================================================


export function formatPercentage(
 value:number,
 locale='es-ES'
){

 return new Intl.NumberFormat(
  locale,
  {
   style:'percent',
   maximumFractionDigits:2
  }
 )
 .format(value);

}



// ==========================================================
// MASK EMAIL
// ==========================================================


export function maskEmail(
 email:string
){

 const [
  user,
  domain
 ] =
 email.split('@');


 if(!user || !domain){

  return email;

 }


 return (
  user.substring(0,2)
  +
  '***@'
  +
  domain
 );

}

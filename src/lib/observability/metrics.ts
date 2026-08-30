// ==========================================================
// CREDI MARKETPLACE
// Metrics
// ==========================================================



const metrics =
new Map<string,number>();





export function incrementMetric(
 name:string
){


 const current =
 metrics.get(name)
 ??
 0;



 metrics.set(

  name,

  current + 1

 );


}





export function getMetric(
 name:string
){

 return (
  metrics.get(name)
  ??
  0
 );

}





export function getMetrics(){

 return Object.fromEntries(
  metrics
 );

}

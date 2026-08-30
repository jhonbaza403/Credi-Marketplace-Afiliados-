// ==========================================================
// Pagination Utilities
// ==========================================================


export function getPagination(
 page:number,
 limit:number
){

 return {

  offset:
   (page-1)*limit,

  limit

 };

}

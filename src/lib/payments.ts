import { z } from 'zod';


export const PaymentSchema =
z.object({

 orderId:
 z.string()
 .uuid(),


 amount:
 z.number()
 .positive(),


 currency:
 z.string()
 .length(3)

});

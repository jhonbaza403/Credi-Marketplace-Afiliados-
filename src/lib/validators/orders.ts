import { z } from 'zod';


export const OrderSchema =
z.object({

 items:
 z.array(

  z.object({

   productId:
   z.string().uuid(),


   quantity:
   z.number()
   .positive()

  })

 )

});

import { z } from 'zod';



export const UUIDSchema =
z.string()
.uuid();



export const EmailSchema =
z.string()
.email();

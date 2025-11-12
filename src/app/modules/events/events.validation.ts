import { Types } from 'mongoose';
import z from 'zod';

const objectIdSchema = z.string().refine(val => Types.ObjectId.isValid(val), {
  message: 'Invalid ObjectId format',
});

const recurringEnum = z.enum(['daily', 'weekly', 'monthly', 'cancel']);

const schema = z.object({
  user: objectIdSchema.optional(),
  title: z.string({ required_error: 'Title is required' }),
  date: z.date({ required_error: 'Enter a valid date' }),
  assignTo: objectIdSchema,
  includeInSchedule: z.array(objectIdSchema).optional(),
  remainder: z.number({required_error:"Please Select Remainder"}),
  recurring: recurringEnum,
  note: z.string().optional().nullable(),
  isAssignMe: z.boolean().default(false),
  isDeleted: z.boolean().default(false),
});

import { z } from 'zod';

const createContentsZodSchema = z.object({
  body: z.object({
    aboutUs: z.string({ required_error: 'about us is required' }).optional(),
    termsAndConditions: z
      .string({ required_error: 'terms and conditions us is required' })
      .optional(),
    privacyPolicy: z
      .string({ required_error: 'privacy policy us is required' })
      .optional(),
  }),
});
const updateContentsZodSchema = z.object({
  body: z.object({
    aboutUs: z.string({ required_error: 'about us is required' }).optional(),
    termsAndConditions: z
      .string({ required_error: 'terms and conditions us is required' })
      .optional(),
    privacyPolicy: z
      .string({ required_error: 'privacy policy us is required' })
      .optional(),
  }),
});

export const contentsValidator = {
  createContentsZodSchema,
  updateContentsZodSchema,
};

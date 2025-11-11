import { z } from 'zod';
import { Role, USER_ROLE } from '../user/user.constants';

const loginZodValidationSchema = z.object({
  body: z.object({
    email: z.string({
      required_error: 'Email is required!',
    }),
    password: z.string({
      required_error: 'Password is required!',
    }),
  }),
});

const refreshTokenValidationSchema = z.object({
  cookies: z.object({
    refreshToken: z.string({
      required_error: 'Refresh token is required!',
    }),
  }),
});

const googleLogin = z.object({
  body: z.object({
    token: z.string({
      required_error: 'Token is Required',
    }),
  }),
  role: z.enum([...Role] as [string, ...string[]]).default(USER_ROLE.user),
});

export const authValidation = {
  refreshTokenValidationSchema,
  loginZodValidationSchema,
  googleLogin,
};

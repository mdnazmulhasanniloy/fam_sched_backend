import { Router } from 'express';
import { otpControllers } from './otp.controller';
import validateRequest from '../../middleware/validateRequest';
import { resentOtpValidations } from './otp.validation';
const router = Router();

router.post(
  '/verify-otp',
  validateRequest(resentOtpValidations.verifyOtpZodSchema),
  otpControllers.verifyOtp,
);
router.post(
  '/resend-otp',
  validateRequest(resentOtpValidations.resentOtpZodSchema),
  otpControllers.resendOtp,
);

router.get(
  '/verify-link',
  validateRequest(resentOtpValidations.verifyLinkSchema),
  otpControllers.verifyLink,
);

export const otpRoutes = router;

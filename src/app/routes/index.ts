import { Router } from 'express';
import { otpRoutes } from '../modules/otp/otp.routes';
import { userRoutes } from '../modules/user/user.route';
import { authRoutes } from '../modules/auth/auth.route';
import { notificationRoutes } from '../modules/notification/notificaiton.route';
import { contentsRoutes } from '../modules/contents/contents.route';
import { packageRoutes } from '../modules/package/package.route';
import { subscriptionRoutes } from '../modules/subscription/subscription.route';
import { paymentsRoutes } from '../modules/payments/payments.route';
import { memberRoutes } from '../modules/member/member.route';
import { eventsRoutes } from '../modules/events/events.route';
import { dashboardRoutes } from '../modules/dashboard/dashboard.route';
import { homepageDataRoutes } from '../modules/homepageData/homepageData.route';

const router = Router();
const moduleRoutes = [
  {
    path: '/users',
    route: userRoutes,
  },
  {
    path: '/auth',
    route: authRoutes,
  },
  {
    path: '/otp',
    route: otpRoutes,
  },
  {
    path: '/notifications',
    route: notificationRoutes,
  },
  {
    path: '/contents',
    route: contentsRoutes,
  },
  {
    path: '/packages',
    route: packageRoutes,
  },
  {
    path: '/subscriptions',
    route: subscriptionRoutes,
  },
  {
    path: '/payments',
    route: paymentsRoutes,
  },
  {
    path: '/members',
    route: memberRoutes,
  },
  {
    path: '/events',
    route: eventsRoutes,
  },
  {
    path: '/dashboard',
    route: dashboardRoutes,
  },
  {
    path: '/home',
    route: homepageDataRoutes,
  },
];
moduleRoutes.forEach(route => router.use(route.path, route.route));

export default router;

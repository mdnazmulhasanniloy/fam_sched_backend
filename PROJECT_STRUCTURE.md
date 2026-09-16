# Project Structure

This repository contains the backend service and an AI server for the application.

```text
fam_sched_backend/
├── .git/                        # Git metadata
├── .github/                     # GitHub workflows and automation (if present)
├── ai_server/
│   ├── app/
│   │   ├── routes/
│   │   │   └── api_service.py
│   │   └── services/
│   │       ├── ai_service.py
│   │       └── validation.py
│   ├── tests/
│   │   └── test_ai_service_validation.py
│   ├── Dockerfile
│   ├── README.md
│   ├── docker-compose.yml
│   ├── main.py
│   ├── pyproject.toml
│   └── requirements.txt
├── public/
│   └── ejs/
│       ├── lottie/
│       │   ├── congratulation.json
│       │   ├── error.json
│       │   └── success.json
│       ├── paymentError.ejs
│       ├── paymentSuccess.ejs
│       ├── resetPasswordPage.ejs
│       ├── successMessage.ejs
│       ├── forgot_pass_mail.html
│       ├── otp_mail.html
│       ├── add_member.html
│       ├── nn.html
│       └── ss.html
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── app/
│   │   ├── config/
│   │   │   └── index.ts
│   │   ├── constants/
│   │   │   ├── aws.ts
│   │   │   └── pagination.ts
│   │   ├── core/
│   │   │   ├── builder/
│   │   │   │   └── QueryBuilder.ts
│   │   │   └── stripe/
│   │   │       └── stripe.ts
│   │   ├── error/
│   │   │   ├── AppError.ts
│   │   │   ├── CastError.ts
│   │   │   ├── DuplicateError.ts
│   │   │   ├── MulterError.ts
│   │   │   ├── ValidationError.ts
│   │   │   └── ZodError.ts
│   │   ├── helpers/
│   │   │   ├── getUserDetailsFromToken.ts
│   │   │   └── pagination.helpers.ts
│   │   ├── interface/
│   │   │   ├── common.interface.ts
│   │   │   ├── error.ts
│   │   │   ├── index.d.ts
│   │   │   └── query.ts
│   │   ├── job/
│   │   │   ├── croneJob.ts
│   │   │   ├── event.worker.ts
│   │   │   ├── nn.ts
│   │   │   └── notification.worker.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   ├── fileUpload.ts
│   │   │   ├── globalErrorhandler.ts
│   │   │   ├── notfound.ts
│   │   │   ├── parseData.ts
│   │   │   ├── permission.ts
│   │   │   └── validateRequest.ts
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── category/
│   │   │   ├── contents/
│   │   │   ├── dashboard/
│   │   │   ├── events/
│   │   │   ├── history/
│   │   │   ├── homepageData/
│   │   │   ├── member/
│   │   │   ├── notification/
│   │   │   ├── otp/
│   │   │   ├── package/
│   │   │   ├── payments/
│   │   │   ├── subscription/
│   │   │   └── user/
│   │   ├── redis/
│   │   │   └── index.ts
│   │   ├── routes/
│   │   │   └── index.ts
│   │   ├── socket/
│   │   │   ├── index.ts
│   │   │   └── middleware/
│   │   ├── types/
│   │   │   └── global.d.ts
│   │   └── utils/
│   │       ├── callbackFn.ts
│   │       ├── catchAsync.ts
│   │       ├── defaultTask.ts
│   │       ├── deleteEventsCache.ts
│   │       ├── fileHelper.ts
│   │       ├── firebase.ts
│   │       ├── generateCryptoString.ts
│   │       ├── generateRandomHexColor.ts
│   │       ├── mailSender.ts
│   │       ├── now.ts
│   │       ├── otpGenerator.ts
│   │       ├── pick.ts
│   │       ├── pickQuery.ts
│   │       ├── s3.ts
│   │       ├── sendNotification.ts
│   │       ├── sendResponse.ts
│   │       └── socket.ts
├── docker-compose.yml
├── Dockerfile
├── firebase.json
├── generateFolder.ts
├── MONITORING.md
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── PRODUCTION_CHECKLIST.md
├── README.md
├── run.md
├── settings.json
├── TIMEZONE_NOTIFICATION_ANALYSIS.md
├── tsconfig.json
├── .gitignore
├── .env.example
└── .eslintrc / .prettierrc (if present)
```

## Main purpose

- `src/` contains the main Node.js/TypeScript backend application.
- `ai_server/` contains the Python-based AI service.
- `public/` holds frontend-facing templates and static assets.
- Root files are project configuration, deployment, and documentation files.

## Notes

- This is a backend-focused monorepo style project.
- The application uses TypeScript in the main server and Python in the AI service.
- Docker and Compose files indicate containerized deployment support.

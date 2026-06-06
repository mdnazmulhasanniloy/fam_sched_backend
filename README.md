# 👨‍👩‍👧‍👦 Family Schedule Backend

> **Keeping families connected and organized, one schedule at a time**

A modern, real-time backend service that helps families coordinate their busy lives together. Built with love for seamless communication, event management, and real-time updates.

---

## 🎯 What This Project Does

This is the backbone of a family scheduling application that makes it easy for families to:

- **Stay Synchronized**: Real-time updates ensure everyone knows about schedule changes instantly
- **Plan Together**: Create and manage events, activities, and important family moments
- **Connect Effortlessly**: Secure authentication and real-time notifications keep family members in the loop
- **Monetize & Sustain**: Built-in payment processing and subscription management for sustainable operations
- **Scale Intelligently**: AI-powered features and background job processing for smarter scheduling

Think of it as a family command center—where everyone stays informed, organized, and connected.

---

## 🏗️ Architecture Overview

### Core Components

```
┌─────────────────────────────────────────────────────┐
│           Express.js + TypeScript                    │
│         (Main HTTP Server on Port 3000)              │
└──────────────────┬──────────────────────────────────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
   ┌────▼────┐ ┌──▼───┐ ┌───▼────┐
   │ MongoDB  │ │Socket.io│ Redis  │
   │ Database │ │Real-time│ Cache  │
   └──────────┘ │Updates  │        │
                └────────┘ └───────┘

        ┌──────────────────────────┐
        │   AI Server (FastAPI)    │
        │   (Python on Port 2007)  │
        └──────────────────────────┘
```

### Technology Stack

| Layer                | Technology          | Purpose                          |
| -------------------- | ------------------- | -------------------------------- |
| **Runtime**          | Node.js             | JavaScript execution environment |
| **Language**         | TypeScript          | Type-safe development            |
| **API Framework**    | Express.js          | HTTP server & routing            |
| **Database**         | MongoDB             | Document-based data storage      |
| **Real-time**        | Socket.io           | WebSocket-based live updates     |
| **Cache**            | Redis               | Session and cache management     |
| **Jobs**             | Bull MQ + Node-Cron | Background task processing       |
| **Authentication**   | JWT + Bcrypt        | Secure user authentication       |
| **Payments**         | Stripe API          | Payment processing               |
| **Notifications**    | Firebase Admin      | Push notifications               |
| **AI Service**       | FastAPI (Python)    | AI-powered features              |
| **File Storage**     | AWS S3              | Scalable file storage            |
| **Containerization** | Docker              | Consistent deployment            |

---

## 📦 Project Structure

```
fam_sched_backend/
├── src/
│   ├── app/
│   │   ├── modules/              # Feature modules
│   │   │   ├── auth/            # User authentication & authorization
│   │   │   ├── events/          # Event creation & management
│   │   │   ├── payments/        # Stripe payment handling
│   │   │   ├── subscription/    # Subscription management
│   │   │   ├── notifications/   # User notifications
│   │   │   ├── user/            # User profile management
│   │   │   ├── dashboard/       # Dashboard data & analytics
│   │   │   └── ...
│   │   ├── middleware/           # Request processing
│   │   │   ├── auth.ts          # JWT verification
│   │   │   ├── fileUpload.ts    # Multer file handling
│   │   │   ├── globalErrorhandler.ts # Centralized error handling
│   │   │   └── validateRequest.ts    # Input validation
│   │   ├── core/                 # Core business logic
│   │   │   ├── stripe/          # Stripe integration
│   │   │   └── builder/         # Query builder utilities
│   │   ├── job/                  # Background job workers
│   │   │   ├── croneJob.ts      # Scheduled tasks
│   │   │   ├── event.worker.ts  # Event processing
│   │   │   └── notification.worker.ts
│   │   ├── error/                # Custom error classes
│   │   ├── helpers/              # Utility functions
│   │   ├── config/               # Configuration management
│   │   └── socket/               # WebSocket setup
│   ├── server.ts                 # Application entry point
│   └── app.ts                    # Express app configuration
│
├── ai_server/                    # Python AI service
│   ├── main.py                   # FastAPI server
│   ├── requirements.txt          # Python dependencies
│   └── app/
│       └── routes/              # API endpoints
│
├── public/                        # Static assets
├── Dockerfile                     # Container configuration
├── docker-compose.yml             # Multi-container setup
├── package.json                   # Node.js dependencies
├── tsconfig.json                  # TypeScript configuration
└── README.md                      # You are here!
```

---

## 🚀 Quick Start

### Prerequisites

Make sure you have installed:

- **Node.js** (v16+)
- **MongoDB** (v5+)
- **Redis** (v6+)
- **Python** (v3.9+) - for AI service
- **Docker & Docker Compose** (optional, for containerized setup)

### Installation

1. **Clone and setup**

```bash
git clone https://github.com/sparktechagency/fam_sched_backend.git
cd fam_sched_backend
npm install
```

2. **Configure environment**

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

**Essential environment variables:**

```bash
MONGODB_URI=mongodb://localhost:27017/fam_sched
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-key
STRIPE_SECRET_KEY=sk_test_xxxxx
FIREBASE_PROJECT_ID=your-firebase-project
AWS_REGION=us-east-1
AI_SERVER_URL=http://localhost:2007
```

3. **Start the application**

**Development mode** (with auto-reload):

```bash
npm run dev
```

**Production build & run**:

```bash
npm run build
npm run start:prod
```

4. **Access the API**

- API Server: `http://localhost:3000/api/v1`
- Socket.io: `http://localhost:3001`
- AI Service: `http://localhost:2007`

---

## 🐳 Docker Deployment

The easiest way to get everything running:

```bash
# Build the image
docker build -t nazmulhasn/fam_sched_app:latest .

# Run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f app
```

This starts:

- Express API server
- MongoDB database
- Redis cache
- Python AI service

---

## 🔑 Core Features

### 1. **Authentication & Authorization**

- Secure JWT-based authentication
- OTP verification for sensitive operations
- Role-based access control
- Token refresh mechanism

### 2. **Real-time Updates**

- WebSocket connections via Socket.io
- Live event notifications
- Instant data synchronization
- Presence detection

### 3. **Event Management**

- Create, update, and delete family events
- Event categories and tagging
- Recurring event support
- Event history tracking

### 4. **Payment Processing**

- Stripe integration for subscriptions
- One-time and recurring payments
- Payment history & invoicing
- Subscription lifecycle management

### 5. **Notifications**

- Firebase push notifications
- Email notifications via Nodemailer
- In-app notification system
- Notification preferences per user

### 6. **Background Jobs**

- Scheduled cron jobs for routine tasks
- Event-based job processing
- Notification delivery worker
- Automatic cleanup and maintenance

### 7. **User Management**

- Profile creation and management
- Family member relationships
- Permission system
- Activity history

---

## 📚 API Documentation

### Available Endpoints

```
Authentication:
POST   /api/v1/auth/register          - Create new account
POST   /api/v1/auth/login             - User login
POST   /api/v1/auth/refresh-token     - Refresh JWT
POST   /api/v1/auth/logout            - Logout user

Events:
GET    /api/v1/events                 - List all events
POST   /api/v1/events                 - Create new event
GET    /api/v1/events/:id             - Get event details
PUT    /api/v1/events/:id             - Update event
DELETE /api/v1/events/:id             - Delete event

Payments:
POST   /api/v1/payments/create-payment    - Process payment
GET    /api/v1/payments/history          - Payment history

Subscriptions:
GET    /api/v1/subscriptions           - Get subscription details
POST   /api/v1/subscriptions/upgrade    - Upgrade plan

User:
GET    /api/v1/users/profile           - Get user profile
PUT    /api/v1/users/profile           - Update profile
```

> Complete API documentation available in the project's Postman collection.

---

## 🔧 Configuration

### Environment-based Configuration

The application supports three environments:

- **Development**: `npm run dev` - Hot reload enabled, verbose logging
- **Staging**: `NODE_ENV=staging npm run start` - Pre-production testing
- **Production**: `NODE_ENV=production npm run start:prod` - Optimized, minimal logging

### Customization

**Database Configuration** (`src/app/config/index.ts`):

```typescript
export const database_url = process.env.MONGODB_URI;
export const redis_url = process.env.REDIS_URL;
```

**Server Port & Host** (`src/server.ts`):

```typescript
server = app.listen(Number(config.port), config.ip);
```

---

## 🧪 Testing & Quality

```bash
# Type checking
npm run lint:check

# Fix linting issues
npm run lint:fix

# Code formatting
npm run prettier:fix

# Full lint + prettier check
npm run lint-prettier
```

---

## 📊 Database Models

The application uses MongoDB with these main collections:

| Collection      | Purpose                      |
| --------------- | ---------------------------- |
| `users`         | User accounts and profiles   |
| `events`        | Family events and activities |
| `subscriptions` | Subscription data            |
| `payments`      | Transaction history          |
| `notifications` | User notifications           |
| `categories`    | Event categories             |
| `members`       | Family member relationships  |

---

## 🔐 Security Features

- ✅ **JWT Authentication**: Secure token-based auth
- ✅ **Password Hashing**: Bcrypt with salt rounds
- ✅ **CORS Configuration**: Controlled cross-origin access
- ✅ **Rate Limiting**: Prevents abuse and DDoS
- ✅ **Input Validation**: Zod schema validation
- ✅ **Error Handling**: Sanitized error responses
- ✅ **Environment Variables**: Sensitive data protection
- ✅ **Socket.io Auth**: Authenticated WebSocket connections

---

## 🚦 Monitoring & Logs

The application provides detailed logging at every stage:

```typescript
console.log(colors.green.bold('✅ MongoDB connected successfully'));
console.log(colors.yellow.bold('⚡ Socket.io running on ...'));
```

**Monitor in production:**

```bash
docker-compose logs -f app
```

---

## 🤝 Contributing

We welcome contributions! Here's how:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Code Standards

- Use TypeScript for all code
- Follow ESLint & Prettier configuration
- Write meaningful commit messages
- Add comments for complex logic
- Test your changes before submitting PR

---

## 🐛 Troubleshooting

### MongoDB Connection Issues

```
Error: connect ECONNREFUSED 127.0.0.1:27017

Solution: Ensure MongoDB service is running
sudo systemctl start mongod  # Linux
brew services start mongodb-community  # macOS
```

### Redis Connection Failed

```
Error: Error: connect ECONNREFUSED 127.0.0.1:6379

Solution: Start Redis service
redis-server  # or use Docker
docker run -d -p 6379:6379 redis
```

### Port Already in Use

```
Error: EADDRINUSE: address already in use :::3000

Solution: Kill the process using the port
lsof -ti:3000 | xargs kill -9
```

---

## 📈 Performance Optimization

- **Database Indexing**: MongoDB indexes on frequently queried fields
- **Connection Pooling**: MongoDB connection pool of 10-50 connections
- **Caching Layer**: Redis for session and frequently accessed data
- **Async Processing**: Background jobs prevent blocking operations
- **Compression**: Gzip compression on API responses
- **Query Optimization**: QueryBuilder pattern for efficient database queries

---

## 🌐 Deployment

### Heroku Deployment

```bash
heroku login
git push heroku main
```

### AWS EC2 Deployment

```bash
scp -i key.pem app.tar ubuntu@ec2-ip:/home/ubuntu/
ssh -i key.pem ubuntu@ec2-ip
tar -xf app.tar && npm install && npm run build
```

### Docker Hub Push

```bash
docker build -t nazmulhasn/fam_sched_app:latest .
docker push nazmulhasn/fam_sched_app:latest
```

---

## 📝 License

This project is licensed under the **ISC License** - see the LICENSE file for details.

---

## 👨‍💻 Author

**MD Nazmul Hasan**

- GitHub: [@mdnazmulhasanniloy](https://github.com/mdnazmulhasanniloy)
- Email: [your-email@example.com]

---

## 🎉 Acknowledgments

Built with ❤️ by the team at **Sparktech Agency**

- Thanks to the Express.js, MongoDB, and Socket.io communities
- Inspired by modern family management solutions
- Special thanks to all contributors

---

## 📞 Support & Community

- **Issues**: [GitHub Issues](https://github.com/sparktechagency/fam_sched_backend/issues)
- **Discussions**: [GitHub Discussions](https://github.com/sparktechagency/fam_sched_backend/discussions)
- **Email**: support@sparktechagency.com

---

## 🗺️ Roadmap

- [ ] Mobile app push notifications v2
- [ ] Advanced analytics dashboard
- [ ] AI-powered smart scheduling suggestions
- [ ] Multi-language support
- [ ] Offline-first sync capability
- [ ] Video call integration
- [ ] Machine learning event recommendations

---

**Last Updated**: June 2, 2026  
**Version**: 1.0.0  
**Status**: 🟢 Active & Maintained

---

_Bringing families closer through technology_ 👨‍👩‍👧‍👦✨

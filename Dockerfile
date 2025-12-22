# ---------- STAGE 1: BUILD ----------
FROM node:22-alpine AS builder
WORKDIR /app

# copy package.json + package-lock.json
COPY ./package*.json ./

# install dev dependencies
RUN npm ci

# copy all source files
COPY . .

# build the app
RUN npm run build

# ---------- STAGE 2: PRODUCTION ----------
FROM node:22-alpine
WORKDIR /app

# copy only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# copy build output from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/. .

EXPOSE 2000
EXPOSE 2005 

CMD ["npm", "start"]

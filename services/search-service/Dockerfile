FROM node:18-alpine AS base

# Install pnpm
RUN npm install -g pnpm@8.15.0

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY turbo.json ./

# Copy all package.json files
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY services/search-service/package.json ./services/search-service/

# Install dependencies
RUN pnpm install

# Copy source code
COPY packages/shared ./packages/shared
COPY packages/database ./packages/database
COPY services/search-service ./services/search-service

# Build shared packages
RUN pnpm --filter shared build
RUN pnpm --filter database build

WORKDIR /app/services/search-service

EXPOSE 3002

CMD ["pnpm", "dev"]

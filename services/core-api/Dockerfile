FROM node:18-alpine AS base

# Install pnpm
RUN npm install -g pnpm@8.15.0

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY turbo.json ./

# Copy all package.json files for dependency installation
COPY packages/shared/package.json ./packages/shared/
COPY packages/database/package.json ./packages/database/
COPY services/core-api/package.json ./services/core-api/

# Install dependencies
RUN pnpm install

# Copy source code
COPY packages/shared ./packages/shared
COPY packages/database ./packages/database
COPY services/core-api ./services/core-api

# Build shared packages
RUN pnpm --filter shared build
RUN pnpm --filter database build

WORKDIR /app/services/core-api

EXPOSE 3001

CMD ["pnpm", "dev"]

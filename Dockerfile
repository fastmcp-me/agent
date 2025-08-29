# Read Node.js version from .node-version file
ARG NODE_VERSION
FROM node:${NODE_VERSION:-22}-alpine AS build-stage

# Set the working directory in the Docker image
WORKDIR /usr/src/app

# Install pnpm globally using npm
RUN npm install -g corepack && \
  corepack enable

# Copy package files first to leverage Docker cache
COPY package.json pnpm-lock.yaml ./

# Install dependencies with frozen lockfile for consistency
RUN pnpm install --frozen-lockfile

# Copy the rest of the application to the working directory
COPY . .

# Build the application
RUN pnpm run build

# Basic production image with npm, pnpm, yarn only
FROM node:${NODE_VERSION:-22}-alpine AS basic

# Set the working directory in the Docker image
WORKDIR /usr/src/app

# Install pnpm and yarn globally using npm and corepack
RUN npm install -g corepack yarn && \
  corepack enable

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only with frozen lockfile
RUN pnpm install --frozen-lockfile --prod

# Copy build artifacts from build stage
COPY --from=build-stage /usr/src/app/build .

EXPOSE 3050

CMD ["node", "index.js"]

# Extended image with additional tools (uv, bun)
FROM basic AS extended

RUN apk update && apk add --no-cache curl python3 bash ca-certificates && \
  # Clean up package cache
  rm -rf /var/cache/apk/*

# Define versions for reproducible builds
ARG UV_VERSION=0.5.11
ARG BUN_VERSION=1.1.42

# Install uv (Python package manager) with version pinning
RUN curl -LsSf https://astral.sh/uv/${UV_VERSION}/install.sh | sh && \
  . $HOME/.local/bin/env && \
  ln -sf $HOME/.local/bin/uv /usr/local/bin/uv && \
  ln -sf $HOME/.local/bin/uvx /usr/local/bin/uvx && \
  # Verify installations work
  uv --version

# Install bun (JavaScript runtime and package manager) with version pinning
RUN curl -fsSL https://bun.com/install | bash -s "bun-v${BUN_VERSION}" && \
  ln -sf ~/.bun/bin/bun /usr/local/bin/bun && \
  # Verify installations work
  bun --version

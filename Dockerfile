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

# Install additional system packages for extra tools
RUN apk update && apk add --no-cache curl python3 py3-pip bash

# Install uv (Python package manager)
RUN curl -LsSf https://astral.sh/uv/install.sh | sh && \
  . $HOME/.local/bin/env && \
  ln -sf $HOME/.local/bin/uv /usr/local/bin/uv && \
  ln -sf $HOME/.local/bin/uvx /usr/local/bin/uvx

# Install bun (JavaScript runtime and package manager)
RUN curl -fsSL https://bun.sh/install | bash && \
  ln -sf ~/.bun/bin/bun /usr/local/bin/bun

# Default to extended image (with extra tools)
FROM extended

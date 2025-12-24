# Use custom Node 20 base image
FROM node:20.11.1 AS base

# Install Cursor CLI (assuming bash, curl, ca-certificates, git are already in base image)
RUN curl https://cursor.com/install -fsS | bash

# Add Cursor CLI to PATH
ENV PATH="/root/.local/bin:$PATH"

# Copy application files
COPY src /app/src
COPY config /app/config
COPY package.json /app/package.json
COPY package-lock.json /app/package-lock.json
COPY tsconfig.json /app/tsconfig.json

# Set working directory
WORKDIR /app

# Install dependencies and build TypeScript
RUN npm install && npm run build

# Verify the build was successful
RUN ls -la /app/dist/

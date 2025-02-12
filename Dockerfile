# Use Node.js LTS (Long Term Support) as the base image
FROM node:18-alpine

# Install required system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    openssl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy prisma files
COPY prisma ./prisma/

# Generate Prisma Client
RUN npx prisma generate

# Copy the rest of the application
COPY . .

# Set environment variables
ENV NODE_ENV=production

# Create a non-root user
RUN addgroup -S nodeapp && \
    adduser -S nodeapp -G nodeapp

# Change ownership of the working directory to the non-root user
RUN chown -R nodeapp:nodeapp /app

# Switch to non-root user
USER nodeapp

# Expose the port your app runs on
EXPOSE 5001

# Run migrations and start the application
CMD ["/bin/sh", "-c", "npx prisma migrate deploy && node server.js"]
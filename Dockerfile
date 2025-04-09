# Use Node.js LTS as the base image
FROM node:22-alpine AS base

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the Next.js application
# RUN NEXT_PUBLIC_DISABLE_ESLINT=true 
RUN npm run build

# Use a lightweight image for production
FROM node:22-alpine AS production

# Set working directory
WORKDIR /app

ENV NODE_ENV=production

# Copy only the necessary files from the build stage
COPY --from=base /app/package.json /app/package-lock.json ./
COPY --from=base /app/.next ./.next
COPY --from=base /app/public ./public
COPY --from=base /app/next.config.mjs ./next.config.mjs

# Install only production dependencies
RUN npm install --omit=dev

# Expose the port Next.js will run on
EXPOSE 3000

# Start the Next.js application
CMD ["npm", "start"]
# Use Node.js Alpine for a lightweight dev image
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy the rest of your code
COPY . .

# Expose the development port
EXPOSE 3000

# Start the Next.js development server
CMD ["npm", "run", "dev"]
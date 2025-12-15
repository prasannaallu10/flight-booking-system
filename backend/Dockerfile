# Use Node.js 18 as base
FROM node:18

# Set working directory
WORKDIR /app

# Install netcat
RUN apt-get update \
    && apt-get install -y netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy backend code
COPY . .

# Make wait-for-mysql.sh executable
RUN chmod +x wait-for-mysql.sh

# Command to wait for MySQL and then start backend
CMD ["sh", "./wait-for-mysql.sh", "node", "server.js"]

# Use a lightweight Node.js image as a base
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json first to leverage Docker layer caching.
# This way, 'npm install' only runs again if these files change.
COPY package*.json ./

# Install application dependencies
RUN npm install

# Copy the rest of the application's source code into the container
COPY . .

# Build the TypeScript code into JavaScript
RUN npm run build

# The application will run on port 3000, so we expose it
EXPOSE 5000

# The command to start the application when the container launches
CMD ["node", "dist/main"]
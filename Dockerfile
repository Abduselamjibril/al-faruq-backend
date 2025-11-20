# ---- Stage 1: Build ----
FROM node:20 AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
RUN npm prune --production


# ---- Stage 2: Production ----
FROM node:20-alpine
WORKDIR /usr/src/app

# Copy dependencies and build artifacts from the builder stage
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package*.json ./

# --- THIS IS THE FIX ---
# Instead of copying to '.', we specify the destination folder 'dist'
COPY --from=builder /usr/src/app/dist ./dist

CMD ["node", "dist/main"]
FROM node:20-bullseye
WORKDIR /app
RUN apt-get update && apt-get install -y \
    python3 python3-pip build-essential \
    && rm -rf /var/lib/apt/lists/*
COPY package.json ./
RUN npm install --production
COPY . .
EXPOSE 4001
EXPOSE 40000-40200/udp
EXPOSE 40000-40200/tcp
HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:4001/health || exit 1
CMD ["node", "index.js"]

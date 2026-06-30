FROM node:20-slim

WORKDIR /app

# Install python and pip for robust youtube transcript extraction
RUN apt-get update && apt-get install -y python3 python3-pip python3-venv \
    && python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install youtube-transcript-api

ENV PATH="/opt/venv/bin:$PATH"

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and config
COPY . .

# Ensure mcp_config.json is in the expected path (the bot looks for it in C:\Users\..., we'll override it for production)
# We will update registry.ts to use a relative path if the absolute one fails.

CMD ["npx", "tsx", "src/index.ts"]

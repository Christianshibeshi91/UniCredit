FROM python:3.12-slim

# Create non-root user (no admin privileges)
RUN groupadd -r agent && useradd -r -g agent -m -d /home/agent agent

# Install Playwright system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libatk-bridge2.0-0 libdrm2 libxcomposite1 libxdamage1 \
    libxrandr2 libgbm1 libasound2 libpangocairo-1.0-0 libgtk-3-0 \
    libxshmfence1 fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

# Set working directory (isolated from host)
WORKDIR /app

# Install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright Chromium to a persistent path (not in /home/agent which is tmpfs)
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/playwright-browsers
RUN mkdir -p /opt/playwright-browsers && playwright install chromium

# Copy application code
COPY . .

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Switch to non-root user
USER agent

# No volume mounts = no access to host filesystem
# No network_mode=host = isolated network
# No privileged = no kernel access

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

CMD ["python", "api.py"]


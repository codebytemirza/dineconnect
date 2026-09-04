#!/bin/bash
# VM Setup Script for DineConnect WhatsApp Bot
# Run this on your VM: bash vm-setup.sh

set -e

echo "🚀 Setting up DineConnect WhatsApp Bot on VM..."

# Update system
echo "📦 Updating system packages..."
sudo apt-get update && sudo apt-get upgrade -y

# Install Node.js 20 (LTS)
echo "📦 Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installations
node --version
npm --version

# Install PM2 for process management
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Install Chrome dependencies for Puppeteer (if needed for QR generation)
echo "📦 Installing Chrome dependencies..."
sudo apt-get install -y \
  ca-certificates \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libc6 \
  libcairo2 \
  libcups2 \
  libdbus-1-3 \
  libexpat1 \
  libfontconfig1 \
  libgbm1 \
  libgcc1 \
  libglib2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libstdc++6 \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxrandr2 \
  libxrender1 \
  libxss1 \
  libxtst6 \
  lsb-release \
  wget \
  xdg-utils

# Create app directory
APP_DIR="/home/ubuntu/dineconnect"
echo "📁 Creating app directory: $APP_DIR"
mkdir -p $APP_DIR
cd $APP_DIR

# Clone repository (replace with your repo)
echo "📥 Cloning repository..."
# git clone <your-repo-url> .

# Or if copying files manually, ensure these exist:
# - package.json
# - services/whatsapp-bot-vm.ts
# - lib/** (all lib files)
# - tsconfig.json

# Install dependencies
echo "📦 Installing npm dependencies..."
npm ci --production=false

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Create PM2 ecosystem config
echo "⚙️ Creating PM2 ecosystem config..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'dineconnect-bot',
      script: 'tsx',
      args: 'services/whatsapp-bot-vm.ts',
      cwd: '/home/ubuntu/dineconnect',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        // These should be set in .env file on VM
      },
      error_file: '/home/ubuntu/logs/bot-error.log',
      out_file: '/home/ubuntu/logs/bot-out.log',
      log_file: '/home/ubuntu/logs/bot-combined.log',
      time: true,
    }
  ]
};
EOF

# Create logs directory
mkdir -p /home/ubuntu/logs

# Create .env file template
echo "📝 Creating .env template..."
cat > .env << 'EOF'
# Copy this to .env and fill in your values
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4o-mini

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token

ENABLE_WHATSAPP=true
DEFAULT_RESTAURANT_ID=burger-joint
SESSION_SECRET=your_32_char_secret_here
EOF

# Setup PM2 startup
echo "🔧 Setting up PM2 startup..."
pm2 startup systemd -u ubuntu --hp /home/ubuntu

echo ""
echo "✅ VM Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env with your actual credentials: nano .env"
echo "2. Run the bot once to generate QR: npm run bot:vm"
echo "3. Scan QR code with WhatsApp"
echo "4. Start with PM2: pm2 start ecosystem.config.js"
echo "5. Save PM2 config: pm2 save"
echo "6. Setup cron keep-alive: crontab -e (add the keep-alive command)"
echo ""
echo "Useful commands:"
echo "  pm2 logs dineconnect-bot    # View logs"
echo "  pm2 restart dineconnect-bot # Restart bot"
echo "  pm2 stop dineconnect-bot    # Stop bot"
echo "  pm2 status                  # Check status"
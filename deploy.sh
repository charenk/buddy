#!/bin/bash
# Figma AI Buddy - Production Deployment Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Figma AI Buddy - Production Deployment${NC}"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}Installing Vercel CLI...${NC}"
    npm install -g vercel
fi

# Check if user is logged in to Vercel
if ! vercel whoami &> /dev/null; then
    echo -e "${YELLOW}Please login to Vercel:${NC}"
    vercel login
fi

echo -e "${BLUE}📋 Pre-deployment Checklist:${NC}"
echo ""

# Check environment variables
echo -e "${YELLOW}Checking environment variables...${NC}"

required_vars=(
    "SUPABASE_URL"
    "SUPABASE_ANON_KEY" 
    "SUPABASE_SERVICE_ROLE_KEY"
    "FIGMA_CLIENT_ID"
    "FIGMA_CLIENT_SECRET"
    "FIGMA_REDIRECT_URI"
    "OPENAI_API_KEY"
    "WEBHOOK_URL"
)

missing_vars=()

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    echo -e "${RED}❌ Missing environment variables:${NC}"
    for var in "${missing_vars[@]}"; do
        echo "   - $var"
    done
    echo ""
    echo -e "${YELLOW}Please set these variables in your .env file or Vercel dashboard${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All environment variables are set${NC}"

# Check if Supabase is accessible
echo -e "${YELLOW}Testing Supabase connection...${NC}"
if node -e "
import { createClient } from './lib/db.js';
const supabase = createClient();
supabase.from('users').select('count').limit(1).then(() => {
  console.log('✅ Supabase connection successful');
  process.exit(0);
}).catch(err => {
  console.log('❌ Supabase connection failed:', err.message);
  process.exit(1);
});
" 2>/dev/null; then
    echo -e "${GREEN}✅ Supabase connection successful${NC}"
else
    echo -e "${RED}❌ Supabase connection failed${NC}"
    echo "Please check your SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    exit 1
fi

# Deploy to Vercel
echo -e "${YELLOW}Deploying to Vercel...${NC}"
vercel --prod --yes

# Get deployment URL
DEPLOYMENT_URL=$(vercel ls --json | jq -r '.[0].url' 2>/dev/null || echo "unknown")

echo ""
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Update your Figma OAuth app redirect URI to:"
echo "   https://$DEPLOYMENT_URL/api/auth/figma-oauth"
echo ""
echo "2. Update WEBHOOK_URL environment variable to:"
echo "   https://$DEPLOYMENT_URL/api/figma-comment-webhook"
echo ""
echo "3. Test the plugin in Figma:"
echo "   - Load the plugin"
echo "   - Click 'Connect with Figma'"
echo "   - Setup webhook"
echo "   - Configure context"
echo "   - Test with @buddy comments"
echo ""
echo -e "${BLUE}🔗 Useful Links:${NC}"
echo "   - Vercel Dashboard: https://vercel.com/dashboard"
echo "   - Supabase Dashboard: https://supabase.com/dashboard"
echo "   - Figma Developer: https://www.figma.com/developers/apps"
echo ""
echo -e "${GREEN}Happy building! 🎨✨${NC}"

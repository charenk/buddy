#!/bin/bash
# Figma AI Buddy - Webhook Creation Script
# This script creates a webhook for comment-based AI responses

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔗 Creating Figma Webhook for AI Buddy...${NC}"
echo ""

# Check if FIGMA_PAT is set
if [ -z "$FIGMA_PAT" ]; then
    echo -e "${RED}❌ Error: FIGMA_PAT environment variable is not set${NC}"
    echo "Please set your Figma Personal Access Token:"
    echo "export FIGMA_PAT=your_figma_token_here"
    exit 1
fi

# Check if WEBHOOK_URL is set
if [ -z "$WEBHOOK_URL" ]; then
    echo -e "${YELLOW}⚠️  Warning: WEBHOOK_URL not set, using default${NC}"
    WEBHOOK_URL="https://your-app.vercel.app/api/figma-comment-webhook"
    echo "Please update WEBHOOK_URL to your actual deployed URL"
    echo ""
fi

echo -e "${BLUE}📋 Configuration:${NC}"
echo "   Webhook URL: $WEBHOOK_URL"
echo "   Event Type: FILE_COMMENT"
echo ""

# Get team information
echo -e "${BLUE}🔍 Getting team information...${NC}"
TEAM_RESPONSE=$(curl -s -H "X-Figma-Token: $FIGMA_PAT" https://api.figma.com/v1/teams/me)

if echo "$TEAM_RESPONSE" | grep -q '"error"'; then
    echo -e "${RED}❌ Failed to get team info:${NC}"
    echo "$TEAM_RESPONSE"
    exit 1
fi

TEAM_ID=$(echo "$TEAM_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
TEAM_NAME=$(echo "$TEAM_RESPONSE" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)

echo -e "${GREEN}✅ Team found: $TEAM_NAME ($TEAM_ID)${NC}"
echo ""

# Create webhook
echo -e "${BLUE}🔗 Creating webhook...${NC}"
WEBHOOK_RESPONSE=$(curl -s -X POST https://api.figma.com/v2/webhooks \
  -H "X-Figma-Token: $FIGMA_PAT" \
  -H "Content-Type: application/json" \
  -d "{
    \"event_type\": \"FILE_COMMENT\",
    \"team_id\": \"$TEAM_ID\",
    \"endpoint\": \"$WEBHOOK_URL\",
    \"passcode\": \"buddy-ai-webhook\",
    \"description\": \"Figma AI Buddy Comment Response\"
  }")

if echo "$WEBHOOK_RESPONSE" | grep -q '"error"'; then
    echo -e "${RED}❌ Failed to create webhook:${NC}"
    echo "$WEBHOOK_RESPONSE"
    exit 1
fi

WEBHOOK_ID=$(echo "$WEBHOOK_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

echo -e "${GREEN}✅ Webhook created successfully!${NC}"
echo "   Webhook ID: $WEBHOOK_ID"
echo ""

echo -e "${BLUE}🎯 How to Test:${NC}"
echo "1. Open any Figma file"
echo "2. Comment on a frame with '@buddy analyze this design'"
echo "3. Buddy will reply with AI analysis!"
echo ""

echo -e "${BLUE}📝 Required Environment Variables:${NC}"
echo "FIGMA_PAT=$FIGMA_PAT"
echo "OPENAI_API_KEY=your_openai_key_here"
echo "WEBHOOK_URL=$WEBHOOK_URL"
echo ""

echo -e "${GREEN}🚀 Comment-based AI is now ready!${NC}"

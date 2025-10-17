# 💬 Figma AI Buddy - Comment Webhook System

## 🎯 **How It Works**

The comment-based system uses **Figma's webhook API** to respond to comments in real-time. When you comment `@buddy` on any frame, Figma sends a webhook to our server, which then analyzes the design and replies with AI feedback.

## 🔧 **Setup Process**

### **Step 1: Deploy Your API**
```bash
# Deploy to Vercel
vercel --prod

# Note your deployed URL (e.g., https://your-app.vercel.app)
```

### **Step 2: Set Environment Variables**
```bash
# Required environment variables
FIGMA_PAT=your_figma_personal_access_token
OPENAI_API_KEY=your_openai_api_key
WEBHOOK_URL=https://your-app.vercel.app/api/figma-comment-webhook
```

### **Step 3: Create Webhook via API**
Since Figma doesn't provide webhook UI, create it via REST API:

```bash
# 1. Get your team ID
curl -H "X-Figma-Token: YOUR_PAT" https://api.figma.com/v1/teams/me

# 2. Create webhook (replace YOUR_TEAM_ID with the ID from step 1)
curl -X POST https://api.figma.com/v2/webhooks \
  -H "X-Figma-Token: YOUR_PAT" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "FILE_COMMENT",
    "team_id": "YOUR_TEAM_ID",
    "endpoint": "https://your-app.vercel.app/api/figma-comment-webhook",
    "passcode": "buddy-ai-webhook",
    "description": "Figma AI Buddy Comment Response"
  }'
```

### **Step 4: Test the System**
1. Open any Figma file
2. Comment on a frame: `@buddy analyze this design`
3. Wait for Buddy's AI response!

## 🚀 **Usage Examples**

### **Basic Analysis**
```
@buddy analyze this design
@buddy review the user experience
@buddy check for accessibility issues
```

### **Specific Requests**
```
@buddy analyze the color contrast
@buddy review the typography hierarchy
@buddy check if this follows design system guidelines
```

### **Visual Analysis**
```
@buddy analyze the visual composition
@buddy review the spacing and layout
@buddy check the overall visual balance
```

## 🎨 **Features**

### **Smart Detection**
- Automatically detects `@buddy` mentions in comments
- Analyzes the specific frame/component you commented on
- Extracts your analysis request from the comment

### **Visual Analysis**
- Exports the commented frame as an image
- Sends visual data to AI for analysis
- Provides context-aware feedback

### **Intelligent Replies**
- Posts AI analysis as comment replies
- Maintains conversation context
- Provides actionable feedback

### **Error Handling**
- Graceful error messages
- Helpful troubleshooting tips
- Fallback responses when API is unavailable

## 🔍 **How It Works Technically**

1. **Comment Posted**: User comments `@buddy` on a frame
2. **Webhook Triggered**: Figma sends `FILE_COMMENT` event to our webhook
3. **Analysis Requested**: Server extracts prompt and gets frame details
4. **Visual Data**: Exports frame as image for AI analysis
5. **AI Processing**: Sends to OpenAI with visual context
6. **Reply Posted**: AI response is posted as comment reply

## 🛠️ **API Endpoints**

### **Webhook Endpoint**
- **URL**: `/api/figma-comment-webhook`
- **Method**: `POST`
- **Purpose**: Receives comment events from Figma

### **Required Headers**
- `Content-Type: application/json`
- Figma webhook signature (for security)

## 📋 **Environment Variables**

```env
# Figma Configuration
FIGMA_PAT=your_figma_personal_access_token_here

# OpenAI Configuration  
OPENAI_API_KEY=your_openai_api_key_here

# Webhook Configuration
WEBHOOK_URL=https://your-app.vercel.app/api/figma-comment-webhook

# Optional: Database (for logging)
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_key_here
```

## 🔧 **Troubleshooting**

### **Webhook Not Responding**
- Check if webhook URL is publicly accessible
- Verify environment variables are set
- Check Vercel deployment logs

### **No AI Analysis**
- Verify OpenAI API key is valid
- Check if webhook is receiving events
- Ensure comment mentions `@buddy`

### **Visual Analysis Not Working**
- Make sure you're commenting on a frame or component
- Check if the element is visible and not hidden
- Verify Figma PAT has file access permissions

## 🎯 **Benefits of Webhook Approach**

### **Real-time Responses**
- Instant AI feedback on comments
- No need to run plugins manually
- Seamless integration with Figma's comment system

### **Team Collaboration**
- Comments are visible to team members
- AI analysis is part of design discussions
- Easy to reference and follow up

### **Natural Workflow**
- Comment when you need help
- Get instant feedback
- Continue designing

## 🚀 **Ready to Use!**

Once set up, your Figma AI Buddy will respond to `@buddy` comments in real-time across all your Figma files!

**Happy designing!** 🎨✨

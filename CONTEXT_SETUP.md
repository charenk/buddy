# Context Management Setup Guide

This guide will help you set up the new context management system for Figma AI Buddy.

## 🚀 Quick Setup

### 1. Database Setup

Run the SQL schema in your Supabase SQL Editor:

```sql
-- Copy and paste the contents of supabase/schema.sql
-- This will create all necessary tables and functions
```

### 2. Environment Variables

Add these new environment variables to your Vercel project:

```bash
# New variables needed
SUPABASE_ANON_KEY=your_supabase_anon_key
FIGMA_CLIENT_ID=your_figma_client_id
FIGMA_CLIENT_SECRET=your_figma_client_secret
FIGMA_REDIRECT_URI=https://your-app.vercel.app/auth/callback
```

### 3. Deploy the New Webhook

Replace your current webhook with the new context-aware version:

1. **Backup current webhook**: Rename `api/figma-webhook.js` to `api/figma-webhook-backup.js`
2. **Deploy new webhook**: Rename `api/figma-webhook-context.js` to `api/figma-webhook.js`
3. **Deploy to Vercel**: Push changes to trigger deployment

## 🎯 Features Included

### ✅ User Management
- User registration and authentication
- Figma handle integration
- Trial tracking (10 free uses per user)

### ✅ Context Management
- Response style customization (brief, detailed, comprehensive)
- Tone selection (casual, professional, encouraging, critical)
- Focus areas (UX, visual, accessibility, performance, etc.)
- Domain expertise (mobile, web, enterprise, etc.)
- Custom prompts and instructions

### ✅ Performance Optimizations
- Context caching (5-minute TTL)
- Pre-built response templates
- Smart token limits based on preferences
- Parallel processing for speed

### ✅ Usage Tracking
- Trial count monitoring
- API usage tracking
- Cost calculation
- Performance metrics

## 🔧 API Endpoints

### User Management
- `POST /api/auth/signup` - Create new user
- `POST /api/auth/update-api-key` - Update user's OpenAI API key
- `POST /api/users/create` - Create user with context

### Context Management
- `GET /api/context/get?userId=xxx` - Get user context
- `POST /api/context/update` - Update user context

### Monitoring
- `GET /api/activity` - Get activity logs
- `GET /api/monitor` - Get monitoring dashboard
- `GET /api/performance` - Get performance metrics

## 🎨 Dashboard

Access the user dashboard at: `https://your-app.vercel.app/dashboard.html`

### Features:
- **Context Settings**: Customize AI response style
- **Usage Tracking**: Monitor trial count and API usage
- **API Key Management**: Add your own OpenAI API key
- **Real-time Stats**: See interaction history and costs

## 🚀 How It Works

### 1. User Flow
1. User signs up via dashboard
2. User sets their context preferences
3. User types `@buddy` in any Figma comment
4. System applies user's context to AI response
5. AI responds with personalized feedback

### 2. Context Application
- **Brief responses**: 2-3 key points, concise
- **Detailed responses**: 5-7 points with explanations
- **Comprehensive responses**: Full analysis covering all aspects
- **Tone customization**: Casual, professional, encouraging, or critical
- **Focus areas**: UX, visual design, accessibility, performance, etc.

### 3. Performance
- **Speed maintained**: Under 4 seconds response time
- **Context caching**: 5-minute cache for user preferences
- **Smart defaults**: Fast fallbacks for new users
- **Parallel processing**: Context applied while processing image

## 🔍 Testing

### Test the Context System
1. **Create a user**: Use the dashboard to sign up
2. **Set context**: Customize response style and tone
3. **Test in Figma**: Type `@buddy analyze this design` in a comment
4. **Verify response**: Check that the AI uses your context preferences

### Test Different Contexts
- **Brief + Casual**: Should be short and friendly
- **Detailed + Professional**: Should be thorough and formal
- **Comprehensive + Critical**: Should be complete and direct

## 🛠️ Troubleshooting

### Common Issues

1. **Context not applied**: Check if user is properly registered
2. **Slow responses**: Verify context caching is working
3. **API key errors**: Ensure user's API key is valid
4. **Database errors**: Check Supabase connection and permissions

### Debug Steps

1. **Check logs**: Look at Vercel function logs
2. **Verify database**: Check Supabase tables are created
3. **Test endpoints**: Use Postman to test API endpoints
4. **Check environment**: Verify all environment variables are set

## 📈 Next Steps

### Phase 2 Features (Future)
- Team collaboration and shared contexts
- Advanced analytics and reporting
- A/B testing for response styles
- Figma plugin for native experience

### Performance Monitoring
- Monitor response times
- Track user engagement
- Optimize based on usage patterns
- Scale infrastructure as needed

## 🎉 Success Metrics

- **Response time**: < 4 seconds
- **User satisfaction**: Positive feedback on personalized responses
- **Trial conversion**: Users adding their own API keys
- **Context usage**: Users customizing their preferences

---

**Ready to deploy? Follow the Quick Setup steps above and test the new context management system!**

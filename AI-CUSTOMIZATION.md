# AI Buddy Customization Guide

## 🎯 How to Control AI Responses

The AI Buddy now automatically detects your preferences from keywords in your comments. You can customize the tone, focus, and domain expertise.

## 📝 Usage Examples

### **Quick & Brief Responses**
```
@buddy brief mobile usability check
@buddy quick accessibility review
@buddy short visual design feedback
```

### **Focused Domain Expertise**
```
@buddy mobile app design review
@buddy web responsive design analysis
@buddy enterprise dashboard critique
@buddy ecommerce conversion optimization
@buddy fintech security review
```

### **Specific Focus Areas**
```
@buddy accessibility analysis of this form
@buddy visual design review
@buddy performance optimization check
@buddy business conversion review
@buddy usability testing feedback
```

### **Detailed & Technical**
```
@buddy detailed mobile app analysis
@buddy technical performance review
@buddy comprehensive accessibility audit
```

## 🔧 Customization Options

### **1. Domain Expertise**
- **mobile** - iOS/Android best practices
- **web** - Responsive design, browser compatibility
- **enterprise** - Complex workflows, admin interfaces
- **ecommerce** - Conversion optimization, product catalogs
- **fintech** - Security, compliance, financial data

### **2. Focus Areas**
- **accessibility** - WCAG compliance, screen readers
- **visual-design** - Typography, color, spacing
- **usability** - Task completion, user flows
- **performance** - Loading times, optimization
- **business** - Conversion rates, metrics

### **3. Response Tone**
- **brief** - Under 200 words, bullet points
- **concise** - Under 400 words, clear headers
- **detailed** - Up to 800 words, comprehensive
- **technical** - Technical terminology, implementation

### **4. Response Length**
- **brief** - Top 3 issues only
- **standard** - Main issues + alternatives
- **comprehensive** - All aspects covered

## 🚀 Advanced Customization

### **Modify AI Behavior**
Edit `ai-config.js` to:
- Add new domain expertise
- Change default preferences
- Add new focus areas
- Modify tone instructions

### **Example: Add Gaming Domain**
```javascript
'gaming': {
  name: 'Gaming UI Design',
  expertise: 'Game UX, player engagement, immersive interfaces',
  keywords: ['gaming', 'game', 'player', 'engagement']
}
```

### **Example: Change Default Tone**
```javascript
defaults: {
  domain: 'mobile',      // Default to mobile expertise
  focus: 'accessibility', // Default to accessibility focus
  tone: 'brief',         // Default to brief responses
  length: 'standard'
}
```

## 📊 Response Time Expectations

- **Brief responses**: 2-5 seconds
- **Standard responses**: 3-8 seconds  
- **Detailed responses**: 5-12 seconds
- **Visual analysis**: 8-15 seconds

## 🎨 Visual Analysis

### **Method 1: Image Attachments (Recommended)**
1. **Paste a screenshot** directly into your Figma comment
2. **Add your question** with `@buddy`
3. **AI automatically analyzes** the attached image

```
[Paste screenshot] @buddy analyze this mobile design
[Paste screenshot] @buddy accessibility review
[Paste screenshot] @buddy visual design feedback
```

### **Method 2: Figma Node Export**
Add `visual`, `image`, `see`, or `look` to enable Figma node analysis:
```
@buddy visual mobile design review
@buddy look at this UI and suggest improvements
@buddy image analysis for accessibility
```

### **Image Analysis Features:**
- ✅ **Automatic detection** - AI detects attached images
- ✅ **Higher quality** - Direct image analysis vs. Figma export
- ✅ **Faster processing** - No need to export from Figma
- ✅ **Any image type** - Screenshots, mockups, wireframes

## 💡 Pro Tips

1. **Be specific** - "mobile accessibility" vs "check this"
2. **Use keywords** - The AI detects your intent automatically
3. **Combine modifiers** - "brief mobile accessibility review"
4. **Test different tones** - See what works best for your team
5. **Visual when needed** - Only use visual analysis for detailed critiques

## 🔄 Reset to Defaults

If you want to reset to the original comprehensive format:
```
@buddy comprehensive general design review
```

This will give you the full analysis covering all areas like before.

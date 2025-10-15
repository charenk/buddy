# Figma AI Buddy Plugin Setup

## 🎯 The Solution: Figma Plugin

Since Figma doesn't provide a UI for webhook creation and doesn't support account-level webhooks, we've created a **Figma plugin** that works across all files automatically.

## ✅ Advantages of Plugin Approach

- **Works in ANY file** - No webhook setup needed
- **Real-time interaction** - Immediate AI responses
- **Better UX** - Native Figma interface
- **No file limitations** - Works everywhere
- **User-friendly** - Easy to install and use

## 🚀 How to Set Up the Plugin

### Step 1: Create Figma Plugin

1. **Go to Figma Desktop App** (not web)
2. **Open any file**
3. **Go to:** `Plugins` → `Development` → `Import plugin from manifest...`
4. **Select the manifest file:** `figma-plugin/manifest.json`

### Step 2: Install the Plugin

1. **Click "Import"** in the plugin dialog
2. **The plugin will appear** in your plugins list
3. **Run the plugin** by going to `Plugins` → `Figma AI Buddy`

### Step 3: Use @buddy

1. **Open the plugin** from the plugins menu
2. **Enter your analysis request** (e.g., "Analyze this design for accessibility")
3. **Configure settings** (length, tone, focus areas)
4. **Click "Analyze Design"**
5. **Get instant AI feedback** in the plugin UI

## 📁 Plugin Files

- **`manifest.json`** - Plugin configuration
- **`code.js`** - Main plugin logic (runs in Figma)
- **`ui.html`** - Plugin interface (what you see)
- **`api/figma-plugin.js`** - API endpoint for plugin requests

## 🔧 Plugin Features

### Analysis Options
- **Response Length:** Brief, Detailed, Comprehensive
- **Tone:** Casual, Professional, Encouraging, Critical
- **Focus Areas:** UX, Visual, Accessibility, Performance, Content, Interactions
- **Custom Prompts:** Your specific analysis requests

### Smart Analysis
- **Selection-aware:** Analyzes selected elements or entire page
- **Context-aware:** Understands what you're working on
- **Settings persistence:** Remembers your preferences

## 🎨 How It Works

1. **Plugin detects** your analysis request
2. **Calls our API** with your settings and prompt
3. **AI analyzes** your design based on your preferences
4. **Returns feedback** directly in the plugin interface
5. **No webhooks needed** - Direct API communication

## 🚀 Deploy the Plugin

### Option 1: Development Mode (Recommended for testing)
1. **Import the manifest** in Figma Desktop
2. **Use immediately** - No publishing needed
3. **Perfect for testing** and development

### Option 2: Published Plugin (For team use)
1. **Publish to Figma Community** (requires review)
2. **Team can install** from Community
3. **Automatic updates** when you publish new versions

## 🧪 Testing the Plugin

1. **Import the plugin** in Figma Desktop
2. **Open any design file**
3. **Run the plugin** from Plugins menu
4. **Try different analysis requests:**
   - "Analyze this design for accessibility issues"
   - "Review the user experience flow"
   - "Check for visual hierarchy problems"
   - "What are the usability concerns here?"

## 🔄 Alternative: Manual File Webhooks

If you prefer webhooks for specific files:

1. **Get file keys** from Figma URLs
2. **Use our API** to create webhooks programmatically
3. **Manage webhooks** via dashboard
4. **Works for specific files** only

## 🎯 Recommended Workflow

1. **Install the plugin** (one-time setup)
2. **Use @buddy in any file** (no additional setup)
3. **Customize settings** as needed
4. **Get instant feedback** on your designs

## 📞 Support

- **Plugin issues:** Check Figma console for errors
- **API issues:** Check Vercel logs
- **Settings:** Use the dashboard to manage preferences

---

**The plugin approach solves the webhook limitation and provides a much better user experience!** 🚀

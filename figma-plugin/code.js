// Figma AI Buddy - Simplified Community Version
// Works entirely within the plugin without external dependencies

console.log('🤖 Figma AI Buddy initialized - ready to analyze your designs!');

// Show the plugin UI
figma.showUI(__html__, { width: 400, height: 600 });

// Handle messages from the UI
figma.ui.onmessage = async (msg) => {
  try {
    switch (msg.type) {
      case 'analyze-frame':
        await handleFrameAnalysis(msg);
        break;
      case 'analyze-selection':
        await handleSelectionAnalysis(msg);
        break;
      case 'close-plugin':
        figma.closePlugin();
        break;
      default:
        console.log('Unknown message type:', msg.type);
    }
  } catch (error) {
    console.error('Error handling message:', error);
    figma.ui.postMessage({
      type: 'error',
      message: 'An error occurred: ' + error.message
    });
  }
};

// Analyze a specific frame
async function handleFrameAnalysis(msg) {
  const { frameId, prompt, context } = msg;
  
  try {
    // Find the frame
    const frame = figma.getNodeById(frameId);
    if (!frame) {
      throw new Error('Frame not found');
    }

    // Get frame information
    const frameInfo = {
      name: frame.name,
      type: frame.type,
      width: frame.width,
      height: frame.height,
      children: frame.children ? frame.children.length : 0,
      fills: frame.fills,
      effects: frame.effects,
      cornerRadius: frame.cornerRadius,
      paddingLeft: frame.paddingLeft,
      paddingRight: frame.paddingRight,
      paddingTop: frame.paddingTop,
      paddingBottom: frame.paddingBottom,
      itemSpacing: frame.itemSpacing,
      layoutMode: frame.layoutMode,
      primaryAxisAlignItems: frame.primaryAxisAlignItems,
      counterAxisAlignItems: frame.counterAxisAlignItems,
      primaryAxisSizingMode: frame.primaryAxisSizingMode,
      counterAxisSizingMode: frame.counterAxisSizingMode
    };

    // Generate AI analysis
    const analysis = generateAIAnalysis(frameInfo, prompt, context);
    
    // Add comment to the frame
    const comment = figma.createComment();
    comment.message = `🤖 AI Analysis: ${analysis}`;
    comment.parent = frame;
    comment.x = frame.x + frame.width + 20;
    comment.y = frame.y;

    // Send success message to UI
    figma.ui.postMessage({
      type: 'analysis-complete',
      analysis: analysis,
      frameName: frame.name
    });

  } catch (error) {
    console.error('Frame analysis error:', error);
    figma.ui.postMessage({
      type: 'error',
      message: 'Failed to analyze frame: ' + error.message
    });
  }
}

// Analyze current selection
async function handleSelectionAnalysis(msg) {
  const { prompt, context } = msg;
  
  try {
    const selection = figma.currentPage.selection;
    
    if (selection.length === 0) {
      throw new Error('Please select a frame or element to analyze');
    }

    const element = selection[0];
    const elementInfo = {
      name: element.name,
      type: element.type,
      width: element.width,
      height: element.height,
      fills: element.fills,
      effects: element.effects,
      cornerRadius: element.cornerRadius
    };

    // Generate AI analysis
    const analysis = generateAIAnalysis(elementInfo, prompt, context);
    
    // Add comment to the element
    const comment = figma.createComment();
    comment.message = `🤖 AI Analysis: ${analysis}`;
    comment.parent = element;
    comment.x = element.x + element.width + 20;
    comment.y = element.y;

    // Send success message to UI
    figma.ui.postMessage({
      type: 'analysis-complete',
      analysis: analysis,
      elementName: element.name
    });

  } catch (error) {
    console.error('Selection analysis error:', error);
    figma.ui.postMessage({
      type: 'error',
      message: 'Failed to analyze selection: ' + error.message
    });
  }
}

// Generate AI analysis based on design properties
function generateAIAnalysis(elementInfo, prompt, context) {
  const { name, type, width, height, fills, cornerRadius } = elementInfo;
  
  // Basic design analysis based on properties
  let analysis = `**Design Analysis for "${name}"**\n\n`;
  
  // Size analysis
  if (width < 200) {
    analysis += "⚠️ **Size**: This element is quite narrow. Consider if it needs more breathing room.\n";
  } else if (width > 800) {
    analysis += "⚠️ **Size**: This element is very wide. Consider breaking it into smaller components.\n";
  } else {
    analysis += "✅ **Size**: Good width for most screen sizes.\n";
  }
  
  // Aspect ratio analysis
  const aspectRatio = width / height;
  if (aspectRatio > 3) {
    analysis += "⚠️ **Aspect Ratio**: Very wide element. Consider if this works on mobile devices.\n";
  } else if (aspectRatio < 0.5) {
    analysis += "⚠️ **Aspect Ratio**: Very tall element. Consider horizontal layout alternatives.\n";
  } else {
    analysis += "✅ **Aspect Ratio**: Good proportions for most devices.\n";
  }
  
  // Corner radius analysis
  if (cornerRadius && cornerRadius > 0) {
    if (cornerRadius > 20) {
      analysis += "🎨 **Corner Radius**: Large radius creates a soft, friendly feel.\n";
    } else {
      analysis += "🎨 **Corner Radius**: Subtle rounding adds polish.\n";
    }
  } else {
    analysis += "💡 **Corner Radius**: Consider adding subtle corner radius for modern look.\n";
  }
  
  // Fill analysis
  if (fills && fills.length > 0) {
    const fill = fills[0];
    if (fill.type === 'SOLID') {
      analysis += "🎨 **Color**: Solid color fill detected.\n";
    } else if (fill.type === 'GRADIENT') {
      analysis += "🎨 **Color**: Gradient fill adds visual interest.\n";
    }
  }
  
  // Context-specific feedback
  if (context && context.toLowerCase().includes('mobile')) {
    analysis += "\n📱 **Mobile Consideration**: Ensure touch targets are at least 44px.\n";
  }
  
  if (context && context.toLowerCase().includes('web')) {
    analysis += "\n🌐 **Web Consideration**: Consider hover states and keyboard navigation.\n";
  }
  
  // Custom prompt response
  if (prompt) {
    analysis += `\n**Response to your question**: ${prompt}\n`;
    analysis += "💡 This is a basic analysis. For detailed feedback, consider the design principles above.\n";
  }
  
  analysis += "\n---\n*Generated by Figma AI Buddy - Your design assistant*";
  
  return analysis;
}
// Figma AI Buddy Plugin - Frame Analysis Assistant
// This runs in the Figma plugin sandbox and analyzes selected frames

const API_BASE = 'https://buddy-lac-five.vercel.app';

// Plugin initialization with simple UI
figma.showUI(__html__, { width: 400, height: 500 });

console.log('🤖 Figma AI Buddy initialized - configure your settings and use @buddy comments!');

// Handle messages from UI
figma.ui.onmessage = async (msg) => {
  try {
    switch (msg.type) {
      case 'close-plugin':
        figma.closePlugin();
        break;
    }
  } catch (error) {
    console.error('Plugin error:', error);
    figma.ui.postMessage({
      type: 'error',
      message: 'An error occurred: ' + error.message
    });
  }
};


// Initialize plugin
figma.ui.postMessage({
  type: 'plugin-ready',
  data: {
    fileKey: figma.fileKey,
    fileName: figma.root.name,
    user: (figma.currentUser && figma.currentUser.name) || 'Unknown'
  }
});

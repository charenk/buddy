// Figma AI Buddy Plugin - Main Code
// This runs in the Figma plugin sandbox

const API_BASE = 'https://buddy-lac-five.vercel.app';

// Plugin initialization
figma.showUI(__html__, { width: 400, height: 600 });

// Handle messages from UI
figma.ui.onmessage = async (msg) => {
  try {
    switch (msg.type) {
      case 'analyze-design':
        await handleAnalyzeDesign(msg.data);
        break;
      case 'get-selection':
        await handleGetSelection();
        break;
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

// Analyze current design
async function handleAnalyzeDesign(data) {
  try {
    const { prompt, settings, includeVisual = true } = data;
    
    // Get current selection or page
    const selection = figma.currentPage.selection;
    let analysisTarget = 'current page';
    let visualData = null;
    
    if (selection.length > 0) {
      analysisTarget = `${selection.length} selected element(s)`;
      
      // Get visual data for selected frames/components
      if (includeVisual) {
        visualData = await getVisualData(selection);
      }
    }
    
    // Create analysis prompt
    const analysisPrompt = `${prompt}\n\nAnalyzing: ${analysisTarget}`;
    
    // Call our API with visual data
    const response = await fetch(`${API_BASE}/api/figma-plugin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: analysisPrompt,
        settings: settings,
        file_key: figma.fileKey,
        user: figma.currentUser?.name || 'Plugin User',
        visual_data: visualData,
        selection_info: {
          count: selection.length,
          types: selection.map(node => node.type),
          names: selection.map(node => node.name)
        }
      })
    });
    
    const result = await response.json();
    
    if (result.ok) {
      // Send result back to UI
      figma.ui.postMessage({
        type: 'analysis-result',
        data: {
          critique: result.critique,
          target: analysisTarget,
          visual_analyzed: !!visualData,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      throw new Error(result.error || 'Analysis failed');
    }
    
  } catch (error) {
    console.error('Analysis error:', error);
    figma.ui.postMessage({
      type: 'error',
      message: 'Analysis failed: ' + error.message
    });
  }
}

// Get visual data for selected elements
async function getVisualData(selection) {
  try {
    const visualElements = [];
    
    for (const node of selection) {
      if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
        // Export the node as an image
        const imageData = await node.exportAsync({
          format: 'PNG',
          constraint: { type: 'SCALE', value: 2 }
        });
        
        // Convert to base64
        const base64 = figma.base64Encode(imageData);
        
        visualElements.push({
          id: node.id,
          name: node.name,
          type: node.type,
          image: `data:image/png;base64,${base64}`,
          bounds: {
            x: node.x,
            y: node.y,
            width: node.width,
            height: node.height
          }
        });
      }
    }
    
    return visualElements;
  } catch (error) {
    console.error('Error getting visual data:', error);
    return null;
  }
}

// Get current selection info
async function handleGetSelection() {
  const selection = figma.currentPage.selection;
  
  figma.ui.postMessage({
    type: 'selection-info',
    data: {
      count: selection.length,
      types: selection.map(node => node.type),
      names: selection.map(node => node.name)
    }
  });
}

// Initialize plugin
figma.ui.postMessage({
  type: 'plugin-ready',
  data: {
    fileKey: figma.fileKey,
    fileName: figma.root.name,
    user: figma.currentUser?.name || 'Unknown'
  }
});

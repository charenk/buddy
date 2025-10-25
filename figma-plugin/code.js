// Design System & Accessibility Audit Plugin
// Performs audits on selected frames and creates targeted comments

console.log('🔍 Design System & Accessibility Audit Plugin initialized!');

// Show the plugin UI
figma.showUI(__html__, { width: 400, height: 500 });

// Handle messages from the UI
figma.ui.onmessage = async (msg) => {
  try {
    switch (msg.type) {
      case 'audit-accessibility':
        await performAccessibilityAudit(msg);
        break;
      case 'audit-design-system':
        await performDesignSystemAudit(msg);
        break;
      case 'audit-both':
        await performBothAudits(msg);
        break;
      case 'get-config':
        await getTeamConfiguration(msg);
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

/**
 * Perform accessibility audit on selected frame
 */
async function performAccessibilityAudit(msg) {
  try {
    const { teamId, customRules = [] } = msg;
    const selection = figma.currentPage.selection;
    
    if (selection.length === 0) {
      throw new Error('Please select a frame to audit');
    }

    const frame = selection[0];
    console.log('🔍 Starting accessibility audit on:', frame.name);

    // Extract frame data
    const frameData = await extractFrameData(frame);
    
    // Send to backend for analysis
    const response = await fetch('https://buddy-lac-five.vercel.app/api/audit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auditType: 'accessibility',
        frameData: frameData,
        teamId: teamId,
        userId: figma.currentUser ? figma.currentUser.id : null,
        customRules: customRules
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Audit failed: ${error}`);
    }

    const result = await response.json();
    
    // Create comments for each issue
    await createAuditComments(frame, result.results.issues, 'accessibility');
    
    figma.ui.postMessage({
      type: 'audit-complete',
      auditType: 'accessibility',
      summary: result.results.summary,
      issueCount: result.results.issues.length,
      message: `✅ Accessibility audit complete! Found ${result.results.issues.length} issues.`
    });

  } catch (error) {
    console.error('Accessibility audit error:', error);
    figma.ui.postMessage({
      type: 'error',
      message: 'Accessibility audit failed: ' + error.message
    });
  }
}

/**
 * Perform design system audit on selected frame
 */
async function performDesignSystemAudit(msg) {
  try {
    const { teamId } = msg;
    const selection = figma.currentPage.selection;
    
    if (selection.length === 0) {
      throw new Error('Please select a frame to audit');
    }

    const frame = selection[0];
    console.log('🎨 Starting design system audit on:', frame.name);

    // Extract frame data
    const frameData = await extractFrameData(frame);
    
    // Send to backend for analysis
    const response = await fetch('https://buddy-lac-five.vercel.app/api/audit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auditType: 'design-system',
        frameData: frameData,
        teamId: teamId,
        userId: figma.currentUser ? figma.currentUser.id : null
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Audit failed: ${error}`);
    }

    const result = await response.json();
    
    // Create comments for each issue
    await createAuditComments(frame, result.results.issues, 'design-system');
    
    figma.ui.postMessage({
      type: 'audit-complete',
      auditType: 'design-system',
      summary: result.results.summary,
      issueCount: result.results.issues.length,
      message: `✅ Design system audit complete! Found ${result.results.issues.length} issues.`
    });

  } catch (error) {
    console.error('Design system audit error:', error);
    figma.ui.postMessage({
      type: 'error',
      message: 'Design system audit failed: ' + error.message
    });
  }
}

/**
 * Perform both accessibility and design system audits
 */
async function performBothAudits(msg) {
  try {
    const { teamId, customRules = [] } = msg;
    const selection = figma.currentPage.selection;
    
    if (selection.length === 0) {
      throw new Error('Please select a frame to audit');
    }

    const frame = selection[0];
    console.log('🔍🎨 Starting combined audit on:', frame.name);

    // Extract frame data
    const frameData = await extractFrameData(frame);
    
    // Send to backend for analysis
    const response = await fetch('https://buddy-lac-five.vercel.app/api/audit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auditType: 'both',
        frameData: frameData,
        teamId: teamId,
        userId: figma.currentUser ? figma.currentUser.id : null,
        customRules: customRules
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Audit failed: ${error}`);
    }

    const result = await response.json();
    
    // Create comments for each issue
    await createAuditComments(frame, result.results.combined, 'combined');
    
    figma.ui.postMessage({
      type: 'audit-complete',
      auditType: 'both',
      summary: {
        total: result.results.combined.length,
        accessibility: result.results.accessibility.summary,
        designSystem: result.results.designSystem.summary
      },
      issueCount: result.results.combined.length,
      message: `✅ Combined audit complete! Found ${result.results.combined.length} total issues.`
    });

  } catch (error) {
    console.error('Combined audit error:', error);
    figma.ui.postMessage({
      type: 'error',
      message: 'Combined audit failed: ' + error.message
    });
  }
}

/**
 * Get team configuration
 */
async function getTeamConfiguration(msg) {
  try {
    const { teamId } = msg;
    
    const response = await fetch(`https://buddy-lac-five.vercel.app/api/config?action=get&teamId=${teamId}`);
    
    if (!response.ok) {
      throw new Error('Failed to get configuration');
    }

    const result = await response.json();
    
    figma.ui.postMessage({
      type: 'config-loaded',
      config: result.config
    });

  } catch (error) {
    console.error('Config loading error:', error);
    figma.ui.postMessage({
      type: 'error',
      message: 'Failed to load configuration: ' + error.message
    });
  }
}

/**
 * Extract comprehensive data from a frame
 */
async function extractFrameData(frame) {
  const data = {
    id: frame.id,
    name: frame.name,
    type: frame.type,
    width: frame.width,
    height: frame.height,
    x: frame.x,
    y: frame.y,
    fills: frame.fills,
    effects: frame.effects,
    cornerRadius: frame.cornerRadius,
    opacity: frame.opacity,
    visible: frame.visible,
    locked: frame.locked,
    children: []
  };

  // Add layout information for frames
  if (frame.type === 'FRAME') {
    data.layoutMode = frame.layoutMode;
    data.primaryAxisAlignItems = frame.primaryAxisAlignItems;
    data.counterAxisAlignItems = frame.counterAxisAlignItems;
    data.primaryAxisSizingMode = frame.primaryAxisSizingMode;
    data.counterAxisSizingMode = frame.counterAxisSizingMode;
    data.paddingLeft = frame.paddingLeft;
    data.paddingRight = frame.paddingRight;
    data.paddingTop = frame.paddingTop;
    data.paddingBottom = frame.paddingBottom;
    data.itemSpacing = frame.itemSpacing;
  }

  // Add text-specific information
  if (frame.type === 'TEXT') {
    data.fontSize = frame.fontSize;
    data.fontName = frame.fontName;
    data.fontWeight = frame.fontWeight;
    data.textAlignHorizontal = frame.textAlignHorizontal;
    data.textAlignVertical = frame.textAlignVertical;
    data.textAutoResize = frame.textAutoResize;
    data.textType = 'body'; // Default, could be enhanced
  }

  // Recursively extract children
  if (frame.children && frame.children.length > 0) {
    for (const child of frame.children) {
      const childData = await extractFrameData(child);
      data.children.push(childData);
    }
  }

  return data;
}

/**
 * Create comments for audit issues
 */
async function createAuditComments(frame, issues, auditType) {
  console.log(`Creating ${issues.length} comments for ${auditType} audit`);
  
  // Load fonts before creating any text content
  try {
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  } catch (error) {
    console.log('Font loading failed:', error);
  }
  
  // Check if we can create comments at all
  let canCreateComments = true;
  try {
    const testComment = figma.createComment();
    testComment.remove(); // Remove the test comment
  } catch (error) {
    console.log('Comments not available:', error.message);
    canCreateComments = false;
  }
  
  if (!canCreateComments) {
    // Fallback: create visual bubble frames
    await createVisualBubbles(frame, issues, auditType);
    
    // Also show detailed results in UI
    figma.ui.postMessage({
      type: 'audit-results-detailed',
      auditType: auditType,
      issues: issues,
      message: `Comments not available. Created ${issues.length} visual bubbles on canvas.`
    });
    return;
  }
  
  for (const issue of issues) {
    try {
      // Find the target element for the comment
      let targetElement = frame;
      
      if (issue.elementId && issue.elementId !== frame.id) {
        const element = figma.getNodeById(issue.elementId);
        if (element) {
          targetElement = element;
        }
      }

      // Create the comment
      const comment = figma.createComment();
      
      // Format the comment message
      const icon = getIssueIcon(issue.type, issue.severity);
      const wcagRef = issue.wcagCriterion ? ` (WCAG ${issue.wcagCriterion})` : '';
      
      comment.message = `${icon} **${auditType.toUpperCase()} ISSUE**${wcagRef}\n\n` +
                       `**${issue.type.toUpperCase()}** - ${issue.severity.toUpperCase()}\n\n` +
                       `${issue.message}\n\n` +
                       `**Suggestion:** ${issue.suggestion}\n\n` +
                       `---\n*Found by Design System & Accessibility Audit*`;
      
      comment.parent = targetElement;
      
      // Position comment near the element
      if (issue.position) {
        comment.x = issue.position.x + (targetElement.width || 0) + 20;
        comment.y = issue.position.y;
      } else {
        comment.x = targetElement.x + (targetElement.width || 0) + 20;
        comment.y = targetElement.y;
      }

      console.log(`Created comment for ${issue.type} issue on ${targetElement.name}`);
      
    } catch (error) {
      console.error('Error creating comment:', error);
    }
  }
}

/**
 * Create visual bubble frames for audit issues
 */
async function createVisualBubbles(frame, issues, auditType) {
  console.log(`Creating ${issues.length} visual bubbles for ${auditType} audit`);
  
  // Load fonts before creating text nodes
  try {
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    await figma.loadFontAsync({ family: "Inter", style: "Medium" });
    await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
  } catch (error) {
    console.log('Font loading failed, using default fonts:', error);
  }
  
  // Create a container frame for all bubbles
  const container = figma.createFrame();
  container.name = `Audit Results - ${auditType.toUpperCase()}`;
  container.fills = []; // Transparent
  container.layoutMode = 'VERTICAL';
  container.primaryAxisAlignItems = 'MIN';
  container.counterAxisAlignItems = 'MIN';
  container.itemSpacing = 12;
  container.paddingTop = 20;
  container.paddingBottom = 20;
  container.paddingLeft = 20;
  container.paddingRight = 20;
  
  // Position container next to the audited frame
  container.x = frame.x + frame.width + 30;
  container.y = frame.y;
  
  for (let i = 0; i < issues.length; i++) {
    const issue = issues[i];
    
    // Create bubble frame
    const bubble = figma.createFrame();
    bubble.name = `Issue ${i + 1}: ${issue.type}`;
    
    // Style the bubble
    const severityColors = {
      'error': { r: 0.2, g: 0.1, b: 0.1 }, // Dark red
      'warning': { r: 0.2, g: 0.15, b: 0.1 }, // Dark orange
      'info': { r: 0.1, g: 0.15, b: 0.2 } // Dark blue
    };
    
    bubble.fills = [{
      type: 'SOLID',
      color: severityColors[issue.severity] || severityColors['info']
    }];
    
    bubble.cornerRadius = 12;
    bubble.layoutMode = 'VERTICAL';
    bubble.primaryAxisAlignItems = 'MIN';
    bubble.counterAxisAlignItems = 'MIN';
    bubble.itemSpacing = 8;
    bubble.paddingTop = 12;
    bubble.paddingBottom = 12;
    bubble.paddingLeft = 16;
    bubble.paddingRight = 16;
    bubble.resize(280, 1); // Auto height
    
    // Create header with icon and type
    const header = figma.createFrame();
    header.name = 'Header';
    header.fills = []; // Transparent
    header.layoutMode = 'HORIZONTAL';
    header.primaryAxisAlignItems = 'MIN';
    header.counterAxisAlignItems = 'CENTER';
    header.itemSpacing = 8;
    header.resize(248, 1);
    
    // Icon text
    const iconText = figma.createText();
    iconText.characters = getIssueIcon(issue.type, issue.severity);
    iconText.fontSize = 16;
    iconText.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    iconText.resize(20, 20);
    
    // Type text
    const typeText = figma.createText();
    typeText.characters = issue.type.toUpperCase();
    typeText.fontSize = 12;
    typeText.fontWeight = 600;
    typeText.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    typeText.resize(100, 16);
    
    // Severity badge
    const severityText = figma.createText();
    severityText.characters = issue.severity.toUpperCase();
    severityText.fontSize = 10;
    severityText.fontWeight = 600;
    severityText.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    severityText.resize(60, 14);
    
    // Add elements to header
    header.appendChild(iconText);
    header.appendChild(typeText);
    header.appendChild(severityText);
    
    // Create message text
    const messageText = figma.createText();
    messageText.characters = issue.message;
    messageText.fontSize = 11;
    messageText.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }];
    messageText.resize(248, 1);
    messageText.textAutoResize = 'HEIGHT';
    
    // Create suggestion text
    const suggestionText = figma.createText();
    suggestionText.characters = `💡 Suggestion: ${issue.suggestion}`;
    suggestionText.fontSize = 10;
    suggestionText.fills = [{ type: 'SOLID', color: { r: 0.7, g: 0.7, b: 0.7 } }];
    suggestionText.resize(248, 1);
    suggestionText.textAutoResize = 'HEIGHT';
    
    // Add elements to bubble
    bubble.appendChild(header);
    bubble.appendChild(messageText);
    bubble.appendChild(suggestionText);
    
    // Add bubble to container
    container.appendChild(bubble);
  }
  
  // Add container to the page
  figma.currentPage.appendChild(container);
  
  console.log(`Created visual bubble container with ${issues.length} bubbles`);
}

/**
 * Get icon for issue type and severity
 */
function getIssueIcon(type, severity) {
  const icons = {
    'contrast': '🎨',
    'text-size': '📝',
    'touch-target': '👆',
    'alt-text': '🖼️',
    'visibility': '👁️',
    'design-system': '🎯',
    'color': '🌈',
    'spacing': '📏',
    'typography': '✍️',
    'layout': '📐',
    'accessibility': '♿',
    'custom': '⚙️'
  };

  const severityIcons = {
    'error': '❌',
    'warning': '⚠️',
    'info': 'ℹ️'
  };

  const typeIcon = icons[type] || '🔍';
  const severityIcon = severityIcons[severity] || '';
  
  return `${severityIcon} ${typeIcon}`;
}
// Design System & Accessibility Audit Plugin
// Performs audits on selected frames and creates targeted comments

console.log('🔍 Design System & Accessibility Audit Plugin initialized!');

// Show the plugin UI
figma.showUI(__html__, { width: 450, height: 600 });

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
    const response = await fetch('https://buddy-fz1y2s7ml-charenkoneti-cyberqpcoms-projects.vercel.app/api/audit', {
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
    const response = await fetch('https://buddy-fz1y2s7ml-charenkoneti-cyberqpcoms-projects.vercel.app/api/audit', {
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
    const response = await fetch('https://buddy-fz1y2s7ml-charenkoneti-cyberqpcoms-projects.vercel.app/api/audit', {
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
    
    const response = await fetch(`https://buddy-fz1y2s7ml-charenkoneti-cyberqpcoms-projects.vercel.app/api/config?action=get&teamId=${teamId}`);
    
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
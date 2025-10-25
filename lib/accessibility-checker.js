/**
 * Accessibility Checker - Rule-based WCAG 2.1 Compliance
 * Performs automated accessibility audits on Figma elements
 */

/**
 * Perform complete accessibility audit on an element
 */
export function auditElement(elementData, wcagLevel = 'AA', customRules = []) {
  const issues = [];

  // Run standard WCAG checks
  issues.push(...checkColorContrast(elementData, wcagLevel));
  issues.push(...checkTextSize(elementData));
  issues.push(...checkTouchTargets(elementData));
  issues.push(...checkAltText(elementData));
  issues.push(...checkVisibility(elementData));

  // Run custom rules if provided
  if (customRules.length > 0) {
    issues.push(...runCustomRules(elementData, customRules));
  }

  return issues;
}

/**
 * Check color contrast ratios (WCAG 2.1)
 * Level AA: 4.5:1 for normal text, 3:1 for large text
 * Level AAA: 7:1 for normal text, 4.5:1 for large text
 */
function checkColorContrast(elementData, wcagLevel) {
  const issues = [];
  
  if (elementData.type !== 'TEXT' && !elementData.fills) {
    return issues;
  }

  // Extract colors from fills
  const textColor = extractColor(elementData.fills);
  const backgroundColor = extractColor(elementData.background);

  if (!textColor || !backgroundColor) {
    return issues;
  }

  const contrastRatio = calculateContrastRatio(textColor, backgroundColor);
  const isLargeText = elementData.fontSize >= 18 || (elementData.fontSize >= 14 && elementData.fontWeight >= 700);

  // Determine required contrast based on WCAG level
  const requiredContrast = wcagLevel === 'AAA' 
    ? (isLargeText ? 4.5 : 7.0)
    : (isLargeText ? 3.0 : 4.5);

  if (contrastRatio < requiredContrast) {
    issues.push({
      type: 'contrast',
      severity: 'error',
      element: elementData.name,
      elementId: elementData.id,
      message: `Low contrast ratio: ${contrastRatio.toFixed(2)}:1 (required: ${requiredContrast}:1 for WCAG ${wcagLevel})`,
      suggestion: `Increase contrast between text and background. Current: ${contrastRatio.toFixed(2)}:1, Required: ${requiredContrast}:1`,
      wcagCriterion: '1.4.3',
      position: { x: elementData.x, y: elementData.y }
    });
  }

  return issues;
}

/**
 * Check text size for readability
 */
function checkTextSize(elementData) {
  const issues = [];

  if (elementData.type !== 'TEXT') {
    return issues;
  }

  const fontSize = elementData.fontSize || 12;

  // Minimum recommended size: 16px for body text, 14px absolute minimum
  if (fontSize < 14) {
    issues.push({
      type: 'text-size',
      severity: 'warning',
      element: elementData.name,
      elementId: elementData.id,
      message: `Text size too small: ${fontSize}px (minimum: 14px)`,
      suggestion: `Increase font size to at least 14px, ideally 16px for body text`,
      wcagCriterion: '1.4.4',
      position: { x: elementData.x, y: elementData.y }
    });
  } else if (fontSize < 16 && elementData.textType === 'body') {
    issues.push({
      type: 'text-size',
      severity: 'info',
      element: elementData.name,
      elementId: elementData.id,
      message: `Body text could be larger: ${fontSize}px (recommended: 16px)`,
      suggestion: `Consider using 16px for better readability`,
      wcagCriterion: '1.4.4',
      position: { x: elementData.x, y: elementData.y }
    });
  }

  return issues;
}

/**
 * Check touch target sizes for mobile accessibility
 * WCAG 2.5.5: Minimum 44x44px touch targets
 */
function checkTouchTargets(elementData) {
  const issues = [];

  // Check interactive elements (buttons, links, inputs)
  const interactiveTypes = ['BUTTON', 'COMPONENT', 'INSTANCE'];
  const isInteractive = interactiveTypes.includes(elementData.type) || 
                       elementData.name.toLowerCase().includes('button') ||
                       elementData.name.toLowerCase().includes('link') ||
                       elementData.name.toLowerCase().includes('input');

  if (!isInteractive) {
    return issues;
  }

  const minSize = 44;
  const width = elementData.width || 0;
  const height = elementData.height || 0;

  if (width < minSize || height < minSize) {
    issues.push({
      type: 'touch-target',
      severity: 'error',
      element: elementData.name,
      elementId: elementData.id,
      message: `Touch target too small: ${Math.round(width)}x${Math.round(height)}px (minimum: 44x44px)`,
      suggestion: `Increase size to at least 44x44px for mobile accessibility`,
      wcagCriterion: '2.5.5',
      position: { x: elementData.x, y: elementData.y }
    });
  }

  return issues;
}

/**
 * Check for alt text on images
 */
function checkAltText(elementData) {
  const issues = [];

  // Check if element is an image or has image fills
  const hasImageFill = elementData.fills && elementData.fills.some(fill => fill.type === 'IMAGE');
  const isImageNode = elementData.type === 'RECTANGLE' && hasImageFill;

  if (!isImageNode) {
    return issues;
  }

  // In Figma, alt text is typically stored in the element name or description
  const hasAltText = elementData.description || 
                    (elementData.name && !elementData.name.startsWith('Rectangle') && !elementData.name.startsWith('Image'));

  if (!hasAltText) {
    issues.push({
      type: 'alt-text',
      severity: 'error',
      element: elementData.name,
      elementId: elementData.id,
      message: `Image missing alt text`,
      suggestion: `Add descriptive text in the element name or description for screen readers`,
      wcagCriterion: '1.1.1',
      position: { x: elementData.x, y: elementData.y }
    });
  }

  return issues;
}

/**
 * Check element visibility and opacity
 */
function checkVisibility(elementData) {
  const issues = [];

  if (elementData.visible === false) {
    issues.push({
      type: 'visibility',
      severity: 'info',
      element: elementData.name,
      elementId: elementData.id,
      message: `Element is hidden`,
      suggestion: `Hidden elements are not accessible to screen readers`,
      wcagCriterion: '4.1.2',
      position: { x: elementData.x, y: elementData.y }
    });
  }

  if (elementData.opacity < 0.3) {
    issues.push({
      type: 'visibility',
      severity: 'warning',
      element: elementData.name,
      elementId: elementData.id,
      message: `Low opacity: ${Math.round(elementData.opacity * 100)}%`,
      suggestion: `Very low opacity may cause readability issues`,
      wcagCriterion: '1.4.3',
      position: { x: elementData.x, y: elementData.y }
    });
  }

  return issues;
}

/**
 * Run custom accessibility rules
 */
function runCustomRules(elementData, customRules) {
  const issues = [];

  customRules.forEach(rule => {
    try {
      // Custom rule format: { type, check: function, message, severity }
      if (rule.check && typeof rule.check === 'function') {
        const result = rule.check(elementData);
        if (result === false) {
          issues.push({
            type: rule.type || 'custom',
            severity: rule.severity || 'info',
            element: elementData.name,
            elementId: elementData.id,
            message: rule.message || 'Custom rule failed',
            suggestion: rule.suggestion || '',
            wcagCriterion: rule.wcagCriterion || 'custom',
            position: { x: elementData.x, y: elementData.y }
          });
        }
      }
    } catch (error) {
      console.error('Error running custom rule:', error);
    }
  });

  return issues;
}

/**
 * Calculate contrast ratio between two colors
 * Based on WCAG 2.1 formula
 */
function calculateContrastRatio(color1, color2) {
  const l1 = getRelativeLuminance(color1);
  const l2 = getRelativeLuminance(color2);
  
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Calculate relative luminance of a color
 */
function getRelativeLuminance(color) {
  const { r, g, b } = color;
  
  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;
  
  const rLinear = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const gLinear = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const bLinear = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);
  
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Extract RGB color from Figma fill/paint
 */
function extractColor(fills) {
  if (!fills || !Array.isArray(fills) || fills.length === 0) {
    return null;
  }

  const solidFill = fills.find(fill => fill.type === 'SOLID' && fill.visible !== false);
  if (!solidFill || !solidFill.color) {
    return null;
  }

  return {
    r: Math.round(solidFill.color.r * 255),
    g: Math.round(solidFill.color.g * 255),
    b: Math.round(solidFill.color.b * 255)
  };
}

/**
 * Generate accessibility audit summary
 */
export function generateAuditSummary(issues) {
  const summary = {
    total: issues.length,
    errors: issues.filter(i => i.severity === 'error').length,
    warnings: issues.filter(i => i.severity === 'warning').length,
    info: issues.filter(i => i.severity === 'info').length,
    byType: {}
  };

  issues.forEach(issue => {
    if (!summary.byType[issue.type]) {
      summary.byType[issue.type] = 0;
    }
    summary.byType[issue.type]++;
  });

  return summary;
}

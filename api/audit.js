/**
 * Audit API - Handles Design System and Accessibility Audits
 * Processes frame data and returns structured audit results
 */

import { createClient } from '../lib/db.js';
import { generateAIAnalysis } from '../lib/openai.js';
import { auditElement, generateAuditSummary } from '../lib/accessibility-checker.js';
import { fetchDesignSystem } from '../lib/design-system-fetcher.js';

const supabase = createClient();

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { auditType, frameData, teamId, userId, customRules } = req.body;

    if (!auditType || !frameData) {
      return res.status(400).json({ 
        error: 'Missing required fields: auditType, frameData' 
      });
    }

    console.log(`Starting ${auditType} audit for team ${teamId}`);

    let auditResults;

    switch (auditType) {
      case 'accessibility':
        auditResults = await performAccessibilityAudit(frameData, customRules);
        break;
      case 'design-system':
        auditResults = await performDesignSystemAudit(frameData, teamId, userId);
        break;
      case 'both':
        const [accessibilityResults, designSystemResults] = await Promise.all([
          performAccessibilityAudit(frameData, customRules),
          performDesignSystemAudit(frameData, teamId, userId)
        ]);
        auditResults = {
          accessibility: accessibilityResults,
          designSystem: designSystemResults,
          combined: [...accessibilityResults.issues, ...designSystemResults.issues]
        };
        break;
      default:
        return res.status(400).json({ 
          error: 'Invalid audit type. Use: accessibility, design-system, or both' 
        });
    }

    // Log audit to database
    await logAudit(userId, teamId, auditType, auditResults);

    res.status(200).json({
      success: true,
      auditType,
      results: auditResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Audit API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

/**
 * Perform accessibility audit on frame data
 */
async function performAccessibilityAudit(frameData, customRules = []) {
  const issues = [];
  const wcagLevel = customRules.find(rule => rule.type === 'wcagLevel')?.value || 'AA';

  // Audit the main frame
  const frameIssues = auditElement(frameData, wcagLevel, customRules);
  issues.push(...frameIssues);

  // Audit all child elements
  if (frameData.children && Array.isArray(frameData.children)) {
    for (const child of frameData.children) {
      const childIssues = auditElement(child, wcagLevel, customRules);
      issues.push(...childIssues);

      // Recursively audit nested children
      if (child.children && Array.isArray(child.children)) {
        const nestedIssues = await auditNestedElements(child.children, wcagLevel, customRules);
        issues.push(...nestedIssues);
      }
    }
  }

  const summary = generateAuditSummary(issues);

  return {
    issues,
    summary,
    wcagLevel,
    elementCount: countElements(frameData),
    auditTime: new Date().toISOString()
  };
}

/**
 * Perform design system audit on frame data
 */
async function performDesignSystemAudit(frameData, teamId, userId) {
  try {
    // Get team's design system configuration
    const config = await getTeamConfig(teamId);
    
    if (!config) {
      return {
        issues: [{
          type: 'configuration',
          severity: 'warning',
          element: 'system',
          message: 'No design system configuration found',
          suggestion: 'Please configure your design system URL or guidelines first'
        }],
        summary: { total: 1, errors: 0, warnings: 1, info: 0 },
        designSystem: null,
        auditTime: new Date().toISOString()
      };
    }

    // Fetch design system if URL is provided
    let designSystem = null;
    if (config.design_system_url) {
      try {
        designSystem = await fetchDesignSystem(config.design_system_url);
      } catch (error) {
        console.error('Failed to fetch design system:', error);
        designSystem = null;
      }
    }

    // Analyze frame against design system
    const analysis = await analyzeDesignSystemConsistency(frameData, config, designSystem);
    
    return {
      issues: analysis.issues,
      summary: analysis.summary,
      designSystem: designSystem ? {
        name: designSystem.name,
        version: designSystem.version,
        componentCount: designSystem.components.length
      } : null,
      config: {
        url: config.design_system_url,
        hasCustomRules: config.custom_rules && config.custom_rules.length > 0
      },
      auditTime: new Date().toISOString()
    };

  } catch (error) {
    console.error('Design system audit error:', error);
    return {
      issues: [{
        type: 'error',
        severity: 'error',
        element: 'system',
        message: 'Design system audit failed',
        suggestion: 'Please check your design system configuration'
      }],
      summary: { total: 1, errors: 1, warnings: 0, info: 0 },
      designSystem: null,
      auditTime: new Date().toISOString()
    };
  }
}

/**
 * Analyze design system consistency using AI
 */
async function analyzeDesignSystemConsistency(frameData, config, designSystem) {
  const issues = [];
  
  // Build context for AI analysis
  let systemContext = '';
  
  if (designSystem) {
    systemContext = `Design System: ${designSystem.name} ${designSystem.version}
Components: ${designSystem.components.join(', ')}
Color Tokens: ${Object.keys(designSystem.tokens.colors).join(', ')}
Spacing Tokens: ${Object.keys(designSystem.tokens.spacing).join(', ')}`;
  }
  
  if (config.design_system_text) {
    systemContext += `\nCustom Guidelines: ${config.design_system_text}`;
  }

  // Analyze each element
  const elementsToAnalyze = [frameData, ...(frameData.children || [])];
  
  for (const element of elementsToAnalyze) {
    try {
      const elementAnalysis = await analyzeElementConsistency(element, systemContext, config);
      issues.push(...elementAnalysis);
    } catch (error) {
      console.error('Error analyzing element:', error);
    }
  }

  const summary = generateAuditSummary(issues);

  return { issues, summary };
}

/**
 * Analyze individual element for design system consistency
 */
async function analyzeElementConsistency(element, systemContext, config) {
  const issues = [];
  
  // Build AI prompt for design system analysis
  const prompt = `Analyze this Figma element for design system consistency:

Element: ${element.name}
Type: ${element.type}
Width: ${element.width}px
Height: ${element.height}px
Fills: ${JSON.stringify(element.fills || [])}
Corner Radius: ${element.cornerRadius || 0}px

${systemContext}

Check for:
1. Component naming conventions
2. Spacing consistency (8px grid system)
3. Color usage (design tokens)
4. Typography consistency
5. Border radius consistency
6. Layout patterns

Return specific issues found, or "No issues found" if everything looks consistent.`;

  try {
    const aiResponse = await generateAIAnalysis(
      'You are a design system expert. Analyze Figma elements for consistency with established design systems.',
      prompt
    );

    // Parse AI response for issues
    if (aiResponse && !aiResponse.toLowerCase().includes('no issues found')) {
      issues.push({
        type: 'design-system',
        severity: 'warning',
        element: element.name,
        elementId: element.id,
        message: aiResponse,
        suggestion: 'Review design system guidelines and update element accordingly',
        position: { x: element.x, y: element.y }
      });
    }
  } catch (error) {
    console.error('AI analysis error:', error);
  }

  return issues;
}

/**
 * Recursively audit nested elements
 */
async function auditNestedElements(elements, wcagLevel, customRules) {
  const issues = [];
  
  for (const element of elements) {
    const elementIssues = auditElement(element, wcagLevel, customRules);
    issues.push(...elementIssues);
    
    if (element.children && Array.isArray(element.children)) {
      const nestedIssues = await auditNestedElements(element.children, wcagLevel, customRules);
      issues.push(...nestedIssues);
    }
  }
  
  return issues;
}

/**
 * Count total elements in frame
 */
function countElements(frameData) {
  let count = 1; // Count the frame itself
  
  if (frameData.children && Array.isArray(frameData.children)) {
    for (const child of frameData.children) {
      count += countElements(child);
    }
  }
  
  return count;
}

/**
 * Get team configuration from database
 */
async function getTeamConfig(teamId) {
  try {
    const { data, error } = await supabase
      .from('team_configs')
      .select('*')
      .eq('team_id', teamId)
      .single();

    if (error) {
      console.error('Error fetching team config:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Database error:', error);
    return null;
  }
}

/**
 * Log audit to database
 */
async function logAudit(userId, teamId, auditType, results) {
  try {
    const issueCount = results.issues ? results.issues.length : 
                      (results.combined ? results.combined.length : 0);

    await supabase
      .from('audit_history')
      .insert({
        user_id: userId,
        team_id: teamId,
        audit_type: auditType,
        issues_found: issueCount,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error logging audit:', error);
    // Don't fail the audit if logging fails
  }
}

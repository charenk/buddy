/**
 * High-Performance Context Management System
 * Optimized for speed with pre-built templates and caching
 */

export interface ResponseStyle {
  length: 'brief' | 'detailed' | 'comprehensive';
  tone: 'casual' | 'professional' | 'encouraging' | 'critical';
  focus: string[];
  domain: string;
  language: string;
}

export interface CustomPrompts {
  systemPrompt?: string;
  responseTemplate?: string;
  focusInstructions?: string;
}

// Pre-built response templates for maximum speed
const RESPONSE_TEMPLATES = {
  brief: {
    professional: `Here are 3 key improvements for this design:

1. **{focus1}** - {point1}
2. **{focus2}** - {point2}  
3. **{focus3}** - {point3}

{domain_advice}`,
    
    casual: `Quick thoughts on your design:

• {point1}
• {point2}
• {point3}

{domain_advice}`,
    
    encouraging: `Great work! Here's what I noticed:

✨ **What's working:** {strength}
🚀 **Quick wins:** {point1}, {point2}
💡 **Next level:** {point3}

{domain_advice}`,
    
    critical: `Design analysis:

❌ **Issues:** {point1}, {point2}
⚠️ **Concerns:** {point3}
✅ **Fix:** {solution}

{domain_advice}`
  },
  
  detailed: {
    professional: `## Design Analysis

### Strengths
{strengths}

### Areas for Improvement
{improvements}

### Recommendations
{recommendations}

### Next Steps
{next_steps}`,
    
    casual: `Hey! Here's my detailed feedback:

**What I love:**
{strengths}

**What could be better:**
{improvements}

**My suggestions:**
{recommendations}

**Try this next:**
{next_steps}`,
    
    encouraging: `Awesome design! Here's my breakdown:

**You nailed it with:**
{strengths}

**Let's make it even better:**
{improvements}

**Here's how:**
{recommendations}

**Your next moves:**
{next_steps}`,
    
    critical: `## Critical Design Review

**Major Issues:**
{critical_issues}

**Secondary Problems:**
{secondary_issues}

**Required Fixes:**
{required_fixes}

**Priority Actions:**
{priority_actions}`
  },
  
  comprehensive: {
    professional: `# Comprehensive Design Analysis

## Executive Summary
{executive_summary}

## User Experience Analysis
{ux_analysis}

## Visual Design Review
{visual_analysis}

## Technical Considerations
{technical_analysis}

## Accessibility Assessment
{accessibility_analysis}

## Performance Impact
{performance_analysis}

## Recommendations by Priority
{priority_recommendations}

## Implementation Roadmap
{implementation_roadmap}`,
    
    casual: `# Complete Design Breakdown

Hey! I've done a deep dive into your design. Here's everything:

**The Big Picture:**
{executive_summary}

**How it feels to use:**
{ux_analysis}

**How it looks:**
{visual_analysis}

**Behind the scenes:**
{technical_analysis}

**For everyone:**
{accessibility_analysis}

**Speed check:**
{performance_analysis}

**What to do first:**
{priority_recommendations}

**Your action plan:**
{implementation_roadmap}`,
    
    encouraging: `# Your Design Deep Dive ✨

**You're doing amazing work!** Here's my complete analysis:

**What's absolutely brilliant:**
{executive_summary}

**User experience wins:**
{ux_analysis}

**Visual design highlights:**
{visual_analysis}

**Technical excellence:**
{technical_analysis}

**Accessibility wins:**
{accessibility_analysis}

**Performance wins:**
{performance_analysis}

**Level up opportunities:**
{priority_recommendations}

**Your growth path:**
{implementation_roadmap}`,
    
    critical: `# Critical Design Audit

## Executive Summary
{executive_summary}

## Critical Issues (Must Fix)
{critical_issues}

## Major Problems (High Priority)
{major_problems}

## Design System Violations
{design_system_violations}

## User Experience Failures
{ux_failures}

## Technical Debt
{technical_debt}

## Accessibility Barriers
{accessibility_barriers}

## Performance Issues
{performance_issues}

## Emergency Actions Required
{emergency_actions}

## Recovery Plan
{recovery_plan}`
  }
};

// Domain-specific advice templates
const DOMAIN_ADVICE = {
  mobile_apps: "For mobile apps, consider thumb-friendly interactions and one-handed usage patterns.",
  web_apps: "For web apps, focus on responsive design and cross-browser compatibility.",
  enterprise: "For enterprise software, prioritize efficiency and power-user features.",
  ecommerce: "For e-commerce, optimize for conversion and trust signals.",
  saas: "For SaaS products, emphasize onboarding and feature discovery.",
  general: "Consider user needs, business goals, and technical constraints."
};

// Focus area mappings for AI prompts
const FOCUS_MAPPINGS = {
  ux: "user experience, usability, and user flow",
  visual: "visual design, aesthetics, and brand consistency", 
  accessibility: "accessibility, inclusive design, and usability for all users",
  performance: "performance, loading times, and technical optimization",
  content: "content strategy, copy, and information architecture",
  interaction: "interactions, animations, and micro-interactions"
};

/**
 * Build contextual system prompt based on user preferences
 */
export function buildContextualPrompt(
  responseStyle: ResponseStyle,
  customPrompts?: CustomPrompts
): string {
  const { length, tone, focus, domain, language } = responseStyle;
  
  // Use custom system prompt if provided
  if (customPrompts?.systemPrompt) {
    return customPrompts.systemPrompt;
  }
  
  // Build focus instructions
  const focusInstructions = focus
    .map(f => FOCUS_MAPPINGS[f] || f)
    .join(', ');
  
  // Build base prompt
  let systemPrompt = `You are an expert design critic specializing in ${focusInstructions}. `;
  
  // Add tone instructions
  switch (tone) {
    case 'casual':
      systemPrompt += "Use a friendly, conversational tone. Be encouraging and supportive. ";
      break;
    case 'professional':
      systemPrompt += "Use a formal, professional tone. Be objective and thorough. ";
      break;
    case 'encouraging':
      systemPrompt += "Use an encouraging, positive tone. Focus on growth and improvement. ";
      break;
    case 'critical':
      systemPrompt += "Use a direct, critical tone. Be honest about problems and solutions. ";
      break;
  }
  
  // Add length instructions
  switch (length) {
    case 'brief':
      systemPrompt += "Provide 2-3 key points maximum. Be concise and actionable. ";
      break;
    case 'detailed':
      systemPrompt += "Provide 5-7 detailed points with explanations and examples. ";
      break;
    case 'comprehensive':
      systemPrompt += "Provide a thorough analysis covering all aspects of the design. ";
      break;
  }
  
  // Add domain expertise
  if (domain !== 'general') {
    systemPrompt += `Focus specifically on ${domain} design principles and best practices. `;
  }
  
  // Add language instruction
  if (language !== 'en') {
    systemPrompt += `Respond in ${language}. `;
  }
  
  // Add response format instruction
  systemPrompt += "Use the provided response template format. ";
  
  return systemPrompt;
}

/**
 * Get response template based on user preferences
 */
export function getResponseTemplate(
  responseStyle: ResponseStyle,
  customPrompts?: CustomPrompts
): string {
  const { length, tone } = responseStyle;
  
  // Use custom template if provided
  if (customPrompts?.responseTemplate) {
    return customPrompts.responseTemplate;
  }
  
  // Return pre-built template
  return RESPONSE_TEMPLATES[length]?.[tone] || RESPONSE_TEMPLATES.detailed.professional;
}

/**
 * Get domain-specific advice
 */
export function getDomainAdvice(domain: string): string {
  return DOMAIN_ADVICE[domain] || DOMAIN_ADVICE.general;
}

/**
 * Build complete AI prompt with context
 */
export function buildAIPrompt(
  userMessage: string,
  responseStyle: ResponseStyle,
  customPrompts?: CustomPrompts
): {
  systemPrompt: string;
  userPrompt: string;
  responseTemplate: string;
  maxTokens: number;
  temperature: number;
} {
  const systemPrompt = buildContextualPrompt(responseStyle, customPrompts);
  const responseTemplate = getResponseTemplate(responseStyle, customPrompts);
  const domainAdvice = getDomainAdvice(responseStyle.domain);
  
  // Build user prompt with context
  const userPrompt = `Analyze this design comment: "${userMessage}"

Focus on: ${responseStyle.focus.join(', ')}
Domain: ${responseStyle.domain}
Tone: ${responseStyle.tone}
Length: ${responseStyle.length}

${domainAdvice}

Use this response template:
${responseTemplate}`;
  
  // Set token limits based on length preference
  const maxTokens = {
    brief: 150,
    detailed: 400,
    comprehensive: 800
  }[responseStyle.length] || 400;
  
  // Set temperature based on tone
  const temperature = {
    casual: 0.7,
    professional: 0.3,
    encouraging: 0.6,
    critical: 0.4
  }[responseStyle.tone] || 0.3;
  
  return {
    systemPrompt,
    userPrompt,
    responseTemplate,
    maxTokens,
    temperature
  };
}

/**
 * Apply context to AI response (post-processing)
 */
export function applyContextToResponse(
  aiResponse: string,
  responseStyle: ResponseStyle,
  customPrompts?: CustomPrompts
): string {
  // If using custom prompts, apply any custom processing
  if (customPrompts?.focusInstructions) {
    // Apply custom focus instructions
    return `${customPrompts.focusInstructions}\n\n${aiResponse}`;
  }
  
  // Apply domain-specific advice
  const domainAdvice = getDomainAdvice(responseStyle.domain);
  if (responseStyle.length === 'brief' && !aiResponse.includes(domainAdvice)) {
    return `${aiResponse}\n\n${domainAdvice}`;
  }
  
  return aiResponse;
}

/**
 * Get default context for new users
 */
export function getDefaultContext(): ResponseStyle {
  return {
    length: 'detailed',
    tone: 'professional',
    focus: ['ux', 'visual'],
    domain: 'general',
    language: 'en'
  };
}

/**
 * Validate context settings
 */
export function validateContext(context: Partial<ResponseStyle>): ResponseStyle {
  return {
    length: ['brief', 'detailed', 'comprehensive'].includes(context.length || '') 
      ? context.length as ResponseStyle['length'] 
      : 'detailed',
    tone: ['casual', 'professional', 'encouraging', 'critical'].includes(context.tone || '') 
      ? context.tone as ResponseStyle['tone'] 
      : 'professional',
    focus: Array.isArray(context.focus) ? context.focus : ['ux', 'visual'],
    domain: context.domain || 'general',
    language: context.language || 'en'
  };
}

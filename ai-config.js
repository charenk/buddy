// AI Buddy Configuration - Customize tone, context, and domain expertise
// Modify this file to change how Buddy responds

export const AI_CONFIG = {
  // Default preferences when no keywords are detected
  defaults: {
    domain: 'general',        // general, mobile, web, enterprise, ecommerce, fintech
    focus: 'usability',       // accessibility, visual-design, usability, performance, business
    tone: 'concise',          // brief, concise, detailed, technical
    length: 'standard'        // brief, standard, comprehensive
  },

  // Domain expertise configurations
  domains: {
    'mobile': {
      name: 'Mobile App Design',
      expertise: 'iOS/Android best practices, touch interactions, mobile UX patterns',
      keywords: ['mobile', 'ios', 'android', 'app', 'touch']
    },
    'web': {
      name: 'Web Application Design', 
      expertise: 'Responsive design, browser compatibility, web performance',
      keywords: ['web', 'desktop', 'browser', 'responsive']
    },
    'enterprise': {
      name: 'Enterprise Software',
      expertise: 'Complex workflows, data visualization, admin interfaces',
      keywords: ['enterprise', 'b2b', 'saas', 'admin', 'dashboard']
    },
    'ecommerce': {
      name: 'E-commerce Design',
      expertise: 'Conversion optimization, product catalogs, checkout flows',
      keywords: ['ecommerce', 'shop', 'commerce', 'checkout', 'product']
    },
    'fintech': {
      name: 'Financial Technology',
      expertise: 'Security, compliance, financial data visualization',
      keywords: ['fintech', 'banking', 'finance', 'payment', 'security']
    }
  },

  // Focus area configurations
  focusAreas: {
    'accessibility': {
      name: 'Accessibility',
      expertise: 'WCAG 2.1 AA compliance, screen readers, keyboard navigation',
      keywords: ['accessibility', 'a11y', 'wcag', 'screen reader', 'keyboard']
    },
    'visual-design': {
      name: 'Visual Design',
      expertise: 'Typography, color theory, spacing, visual hierarchy',
      keywords: ['visual', 'ui', 'design', 'aesthetic', 'typography', 'color']
    },
    'usability': {
      name: 'User Experience',
      expertise: 'Task completion, cognitive load, information architecture',
      keywords: ['ux', 'usability', 'user-experience', 'task', 'flow']
    },
    'performance': {
      name: 'Performance',
      expertise: 'Loading times, rendering performance, user perception',
      keywords: ['performance', 'speed', 'optimization', 'loading', 'fast']
    },
    'business': {
      name: 'Business Impact',
      expertise: 'Conversion rates, user engagement, business metrics',
      keywords: ['conversion', 'business', 'metrics', 'roi', 'engagement']
    }
  },

  // Tone configurations
  tones: {
    'brief': {
      name: 'Brief',
      description: 'Under 200 words, bullet points, direct',
      maxTokens: 500
    },
    'concise': {
      name: 'Concise', 
      description: 'Under 400 words, clear headers, practical',
      maxTokens: 1000
    },
    'detailed': {
      name: 'Detailed',
      description: 'Up to 800 words, comprehensive analysis',
      maxTokens: 1500
    },
    'technical': {
      name: 'Technical',
      description: 'Technical terminology, implementation details',
      maxTokens: 1200
    }
  },

  // Response length configurations
  lengths: {
    'brief': {
      name: 'Brief',
      description: 'Top 3 issues only, skip edge cases',
      maxTokens: 500
    },
    'standard': {
      name: 'Standard',
      description: 'Main issues + 2-3 alternatives',
      maxTokens: 1000
    },
    'comprehensive': {
      name: 'Comprehensive',
      description: 'All aspects: risks, edge cases, alternatives, metrics',
      maxTokens: 2000
    }
  }
};

// Example usage patterns for users
export const USAGE_EXAMPLES = {
  'Quick mobile feedback': '@buddy brief mobile usability check',
  'Accessibility review': '@buddy accessibility analysis of this form',
  'Visual design critique': '@buddy visual design review',
  'Technical implementation': '@buddy technical mobile performance review',
  'Business impact': '@buddy business conversion optimization',
  'Comprehensive analysis': '@buddy detailed enterprise workflow review'
};

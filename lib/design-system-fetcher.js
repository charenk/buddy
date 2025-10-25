/**
 * Design System Fetcher - Fetches and processes design system documentation
 * Supports various design system formats (Chakra UI, Material UI, etc.)
 */

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const cache = new Map();

/**
 * Fetch and process design system documentation from URL
 */
export async function fetchDesignSystem(url, options = {}) {
  try {
    // Check cache first
    const cacheKey = `${url}_${options.version || 'latest'}`;
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('Using cached design system data');
      return cached.data;
    }

    console.log('Fetching design system from:', url);
    
    // Fetch the URL content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Figma-Design-System-Audit/1.0',
        'Accept': 'text/html,application/json,text/plain'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch design system: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    let content;

    if (contentType.includes('application/json')) {
      content = await response.json();
    } else {
      content = await response.text();
    }

    // Process the content based on URL pattern
    const designSystem = processDesignSystemContent(url, content, options);
    
    // Cache the result
    cache.set(cacheKey, {
      data: designSystem,
      timestamp: Date.now()
    });

    return designSystem;

  } catch (error) {
    console.error('Error fetching design system:', error);
    throw new Error(`Failed to fetch design system: ${error.message}`);
  }
}

/**
 * Process design system content based on URL patterns
 */
function processDesignSystemContent(url, content, options) {
  const urlLower = url.toLowerCase();
  
  // Detect design system type from URL
  if (urlLower.includes('chakra-ui.com')) {
    return processChakraUI(content, options);
  } else if (urlLower.includes('mui.com') || urlLower.includes('material-ui.com')) {
    return processMaterialUI(content, options);
  } else if (urlLower.includes('ant.design')) {
    return processAntDesign(content, options);
  } else if (urlLower.includes('mantine.dev')) {
    return processMantine(content, options);
  } else if (urlLower.includes('headlessui.com')) {
    return processHeadlessUI(content, options);
  } else {
    // Generic processing for unknown design systems
    return processGeneric(content, options);
  }
}

/**
 * Process Chakra UI documentation
 */
function processChakraUI(content, options) {
  const designSystem = {
    name: 'Chakra UI',
    version: 'latest',
    components: [],
    tokens: {
      colors: {},
      spacing: {},
      typography: {},
      shadows: {}
    },
    guidelines: []
  };

  if (typeof content === 'string') {
    // Extract component information from HTML
    const componentMatches = content.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi) || [];
    designSystem.components = componentMatches
      .map(match => match.replace(/<[^>]*>/g, '').trim())
      .filter(name => name.length > 0);

    // Extract color tokens
    const colorMatches = content.match(/--chakra-colors-([^:]+):\s*([^;]+)/gi) || [];
    colorMatches.forEach(match => {
      const [, name, value] = match.match(/--chakra-colors-([^:]+):\s*([^;]+)/);
      designSystem.tokens.colors[name] = value.trim();
    });

    // Extract spacing tokens
    const spacingMatches = content.match(/--chakra-space-([^:]+):\s*([^;]+)/gi) || [];
    spacingMatches.forEach(match => {
      const [, name, value] = match.match(/--chakra-space-([^:]+):\s*([^;]+)/);
      designSystem.tokens.spacing[name] = value.trim();
    });

    // Extract guidelines
    designSystem.guidelines = extractGuidelines(content, 'chakra');
  }

  return designSystem;
}

/**
 * Process Material UI documentation
 */
function processMaterialUI(content, options) {
  const designSystem = {
    name: 'Material UI',
    version: 'latest',
    components: [],
    tokens: {
      colors: {},
      spacing: {},
      typography: {},
      shadows: {}
    },
    guidelines: []
  };

  if (typeof content === 'string') {
    // Extract component information
    const componentMatches = content.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi) || [];
    designSystem.components = componentMatches
      .map(match => match.replace(/<[^>]*>/g, '').trim())
      .filter(name => name.length > 0);

    // Extract theme tokens
    const themeMatches = content.match(/theme\.([^=]+)\s*=\s*([^;]+)/gi) || [];
    themeMatches.forEach(match => {
      const [, property, value] = match.match(/theme\.([^=]+)\s*=\s*([^;]+)/);
      if (property.includes('color')) {
        designSystem.tokens.colors[property] = value.trim();
      } else if (property.includes('spacing')) {
        designSystem.tokens.spacing[property] = value.trim();
      }
    });

    designSystem.guidelines = extractGuidelines(content, 'material');
  }

  return designSystem;
}

/**
 * Process Ant Design documentation
 */
function processAntDesign(content, options) {
  const designSystem = {
    name: 'Ant Design',
    version: 'latest',
    components: [],
    tokens: {
      colors: {},
      spacing: {},
      typography: {},
      shadows: {}
    },
    guidelines: []
  };

  if (typeof content === 'string') {
    // Extract component information
    const componentMatches = content.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi) || [];
    designSystem.components = componentMatches
      .map(match => match.replace(/<[^>]*>/g, '').trim())
      .filter(name => name.length > 0);

    // Extract design tokens
    const tokenMatches = content.match(/@([^:]+):\s*([^;]+)/gi) || [];
    tokenMatches.forEach(match => {
      const [, property, value] = match.match(/@([^:]+):\s*([^;]+)/);
      if (property.includes('color')) {
        designSystem.tokens.colors[property] = value.trim();
      } else if (property.includes('spacing')) {
        designSystem.tokens.spacing[property] = value.trim();
      }
    });

    designSystem.guidelines = extractGuidelines(content, 'antd');
  }

  return designSystem;
}

/**
 * Process Mantine documentation
 */
function processMantine(content, options) {
  const designSystem = {
    name: 'Mantine',
    version: 'latest',
    components: [],
    tokens: {
      colors: {},
      spacing: {},
      typography: {},
      shadows: {}
    },
    guidelines: []
  };

  if (typeof content === 'string') {
    // Extract component information
    const componentMatches = content.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi) || [];
    designSystem.components = componentMatches
      .map(match => match.replace(/<[^>]*>/g, '').trim())
      .filter(name => name.length > 0);

    designSystem.guidelines = extractGuidelines(content, 'mantine');
  }

  return designSystem;
}

/**
 * Process Headless UI documentation
 */
function processHeadlessUI(content, options) {
  const designSystem = {
    name: 'Headless UI',
    version: 'latest',
    components: [],
    tokens: {
      colors: {},
      spacing: {},
      typography: {},
      shadows: {}
    },
    guidelines: []
  };

  if (typeof content === 'string') {
    // Extract component information
    const componentMatches = content.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi) || [];
    designSystem.components = componentMatches
      .map(match => match.replace(/<[^>]*>/g, '').trim())
      .filter(name => name.length > 0);

    designSystem.guidelines = extractGuidelines(content, 'headless');
  }

  return designSystem;
}

/**
 * Generic processing for unknown design systems
 */
function processGeneric(content, options) {
  const designSystem = {
    name: 'Custom Design System',
    version: 'unknown',
    components: [],
    tokens: {
      colors: {},
      spacing: {},
      typography: {},
      shadows: {}
    },
    guidelines: []
  };

  if (typeof content === 'string') {
    // Try to extract any component-like patterns
    const componentMatches = content.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi) || [];
    designSystem.components = componentMatches
      .map(match => match.replace(/<[^>]*>/g, '').trim())
      .filter(name => name.length > 0);

    // Try to extract CSS custom properties
    const cssVarMatches = content.match(/--([^:]+):\s*([^;]+)/gi) || [];
    cssVarMatches.forEach(match => {
      const [, name, value] = match.match(/--([^:]+):\s*([^;]+)/);
      if (name.includes('color')) {
        designSystem.tokens.colors[name] = value.trim();
      } else if (name.includes('space') || name.includes('margin') || name.includes('padding')) {
        designSystem.tokens.spacing[name] = value.trim();
      }
    });

    designSystem.guidelines = extractGuidelines(content, 'generic');
  }

  return designSystem;
}

/**
 * Extract design guidelines from content
 */
function extractGuidelines(content, systemType) {
  const guidelines = [];
  
  // Common design principles to look for
  const principlePatterns = [
    /accessibility/gi,
    /contrast/gi,
    /spacing/gi,
    /typography/gi,
    /color/gi,
    /layout/gi,
    /responsive/gi,
    /mobile/gi,
    /touch/gi,
    /focus/gi,
    /keyboard/gi
  ];

  principlePatterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      guidelines.push({
        category: pattern.source.replace(/[\/gi]/g, ''),
        mentions: matches.length,
        system: systemType
      });
    }
  });

  return guidelines;
}

/**
 * Validate design system URL
 */
export function validateDesignSystemURL(url) {
  try {
    const urlObj = new URL(url);
    
    // Check if it's a valid HTTP/HTTPS URL
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { valid: false, error: 'URL must use HTTP or HTTPS protocol' };
    }

    // Check if it's a known design system domain
    const knownDomains = [
      'chakra-ui.com',
      'mui.com',
      'material-ui.com',
      'ant.design',
      'mantine.dev',
      'headlessui.com',
      'figma.com',
      'github.com',
      'gitlab.com'
    ];

    const isKnownDomain = knownDomains.some(domain => 
      urlObj.hostname.includes(domain)
    );

    if (!isKnownDomain) {
      return { 
        valid: true, 
        warning: 'Unknown design system domain. Generic processing will be used.' 
      };
    }

    return { valid: true };

  } catch (error) {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Get design system summary for display
 */
export function getDesignSystemSummary(designSystem) {
  return {
    name: designSystem.name,
    version: designSystem.version,
    componentCount: designSystem.components.length,
    tokenCount: Object.keys(designSystem.tokens.colors).length + 
                Object.keys(designSystem.tokens.spacing).length +
                Object.keys(designSystem.tokens.typography).length,
    guidelineCount: designSystem.guidelines.length,
    lastUpdated: new Date().toISOString()
  };
}

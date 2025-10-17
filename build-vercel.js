#!/usr/bin/env node
/**
 * Vercel Build Script
 * Ensures only 4 API functions are built
 */

import { readdir, stat } from 'fs/promises';
import { join } from 'path';

async function buildVercel() {
  console.log('🚀 Building Vercel deployment...');
  console.log('📁 Checking API directory...');
  
  try {
    const apiDir = './api';
    const files = await readdir(apiDir);
    const jsFiles = files.filter(f => f.endsWith('.js'));
    
    console.log(`✅ Found ${jsFiles.length} API files:`);
    jsFiles.forEach(file => console.log(`   - ${file}`));
    
    if (jsFiles.length === 4) {
      console.log('✅ Perfect! Exactly 4 API functions (under 12 limit)');
      console.log('🎯 Ready for Vercel deployment');
    } else {
      console.log(`❌ Expected 4 files, found ${jsFiles.length}`);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Build error:', error.message);
    process.exit(1);
  }
}

buildVercel();

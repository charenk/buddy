#!/usr/bin/env node
/**
 * Verify API Files Script
 * Check what API files exist in the repository
 */

import { readdir, stat } from 'fs/promises';
import { join } from 'path';

async function verifyAPIFiles() {
  console.log('🔍 Verifying API files in repository...\n');
  
  try {
    const apiDir = './api';
    const files = await readdir(apiDir);
    
    console.log('📁 Files in api/ directory:');
    for (const file of files) {
      const filePath = join(apiDir, file);
      const stats = await stat(filePath);
      
      if (stats.isFile() && file.endsWith('.js')) {
        console.log(`  ✅ ${file}`);
      } else if (stats.isDirectory()) {
        console.log(`  📁 ${file}/ (directory)`);
      }
    }
    
    const jsFiles = files.filter(f => f.endsWith('.js'));
    console.log(`\n📊 Total JavaScript files: ${jsFiles.length}`);
    
    if (jsFiles.length === 4) {
      console.log('✅ Perfect! Exactly 4 API functions (under 12 limit)');
    } else if (jsFiles.length < 12) {
      console.log('✅ Good! Under 12 function limit');
    } else {
      console.log('❌ Problem! Over 12 function limit');
    }
    
  } catch (error) {
    console.error('❌ Error reading API directory:', error.message);
  }
}

verifyAPIFiles();

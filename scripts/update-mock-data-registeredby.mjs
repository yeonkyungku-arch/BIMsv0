#!/usr/bin/env node
import fs from 'fs';

// Read the file
const filePath = '/lib/mock-data.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

// Pattern 1: Find mockAssets entries without registeredBy
// Replace pattern: receivedDate: "...", receivedBy: "...", + any lines before createdAt
// with: registeredDate fields need registeredBy: "partner", registeredByName: value

// This is a detailed replacement for mockAssets entries
// Match pattern: receivedDate, receivedBy, then directly to createdAt without registeredBy

const assetPattern = /(receivedDate: "[^"]+", receivedBy: "([^"]+)",\s+inspectionStatus:.*?\n\s+)(createdAt:)/g;
content = content.replace(assetPattern, (match, p1, receivedByName, p3) => {
  return `${p1}registeredBy: "partner", registeredByName: "${receivedByName}",\n    ${p3}`;
});

// Write back
fs.writeFileSync(filePath, content, 'utf-8');
console.log('✓ Updated mock-data.tsx with registeredBy fields for mockAssets');

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

// Read source CSV
const sourcePath = path.join(__dirname, "..", "Ruu's OC List 2025 - Copy of [OC List] (1).csv");
const sourceContent = fs.readFileSync(sourcePath, 'utf-8');
const sourceRecords = parse(sourceContent, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
});

// Read database export CSV
const dbPath = path.join(__dirname, "..", "ocs_rows (1).csv");
const dbContent = fs.readFileSync(dbPath, 'utf-8');
const dbRecords = parse(dbContent, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
});

console.log(`\nSource CSV: ${sourceRecords.length} rows`);
console.log(`Database CSV: ${dbRecords.length} rows\n`);

// Build name sets from database
const dbNames = new Set();
const dbNamesByFirstLast = new Set();

dbRecords.forEach(row => {
  if (row.name) {
    dbNames.add(row.name.toLowerCase().trim().replace(/\s+/g, ' '));
  }
  const first = (row.first_name || '').trim().toLowerCase();
  const last = (row.last_name || '').trim().toLowerCase();
  if (first && last) {
    dbNamesByFirstLast.add(`${first} ${last}`.trim());
  } else if (first) {
    dbNamesByFirstLast.add(first);
  } else if (last) {
    dbNamesByFirstLast.add(last);
  }
});

// Find missing OCs
const missing = [];
const found = [];

sourceRecords.forEach((row, index) => {
  const firstName = (row['FIRST NAME'] || '').trim();
  const lastName = (row['LAST NAME'] || '').trim();
  const alias = (row.ALIAS || '').trim();
  const verse = (row.VERSE || '').trim();
  
  let sourceName = '';
  if (firstName && lastName) {
    sourceName = `${firstName} ${lastName}`;
  } else if (firstName) {
    sourceName = firstName;
  } else if (lastName) {
    sourceName = lastName;
  } else if (alias) {
    sourceName = alias;
  }
  
  if (!sourceName) {
    return; // Skip empty rows
  }
  
  const normalized = sourceName.toLowerCase().trim().replace(/\s+/g, ' ');
  const normalizedFirstLast = firstName && lastName 
    ? `${firstName.toLowerCase()} ${lastName.toLowerCase()}`.trim()
    : (firstName || lastName || '').toLowerCase().trim();
  
  const foundByName = dbNames.has(normalized);
  const foundByFirstLast = normalizedFirstLast && dbNamesByFirstLast.has(normalizedFirstLast);
  
  if (!foundByName && !foundByFirstLast) {
    missing.push({
      name: sourceName,
      verse: verse || 'Unknown',
      row: index + 2, // +2 for header and 0-index
    });
  } else {
    found.push(sourceName);
  }
});

console.log(`\n=== RESULTS ===\n`);
console.log(`Found in database: ${found.length}`);
console.log(`Missing from database: ${missing.length}\n`);

if (missing.length > 0) {
  console.log(`\n=== MISSING OCs (${missing.length} total) ===\n`);
  missing.forEach((oc, i) => {
    console.log(`${i + 1}. ${oc.name} (Verse: ${oc.verse}) [Row ${oc.row}]`);
  });
  
  // Group by verse
  const byVerse = {};
  missing.forEach(oc => {
    const verse = oc.verse || 'Unknown';
    if (!byVerse[verse]) {
      byVerse[verse] = [];
    }
    byVerse[verse].push(oc.name);
  });
  
  console.log(`\n=== MISSING BY VERSE ===\n`);
  Object.entries(byVerse)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([verse, names]) => {
      console.log(`\n${verse} (${names.length} missing):`);
      names.forEach(name => console.log(`  - ${name}`));
    });
} else {
  console.log('✅ All OCs found in database!');
}


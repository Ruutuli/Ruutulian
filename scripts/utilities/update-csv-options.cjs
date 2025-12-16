const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Find project root by looking for package.json (go up from scripts/utilities/)
function findProjectRoot(startPath) {
  let currentPath = startPath;
  while (currentPath !== path.dirname(currentPath)) {
    const packageJsonPath = path.join(currentPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      return currentPath;
    }
    currentPath = path.dirname(currentPath);
  }
  return startPath;
}

const projectRoot = findProjectRoot(__dirname);
const infoCsvPath = path.join(projectRoot, "Ruu's OC List 2025 - [INFO] (1).csv");
const ocListCsvPath = path.join(projectRoot, "Ruu's OC List 2025 - Copy of [OC List].csv");

// CSV column mapping (reverse of the one in generate-csv-options.ts)
const fieldToCsvColumn = {
  'pronouns': 'PRONOUNS',
  'gender_identity': 'GENDER IDENTITY',
  'romantic': 'ROMANTIC ORIENTATION',
  'sexual': 'SEXUAL ORIENTATION',
  'relationship_type': 'RELATIONSHIP STRUCTURE',
  'sex': 'SEX',
  'accent': 'ACCENT',
  'nationality': 'NATIONALITY',
  'ethnicity_race': 'RACE / ETHNICITY',
  'species': 'SPECIES',
  'eye_color': 'EYE COLOR',
  'hair_color': 'HAIR COLOR',
  'skin_tone': 'SKIN TONE',
  'occupation': 'OCCUPATION',
  'mbti': 'JUNG',
  'moral': 'MORAL',
  'positive_traits': 'POS PERSONALITY',
  'neutral_traits': 'NUE PERSONALITY',
  'negative_traits': 'NEG PERSONALITY',
};

// Parse CSV line
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = i < line.length - 1 ? line[i + 1] : '';
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// Escape CSV value
function escapeCSVValue(value) {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// Update CSV file with new options
function updateCSVFile(csvPath, fieldToColumn, updatedOptions) {
  // Note: This function assumes the file exists (check is done before calling)
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.trim().split('\n');
  
  if (lines.length < 2) {
    throw new Error('CSV file has no header or data rows');
  }

  // Parse header
  const headers = parseCSVLine(lines[0]).map(h => h.trim());
  const columnIndices = new Map();
  headers.forEach((header, index) => {
    columnIndices.set(header, index);
  });

  // Parse all data rows
  const dataRows = lines.slice(1).map(line => parseCSVLine(line));

  // Track which columns need new values
  const columnsToUpdate = new Map();
  
  // For each updated field, find missing values
  Object.entries(updatedOptions).forEach(([field, newValues]) => {
    const csvColumn = fieldToColumn[field];
    if (!csvColumn || !columnIndices.has(csvColumn)) {
      console.warn(`Column not found for field: ${field}`);
      return;
    }

    const columnIndex = columnIndices.get(csvColumn);
    
    // Get existing values in this column
    const existingValues = new Set();
    dataRows.forEach(row => {
      const value = (row[columnIndex] || '').trim();
      if (value) {
        // Handle semicolon-separated values
        if (value.includes(';')) {
          value.split(';').forEach(v => {
            const trimmed = v.trim();
            if (trimmed) existingValues.add(trimmed);
          });
        } else {
          existingValues.add(value);
        }
      }
    });

    // Find new values that need to be added
    const newValuesToAdd = newValues.filter(val => !existingValues.has(val));
    
    if (newValuesToAdd.length > 0) {
      columnsToUpdate.set(columnIndex, {
        column: csvColumn,
        newValues: newValuesToAdd
      });
      console.log(`Field ${field} (${csvColumn}): ${newValuesToAdd.length} new values to add`);
    }
  });

  // Add new rows for each new value
  columnsToUpdate.forEach(({ column, newValues }, columnIndex) => {
    newValues.forEach(newValue => {
      // Create a new row with empty cells, except for the column we're updating
      const newRow = new Array(headers.length).fill('');
      newRow[columnIndex] = escapeCSVValue(newValue);
      dataRows.push(newRow);
    });
  });

  // Rebuild CSV content
  const headerLine = headers.map(escapeCSVValue).join(',');
  const dataLines = dataRows.map(row => 
    row.map(cell => escapeCSVValue(cell || '')).join(',')
  );
  
  const newCsvContent = [headerLine, ...dataLines].join('\n');
  fs.writeFileSync(csvPath, newCsvContent, 'utf-8');
  console.log(`Updated CSV file: ${csvPath}`);
}

// Update the options TypeScript file directly (for production when CSV files don't exist)
function updateOptionsFileDirectly(optionsFilePath, updatedOptions) {
  if (!fs.existsSync(optionsFilePath)) {
    throw new Error(`Options file not found: ${optionsFilePath}`);
  }

  // Read current options file
  let fileContent = fs.readFileSync(optionsFilePath, 'utf-8');
  
  // Update each field in the options
  Object.entries(updatedOptions).forEach(([field, newValues]) => {
    // Sort values for consistency
    const sortedValues = [...newValues].sort();
    
    // Create the new array content with proper indentation
    const valuesString = sortedValues
      .map(v => `    "${String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`)
      .join(',\n');
    
    // Match the field definition - handle multiline arrays with balanced brackets
    // This regex matches: "field": [ ... ] where ... can contain nested brackets
    const fieldName = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const startPattern = `"${fieldName}":\\s*\\[`;
    const startIndex = fileContent.search(new RegExp(startPattern));
    
    if (startIndex === -1) {
      console.warn(`Field ${field} not found in options file, skipping`);
      return;
    }
    
    // Find the matching closing bracket
    let bracketCount = 0;
    let inString = false;
    let escapeNext = false;
    let endIndex = startIndex;
    
    for (let i = startIndex; i < fileContent.length; i++) {
      const char = fileContent[i];
      
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      
      if (char === '\\') {
        escapeNext = true;
        continue;
      }
      
      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }
      
      if (!inString) {
        if (char === '[') {
          bracketCount++;
        } else if (char === ']') {
          bracketCount--;
          if (bracketCount === 0) {
            endIndex = i;
            break;
          }
        }
      }
    }
    
    if (bracketCount !== 0) {
      console.warn(`Could not find matching bracket for field ${field}, skipping`);
      return;
    }
    
    // Extract the part before and after the field
    const before = fileContent.substring(0, startIndex);
    const after = fileContent.substring(endIndex + 1);
    
    // Reconstruct with new values
    fileContent = before + `"${field}": [\n${valuesString}\n  ]` + after;
    console.log(`Updated field: ${field} with ${newValues.length} values`);
  });
  
  // Write updated content
  fs.writeFileSync(optionsFilePath, fileContent, 'utf-8');
  console.log(`Updated options file: ${optionsFilePath}`);
}

// Main function
function updateOptions(updatedOptions) {
  try {
    // Determine which CSV file to update based on the fields
    const infoCsvFields = ['pronouns', 'gender_identity', 'romantic', 'sexual', 'relationship_type', 
                          'sex', 'accent', 'nationality', 'ethnicity_race', 'species', 'skin_tone', 
                          'occupation', 'mbti', 'moral', 'positive_traits', 'neutral_traits', 'negative_traits'];
    const ocListCsvFields = ['eye_color', 'hair_color'];

    const infoCsvUpdates = {};
    const ocListCsvUpdates = {};

    Object.entries(updatedOptions).forEach(([field, values]) => {
      if (infoCsvFields.includes(field)) {
        infoCsvUpdates[field] = values;
      } else if (ocListCsvFields.includes(field)) {
        ocListCsvUpdates[field] = values;
      }
    });

    // Update INFO CSV (skip if file doesn't exist - common in production)
    if (Object.keys(infoCsvUpdates).length > 0) {
      if (fs.existsSync(infoCsvPath)) {
        updateCSVFile(infoCsvPath, fieldToCsvColumn, infoCsvUpdates);
      } else {
        console.warn(`INFO CSV file not found at ${infoCsvPath}, skipping CSV update. Options will still be saved.`);
      }
    }

    // Update OC List CSV (skip if file doesn't exist - common in production)
    if (Object.keys(ocListCsvUpdates).length > 0) {
      if (fs.existsSync(ocListCsvPath)) {
        updateCSVFile(ocListCsvPath, fieldToCsvColumn, ocListCsvUpdates);
      } else {
        console.warn(`OC List CSV file not found at ${ocListCsvPath}, skipping CSV update. Options will still be saved.`);
      }
    }

    // Update the options file
    const optionsFilePath = path.join(projectRoot, 'src/lib/utils/csvOptionsData.ts');
    const csvFilesExist = fs.existsSync(infoCsvPath) && fs.existsSync(ocListCsvPath);
    
    if (csvFilesExist) {
      // If CSV files exist, regenerate from CSV (development/local)
      console.log('Regenerating options file from CSV...');
      const scriptPath = path.join(projectRoot, 'scripts', 'utilities', 'generate-csv-options.ts');
      execSync(`npx tsx "${scriptPath}"`, { 
        cwd: projectRoot,
        stdio: 'inherit'
      });
    } else {
      // If CSV files don't exist, update the options file directly (production)
      console.log('CSV files not found, updating options file directly...');
      updateOptionsFileDirectly(optionsFilePath, updatedOptions);
    }

    console.log('Options updated successfully!');
    return { success: true };
  } catch (error) {
    console.error('Error updating options:', error);
    throw error;
  }
}

// If run directly (not imported)
if (require.main === module) {
  const tempFile = process.argv[2];
  if (!tempFile) {
    console.error('Usage: node update-csv-options.cjs <temp-json-file>');
    process.exit(1);
  }

  try {
    if (!fs.existsSync(tempFile)) {
      throw new Error(`Temp file not found: ${tempFile}`);
    }
    const optionsJson = fs.readFileSync(tempFile, 'utf-8');
    const updatedOptions = JSON.parse(optionsJson);
    
    // Delete temp file after reading
    fs.unlinkSync(tempFile);
    
    updateOptions(updatedOptions);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

module.exports = { updateOptions };

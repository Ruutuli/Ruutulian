import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { checkAuth } from '@/lib/auth/require-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await checkAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // For now, return the static options
    // In the future, this could load from a database table
    const { csvOptions } = await import('@/lib/utils/csvOptionsData');
    return NextResponse.json({ options: csvOptions });
  } catch (error) {
    console.error('Error fetching dropdown options:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dropdown options' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await checkAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { options } = await request.json();

    if (!options || typeof options !== 'object') {
      return NextResponse.json(
        { error: 'Invalid options data' },
        { status: 400 }
      );
    }

    // Get current options for comparison
    const { csvOptions: currentOptions } = await import('@/lib/utils/csvOptionsData');
    
    // Find fields that have changed (compare arrays)
    const fieldsToUpdate: Record<string, string[]> = {};
    
    Object.entries(options).forEach(([field, newValues]) => {
      if (Array.isArray(newValues)) {
        const currentValues = currentOptions[field] || [];
        // Check if arrays are different (simple comparison - if lengths differ or any values are different)
        const currentSet = new Set(currentValues);
        const newSet = new Set(newValues);
        const isDifferent = 
          currentValues.length !== newValues.length ||
          newValues.some(val => !currentSet.has(val)) ||
          currentValues.some(val => !newSet.has(val));
        
        if (isDifferent) {
          fieldsToUpdate[field] = newValues;
        }
      }
    });

    // If there are changes, update the CSV files
    if (Object.keys(fieldsToUpdate).length > 0) {
      // Get project root
      const projectRoot = process.cwd();
      const scriptPath = path.join(projectRoot, 'scripts', 'update-csv-options.cjs');
      
      if (!fs.existsSync(scriptPath)) {
        throw new Error('Update script not found');
      }

      // Write options to temp file and call the update script
      const tempFile = path.join(projectRoot, 'temp-options-update.json');
      try {
        fs.writeFileSync(tempFile, JSON.stringify(fieldsToUpdate), 'utf-8');
        
        execSync(`node "${scriptPath}" "${tempFile}"`, {
          cwd: projectRoot,
          stdio: 'pipe',
          encoding: 'utf-8',
        });
        
        // Clean up temp file if it still exists (script should delete it)
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      } catch (execError: any) {
        // Clean up temp file on error
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
        console.error('Error executing update script:', execError.message);
        if (execError.stdout) console.error('stdout:', execError.stdout);
        if (execError.stderr) console.error('stderr:', execError.stderr);
        throw new Error(`Failed to update CSV files: ${execError.message}`);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Options saved successfully',
      updatedFields: Object.keys(fieldsToUpdate)
    });
  } catch (error) {
    console.error('Error saving dropdown options:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to save dropdown options';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}



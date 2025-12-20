/**
 * Comprehensive Test Runner
 * 
 * Runs all save integrity and rehydration tests
 * 
 * Run with: npx tsx scripts/tests/test-runner.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface TestSuite {
  name: string;
  script: string;
  description: string;
}

const testSuites: TestSuite[] = [
  {
    name: 'OC Save Integrity',
    script: 'scripts/tests/test-oc-save-integrity.ts',
    description: 'Tests OC create/edit flows',
  },
  // Add more test suites as they are created
];

async function runTest(script: string): Promise<{ passed: boolean; output: string; error?: string }> {
  try {
    const { stdout, stderr } = await execAsync(`npx tsx ${script}`);
    const output = stdout + stderr;
    // Check if test passed (look for "All tests passed" or exit code)
    const passed = output.includes('All tests passed') || output.includes('✅');
    return { passed, output };
  } catch (error: any) {
    return {
      passed: false,
      output: error.stdout || '',
      error: error.message,
    };
  }
}

async function main() {
  console.log('🧪 Comprehensive Test Suite\n');
  console.log('='.repeat(50));
  console.log();

  const results: Array<{ suite: string; passed: boolean; output: string }> = [];

  for (const suite of testSuites) {
    console.log(`\n📋 Running: ${suite.name}`);
    console.log(`   ${suite.description}`);
    console.log('-'.repeat(50));

    const result = await runTest(suite.script);
    results.push({
      suite: suite.name,
      passed: result.passed,
      output: result.output,
    });

    if (result.passed) {
      console.log(`✅ ${suite.name}: PASSED`);
    } else {
      console.log(`❌ ${suite.name}: FAILED`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }
  }

  // Generate report
  console.log('\n' + '='.repeat(50));
  console.log('\n📊 Test Summary\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`Total Suites: ${results.length}`);
  console.log(`✓ Passed: ${passed}`);
  console.log(`✗ Failed: ${failed}`);

  // Save report
  const outputDir = path.join(process.cwd(), 'scripts', 'output');
  fs.mkdirSync(outputDir, { recursive: true });
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      passed,
      failed,
    },
    results: results.map(r => ({
      suite: r.suite,
      passed: r.passed,
    })),
  };

  const reportPath = path.join(outputDir, 'test-results.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`\n📄 Report saved to: ${reportPath}`);

  if (failed > 0) {
    console.log('\n❌ Some tests failed. Please review the output above.');
    process.exit(1);
  } else {
    console.log('\n✅ All test suites passed!');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});



















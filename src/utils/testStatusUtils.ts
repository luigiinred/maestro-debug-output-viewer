import { CommandEntry } from '../types/commandTypes';

/**
 * Counts the number of commands with different statuses
 * @param commands Array of command entries in a test
 * @returns Object with counts of completed, failed, skipped, and total commands
 */
export function countCommandStatuses(commands: CommandEntry[]) {
  const counts = { skipped: 0, completed: 0, failed: 0, total: 0 };
  
  if (!Array.isArray(commands)) {
    return counts;
  }
  
  commands.forEach(cmd => {
    counts.total++;
    
    if (cmd.metadata?.status === 'SKIPPED') {
      counts.skipped++;
    } else if (cmd.metadata?.status === 'COMPLETED') {
      counts.completed++;
    } else if (cmd.metadata?.status === 'FAILED') {
      counts.failed++;
    }
  });
  
  return counts;
}

/**
 * Determines if a test has failed by checking if any command has failed
 * @param commands Array of command entries in a test
 * @returns boolean indicating if the test has failed
 */
export function isTestFailed(commands: CommandEntry[]): boolean {
  const counts = countCommandStatuses(commands);
  return counts.failed > 0;
}

/**
 * Gets the test status based on command results
 * @param commands Array of command entries in a test
 * @returns 'FAILED' if any command failed, otherwise 'COMPLETED'
 */
export function getTestStatus(commands: CommandEntry[]): 'COMPLETED' | 'FAILED' {
  return isTestFailed(commands) ? 'FAILED' : 'COMPLETED';
}

/**
 * Determines if a flow has failed by checking if any test has failed
 * @param testStatuses Array of test statuses
 * @returns 'FAILED' if any test failed, otherwise 'PASSED'
 */
export function getFlowStatus(testStatuses: ('COMPLETED' | 'FAILED')[]): 'PASSED' | 'FAILED' {
  if (!Array.isArray(testStatuses) || testStatuses.length === 0) {
    return 'PASSED';
  }
  
  // A flow is considered failed if any test has failed
  return testStatuses.includes('FAILED') ? 'FAILED' : 'PASSED';
} 
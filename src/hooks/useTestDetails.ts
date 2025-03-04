import { useState, useEffect } from 'react';
import { CommandEntry } from '../types/commandTypes';
import { transformFlowCommands } from '../utils/transformFlowCommands';
import { extractTestPathInfo } from '../utils/testPathUtils';

interface UseTestDetailsResult {
  commands: CommandEntry[];
  error: string | null;
  testName: string;
  startTime: string;
  loading: boolean;
  directory: string;
  flowName: string;
}

export function useTestDetails(testId: string): UseTestDetailsResult {
  const [commands, setCommands] = useState<CommandEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [testName, setTestName] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [directory, setDirectory] = useState<string>('');
  const [flowName, setFlowName] = useState<string>('');

  useEffect(() => {
    const fetchTestDetails = async () => {
      if (!testId) return;

      setLoading(true);
      try {
        // Extract directory and flow name from the test ID path
        const { directory: testDirectory, flowName: testFlowName } = extractTestPathInfo(testId);
        setDirectory(testDirectory);
        setFlowName(testFlowName);
        setTestName(testFlowName); // Use flow name as test name

        const response = await fetch(
          `http://localhost:3001/api/files/content?path=${encodeURIComponent(testId)}`
        );
        if (!response.ok) throw new Error('Failed to fetch test details');
        const data = await response.json();

        // Sort commands by timestamp if available
        let processedCommands: CommandEntry[] = [];
        if (Array.isArray(data)) {
          console.log('Raw command data:', data);
          
          // Sort by timestamp
          processedCommands = [...data].sort((a, b) => {
            return (a.metadata?.timestamp || 0) - (b.metadata?.timestamp || 0);
          });
          
          console.log('Sorted commands:', processedCommands);
          
          // Transform the commands to replace planned flows with actual execution data
          try {
            processedCommands = transformFlowCommands(processedCommands);
            console.log('Transformed commands:', processedCommands);
          } catch (transformError) {
            console.error('Error transforming commands:', transformError);
            setError('Error processing test data');
            return;
          }
          
          // Set the start time to the first command's timestamp
          if (processedCommands.length > 0 && processedCommands[0].metadata?.timestamp) {
            setStartTime(processedCommands[0].metadata.timestamp.toString());
          } else {
            setStartTime('N/A');
          }
        } else {
          console.warn('Received non-array data:', data);
        }

        setCommands(processedCommands);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load test details');
      } finally {
        setLoading(false);
      }
    };

    fetchTestDetails();
  }, [testId]);

  return {
    commands,
    error,
    testName,
    startTime,
    loading,
    directory,
    flowName,
  };
} 
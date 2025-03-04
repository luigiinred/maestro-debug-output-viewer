import { Box } from '@mui/material';
import { useTestDetails } from '../hooks/useTestDetails';
import { ErrorDisplay } from './test-details/ErrorDisplay';
import { CompactTestDetails } from './test-details/CompactTestDetails';
import { FlowImages } from './test-details/FlowImages';
import { useEffect } from 'react';
import '../styles/split-pane.css';
import { TestHeader } from './test-details/TestHeader';
import { isTestFailed } from '../utils/testStatusUtils';

interface TestDetailsProps {
  testId: string;
}

export function TestDetails({ testId }: TestDetailsProps) {
  const { commands, error, testName, startTime, loading, directory, flowName } = useTestDetails(testId);

  const passed = !isTestFailed(commands);
  useEffect(() => {
    console.log('TestDetails received:', {
      directory,
      flowName,
      testId,
      hasCommands: commands.length > 0
    });
  }, [directory, flowName, testId, commands]);

  if (loading) {
    return <Box sx={{ p: 2 }}>Loading test details...</Box>;
  }

  if (error) {
    return <ErrorDisplay error={error} />;
  }

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      overflow: 'hidden'
    }}>
      {/* Title Section - Takes minimum space needed */}
      <TestHeader
        testName={testName}
        commandCount={commands.length}
        startTime={parseInt(startTime) || 0}
        passed={passed}
      />

      {/* Main Content Area - Takes remaining height */}
      <Box sx={{ 
        display: 'flex', 
        flexGrow: 1,
        overflow: 'hidden',
        gap: 2,
        p: 2,
        pl: 3
      }}>
        {/* Left Panel - Command List */}
        <Box sx={{ 
          flexGrow: 1,
          overflow: 'auto',
          backgroundColor: 'background.paper',
          height: '100%',
          
        }}>
          <CompactTestDetails
            commands={commands}
            error={error || ''}
            testName={testName}
            startTime={parseInt(startTime) || 0}
          />
        </Box>

        {/* Right Panel - Flow Images */}
        <Box sx={{ 
          width: '375px', // iPhone width
          flexShrink: 0,
          overflow: 'auto',
          backgroundColor: 'background.default',
          height: '100%',
          
        }}>
          {directory && flowName && (
            <FlowImages
              testId={testId}
              directory={directory}
              flowName={flowName}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
} 
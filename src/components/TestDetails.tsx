import { Box, FormControlLabel, Switch } from '@mui/material';
import { useTestDetails } from '../hooks/useTestDetails';
import { ErrorDisplay } from './test-details/ErrorDisplay';
import { CompactTestDetails } from './test-details/CompactTestDetails';
import { FlowImages } from './test-details/FlowImages';
import { useEffect, useState } from 'react';
import '../styles/split-pane.css';
import { TestHeader } from './test-details/TestHeader';
import { isTestFailed } from '../utils/testStatusUtils';
import { CommandEntry } from '../types/commandTypes';
import { createFlowImagesUrl } from '../utils/apiConfig';
import { injectAutomaticScreenshots } from '../utils/injectAutomaticScreenshots';

interface TestDetailsProps {
  testId: string;
}

// Define the FlowImage interface to match what's in FlowImages.tsx
interface FlowImage {
  path: string;
  url: string;
  timestamp: number;
  filename: string;
}

export function TestDetails({ testId }: TestDetailsProps) {
  const { commands: originalCommands, error, testName, startTime, loading, directory, flowName } = useTestDetails(testId);
  const [commands, setCommands] = useState<CommandEntry[]>([]);
  const [flowImages, setFlowImages] = useState<FlowImage[]>([]);
  const [imagesLoading, setImagesLoading] = useState<boolean>(false);
  const [showScreenshotCommands, setShowScreenshotCommands] = useState<boolean>(true);

  const passed = !isTestFailed(commands);

  // Fetch flow images when directory and flowName are available
  useEffect(() => {
    const fetchFlowImages = async () => {
      if (!directory || !flowName) return;

      setImagesLoading(true);
      try {
        const apiUrl = await createFlowImagesUrl(directory, flowName);
        const response = await fetch(apiUrl);

        if (!response.ok) {
          throw new Error('Failed to fetch flow images');
        }

        const data = await response.json();
        setFlowImages(data.images);
      } catch (err) {
        console.error('Error fetching flow images:', err);
      } finally {
        setImagesLoading(false);
      }
    };

    fetchFlowImages();
  }, [directory, flowName]);

  // Inject automatic screenshots when originalCommands or flowImages change
  useEffect(() => {
    if (originalCommands.length > 0 && flowImages.length > 0 && showScreenshotCommands) {
      const commandsWithScreenshots = injectAutomaticScreenshots(originalCommands, flowImages);
      setCommands(commandsWithScreenshots);
    } else {
      setCommands(originalCommands);
    }
  }, [originalCommands, flowImages, showScreenshotCommands]);

  useEffect(() => {
    console.log('TestDetails received:', {
      directory,
      flowName,
      testId,
      hasCommands: commands.length > 0,
      hasFlowImages: flowImages.length > 0
    });
  }, [directory, flowName, testId, commands, flowImages]);

  if (loading || imagesLoading) {
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
        testPath={testId}
      />

      {/* Main Content Area - Takes remaining height */}
      <Box sx={{
        display: 'flex',
        flexGrow: 1,
        overflow: 'hidden',
        borderRadius: 2,
        p: 2,
        pt: 1
      }}>
        {/* Left Panel - Command List */}
        <Box sx={{
          flexGrow: 1,
          overflow: 'auto',
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
          width: '0', // iPhone width
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
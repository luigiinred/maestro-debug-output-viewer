import { Card, CardContent, Typography, Box, Paper, Button, Tooltip } from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';

// Define the window interface to include electron
declare global {
  interface Window {
    electron?: {
      revealInFinder: (path: string) => Promise<{ success: boolean; error?: string }>;
    };
  }
}

interface TestHeaderProps {
  testName: string;
  commandCount: number;
  startTime: number | null;
  passed: boolean | null;
  testPath?: string;
}

export function TestHeader({ testName, commandCount, startTime, passed, testPath }: TestHeaderProps) {
  const handleRevealInFinder = () => {
    if (testPath && window.electron?.revealInFinder) {
      window.electron.revealInFinder(testPath)
        .then((result: { success: boolean; error?: string }) => {
          if (!result.success) {
            console.error('Failed to reveal folder:', result.error);
          }
        })
        .catch((error: Error) => {
          console.error('Error revealing folder:', error);
        });
    } else {
      console.warn('Cannot reveal folder: testPath is missing or revealInFinder is not available');
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        m: 2,
        mb: 0,
        borderWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'background.paper',
        borderRadius: 2,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h5">
          {testName}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {testPath && (
            <Tooltip title="Reveal in Finder">
              <Button
                variant="outlined"
                size="small"
                startIcon={<FolderOpenIcon />}
                onClick={handleRevealInFinder}
              >
                Reveal in Finder
              </Button>
            </Tooltip>
          )}
          {passed !== null && (
            <Typography
              variant="body1"
              sx={{
                color: passed ? 'success.main' : 'error.main',
                fontWeight: 'bold'
              }}
            >
              {passed ? 'PASSED' : 'FAILED'}
            </Typography>
          )}
        </Box>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          {commandCount} steps
        </Typography>
        {startTime && (
          <Typography variant="body2" color="text.secondary">
            Started at: {new Date(startTime).toLocaleTimeString()}
          </Typography>
        )}
      </Box>
    </Paper>
  );
} 
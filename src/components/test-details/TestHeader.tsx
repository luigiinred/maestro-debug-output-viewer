import { Card, CardContent, Typography, Box, Paper } from '@mui/material';

interface TestHeaderProps {
  testName: string;
  commandCount: number;
  startTime: number | null;
  passed: boolean | null;
}

export function TestHeader({ testName, commandCount, startTime, passed }: TestHeaderProps) {
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
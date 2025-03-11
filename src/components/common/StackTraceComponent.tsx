import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  CircularProgress,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Metadata, StackTrace } from '../../types/commandTypes';

interface StackTraceComponentProps {
  metadata: Metadata | undefined;
  testDirectory?: string;
  commandName?: string;
}

export const StackTraceComponent: React.FC<StackTraceComponentProps> = ({
  metadata,
  testDirectory,
  commandName
}) => {
  const [expanded, setExpanded] = useState<string | false>('errorPanel');
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only try to load screenshot if we have the necessary data
    if (metadata?.timestamp && testDirectory && commandName) {
      setLoading(true);
      setError(null);

      // Construct the URL for the screenshot
      const url = `/api/screenshot?directory=${encodeURIComponent(testDirectory)}&timestamp=${metadata.timestamp}&commandName=${encodeURIComponent(commandName)}`;

      // Check if the screenshot exists
      fetch(url, { method: 'HEAD' })
        .then(response => {
          if (response.ok) {
            setScreenshotUrl(url);
          } else {
            setError('Screenshot not available');
          }
          setLoading(false);
        })
        .catch(err => {
          console.error('Error checking for screenshot:', err);
          setError('Failed to load screenshot');
          setLoading(false);
        });
    }
  }, [metadata, testDirectory, commandName]);

  const handleChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  // If no metadata or no error, don't render anything
  if (!metadata || !metadata.error) {
    return null;
  }

  const { message, stackTrace, hierarchyRoot } = metadata.error;

  return (
    <Paper
      elevation={0}
      sx={{
        mt: 2,
        mb: 2,
        border: '1px solid #f44336',
        borderRadius: 1,
        overflow: 'auto',
        maxHeight: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Box sx={{ p: 2, backgroundColor: 'rgba(244, 67, 54, 0.08)' }}>
        <Typography variant="subtitle1" color="error" fontWeight="500">
          Error Details
        </Typography>
      </Box>

      <Divider />

      <Box sx={{ p: 2, overflow: 'auto' }}>
        <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', mb: 2, overflow: 'auto' }}>
          {message}
        </Typography>
      </Box>

      {/* Screenshot section */}
      {(screenshotUrl || loading || error) && (
        <Accordion
          expanded={expanded === 'screenshotPanel'}
          onChange={handleChange('screenshotPanel')}
          disableGutters
          elevation={0}
          sx={{
            '&:before': { display: 'none' },
            borderTop: '1px solid rgba(0, 0, 0, 0.12)'
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{ backgroundColor: 'rgba(0, 0, 0, 0.03)' }}
          >
            <Typography variant="body2" fontWeight="500">Failure Screenshot</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
              {loading && <CircularProgress size={40} />}
              {error && <Typography color="error">{error}</Typography>}
              {screenshotUrl && (
                <img
                  src={screenshotUrl}
                  alt="Failure Screenshot"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '300px',
                    objectFit: 'contain',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              )}
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      {stackTrace && stackTrace.length > 0 && (
        <Accordion
          expanded={expanded === 'stackTracePanel'}
          onChange={handleChange('stackTracePanel')}
          disableGutters
          elevation={0}
          sx={{
            '&:before': { display: 'none' },
            borderTop: '1px solid rgba(0, 0, 0, 0.12)'
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{ backgroundColor: 'rgba(0, 0, 0, 0.03)' }}
          >
            <Typography variant="body2" fontWeight="500">Stack Trace</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            <Box sx={{ p: 2, maxHeight: '200px', overflow: 'auto' }}>
              {stackTrace.map((trace: StackTrace, index: number) => (
                <Typography
                  key={index}
                  variant="body2"
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    mb: 0.5,
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  at {trace.className}.{trace.methodName}({trace.fileName}:{trace.lineNumber})
                </Typography>
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      {hierarchyRoot && (
        <Accordion
          expanded={expanded === 'hierarchyPanel'}
          onChange={handleChange('hierarchyPanel')}
          disableGutters
          elevation={0}
          sx={{
            '&:before': { display: 'none' },
            borderTop: '1px solid rgba(0, 0, 0, 0.12)'
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{ backgroundColor: 'rgba(0, 0, 0, 0.03)' }}
          >
            <Typography variant="body2" fontWeight="500">UI Hierarchy</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            <Box sx={{ p: 2, maxHeight: '200px', overflow: 'auto' }}>
              <Typography
                variant="body2"
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  whiteSpace: 'pre-wrap',
                  overflow: 'auto'
                }}
              >
                {JSON.stringify(hierarchyRoot, null, 2)}
              </Typography>
            </Box>
          </AccordionDetails>
        </Accordion>
      )}
    </Paper>
  );
}; 
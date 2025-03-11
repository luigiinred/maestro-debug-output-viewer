import { Box, Typography, Paper, Divider, IconButton, Link } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { CommandEntry } from '../../types/commandTypes';
import { getCommandName } from '../../utils/commandUtils';
import { JsonViewer } from '../common/JsonViewer';
import { StackTraceComponent } from '../common/StackTraceComponent';
import { useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import { CommandImages } from './CommandImages';
import path from 'path-browserify';

interface CommandDetailsSidebarProps {
  command: CommandEntry | null;
  onClose: () => void;
}

export function CommandDetailsSidebar({ command, onClose }: CommandDetailsSidebarProps) {
  const location = useLocation();

  // Extract test directory from the URL and get the parent directory (test run directory)
  const testDirectory = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const dir = params.get('dir') || '';
    console.log('CommandDetailsSidebar - Raw dir from URL:', dir);

    // If we have a .maestro directory, we need to get its parent to get to the test run directory
    if (dir.endsWith('.maestro')) {
      const parentDir = path.dirname(dir);
      console.log('CommandDetailsSidebar - Parent directory:', parentDir);
      return parentDir;
    }
    return dir;
  }, [location]);

  console.log('CommandDetailsSidebar - Final testDirectory:', testDirectory);
  console.log('CommandDetailsSidebar - Command:', command);

  if (!command) {
    return null;
  }

  const commandName = getCommandName(command.command);
  console.log('CommandDetailsSidebar - Command name:', commandName);

  const isFailed = command.metadata?.status === 'FAILED';

  // Remove 'Command' suffix if present and convert to lowercase
  const docsCommandName = commandName.replace(/Command$/, '').toLowerCase();
  const docsUrl = `https://docs.maestro.dev/api-reference/commands/${docsCommandName}`;

  return (
    <Paper
      elevation={0}
      sx={{
        width: '100%',
        height: '100%',
        overflow: 'auto',
        p: 2,
        borderWidth: 0,
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'background.paper',
        borderRadius: 2,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" component="h2">
            {commandName} Details
          </Typography>
          <Link href={`https://docs.maestro.dev/api-reference/commands/${commandName.toLowerCase()}`} target="_blank" rel="noopener noreferrer" sx={{ display: 'flex', alignItems: 'center' }}>
            <OpenInNewIcon fontSize="small" />
          </Link>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Show StackTraceComponent for failed commands */}
      {isFailed && (
        <Box sx={{ mb: 2, overflow: 'auto', flexShrink: 1 }}>
          <StackTraceComponent
            metadata={command.metadata}
            testDirectory={testDirectory}
            commandName={commandName}
          />
        </Box>
      )}

      {/* Add CommandImages component */}
      <CommandImages command={command} testDirectory={testDirectory} />

      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Command
        </Typography>
        <Box
          sx={{
            overflow: 'auto',
            fontSize: '0.85rem',
          }}
        >
          <JsonViewer
            data={command.command}
            initialExpanded={true}
            maxLevel={5}
          />
        </Box>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Metadata
        </Typography>
        <Box
          sx={{
            overflow: 'auto',
            fontSize: '0.85rem',
          }}
        >
          <JsonViewer
            data={command.metadata}
            initialExpanded={true}
            maxLevel={5}
          />
        </Box>
      </Box>
    </Paper>
  );
} 
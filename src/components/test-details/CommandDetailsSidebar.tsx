import { Box, Typography, Paper, Divider, IconButton, Link, Modal } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { CommandEntry } from '../../types/commandTypes';
import { getCommandName } from '../../utils/commandUtils';
import { JsonViewer } from '../common/JsonViewer';
import { StackTraceComponent } from '../common/StackTraceComponent';
import { useLocation } from 'react-router-dom';
import { useMemo, useState, useEffect } from 'react';
import { CommandImages } from './CommandImages';
import path from 'path-browserify';
import { getApiBaseUrl } from '../../utils/apiConfig';

interface CommandDetailsSidebarProps {
  command: CommandEntry | null;
  onClose: () => void;
}

// Component to display automatic screenshot at the top
function AutomaticScreenshot({ command }: { command: CommandEntry }) {
  const [baseUrl, setBaseUrl] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Get the base URL once when the component mounts
  useEffect(() => {
    const getBaseUrl = async () => {
      const url = await getApiBaseUrl();
      setBaseUrl(url);
    };
    getBaseUrl();
  }, []);

  // Check if this is an automatic screenshot command
  if (!command.command.automaticScreenshotCommand?.imageUrl) {
    return null;
  }

  const imageUrl = command.command.automaticScreenshotCommand.imageUrl;
  const fullImageUrl = `${baseUrl}${imageUrl}`;

  // Format timestamp
  const timestamp = command.metadata?.timestamp || 0;
  const date = new Date(timestamp);
  const formattedTimestamp = date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }) + '.' + date.getMilliseconds().toString().padStart(3, '0');

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle2" gutterBottom>
        Automatic Screenshot
      </Typography>
      <Box
        sx={{
          cursor: 'pointer',
          '&:hover': {
            opacity: 0.9,
          }
        }}
        onClick={() => setIsModalOpen(true)}
      >
        <img
          src={fullImageUrl}
          alt="Automatic Screenshot"
          style={{
            width: '100%',
            maxHeight: '300px',
            objectFit: 'contain',
            border: '1px solid #eee',
            borderRadius: '4px'
          }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          Captured at {formattedTimestamp} (click to enlarge)
        </Typography>
      </Box>

      {/* Modal for displaying the full-size screenshot */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        aria-labelledby="screenshot-modal"
        aria-describedby="view full screenshot"
      >
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          bgcolor: 'background.paper',
          boxShadow: 24,
          p: 4,
          maxWidth: '90vw',
          maxHeight: '90vh',
          overflow: 'auto',
          borderRadius: 2,
        }}>
          <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
            Automatic Screenshot
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Captured at {formattedTimestamp}
          </Typography>
          <img
            src={fullImageUrl}
            alt="Automatic Screenshot"
            style={{ maxWidth: '100%', maxHeight: '70vh' }}
          />
        </Box>
      </Modal>
    </Box>
  );
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
          <Link href={docsUrl} target="_blank" rel="noopener noreferrer" sx={{ display: 'flex', alignItems: 'center' }}>
            <OpenInNewIcon fontSize="small" />
          </Link>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* Display automatic screenshot at the top if this is an automatic screenshot command */}
      {command.command.automaticScreenshotCommand && (
        <AutomaticScreenshot command={command} />
      )}

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
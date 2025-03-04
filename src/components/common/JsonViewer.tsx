import JsonView from '@uiw/react-json-view';
import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { darkTheme } from '@uiw/react-json-view/dark';
import { lightTheme } from '@uiw/react-json-view/light';

interface JsonViewerProps {
  data: any;
  initialExpanded?: boolean;
  maxLevel?: number;
}

export function JsonViewer({ data, initialExpanded = true, maxLevel = 2 }: JsonViewerProps) {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  return (
    <Box sx={{ 
      fontFamily: 'monospace',
      backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(0, 0, 0, 0.03)',
      borderRadius: 2,
      
    }}>
      <JsonView 
        value={data}
        style={{
          ...isDarkMode ? darkTheme : lightTheme,
          fontSize: '0.875rem',
        }}
        displayDataTypes={false}
        displayObjectSize={true}
        enableClipboard={true}
        collapsed={maxLevel}
        shortenTextAfterLength={120}
      />
    </Box>
  );
} 
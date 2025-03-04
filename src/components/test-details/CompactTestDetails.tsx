import { Box, Paper, Typography } from '@mui/material';
import { CommandEntry } from '../../types/commandTypes';
import { CommandItem } from '../CommandItem';
import { ErrorDisplay } from './ErrorDisplay';
import { CommandDetailsSidebar } from './CommandDetailsSidebar';
import { useState, useMemo } from 'react';
import React from 'react';
import { countCommandStatuses } from '../../utils/testStatusUtils';
import Split from 'react-split';

interface CompactTestDetailsProps {
  commands: CommandEntry[];
  error: string;
  testName: string;
  startTime: number | null;
}

export function CompactTestDetails({
  commands,
  error,
  testName,
  startTime,
}: CompactTestDetailsProps) {
  const [selectedCommand, setSelectedCommand] = useState<CommandEntry | null>(null);
  
  const handleCommandSelect = (command: CommandEntry) => {
    setSelectedCommand(command === selectedCommand ? null : command);
  };
  
  const handleSidebarClose = () => {
    setSelectedCommand(null);
  };
  
  // Count commands but ONLY top-level ones for stats display
  const commandCounts = useMemo(() => {
    return countCommandStatuses(commands);
  }, [commands]);
  
  if (error) {
    return <ErrorDisplay error={error} />;
  }

  return (
    <Split
      sizes={[50, 50]}
      minSize={[300, 300]}
      expandToMin={false}
      gutterSize={8}
      gutterAlign="center"
      snapOffset={30}
      dragInterval={1}
      direction="horizontal"
      cursor="col-resize"
      style={{ display: 'flex', height: '100%' }}
    >
      {/* Commands List */}
      <Box sx={{ 
        height: '100%',
        overflow: 'hidden'
      }}>
        <Paper 
          elevation={0}
          sx={{ 
            height: '100%',
            overflowY: 'auto',
            fontFamily: 'monospace',
            backgroundColor: 'background.paper',
            border: 'none',
            borderRadius: 2,
          }}
        >
         
          <Box sx={{ p: 0.5 }}>
            {commands.map((commandEntry, index) => (
              <React.Fragment key={index}>
                <CommandItem
                  commandEntry={commandEntry}
                  index={index}
                  startTime={startTime}
                  onSelect={handleCommandSelect}
                  isSelected={commandEntry === selectedCommand}
                  isLastItem={index === commands.length - 1}
                />
              </React.Fragment>
            ))}
          </Box>
        </Paper>
      </Box>
      
      {/* Command Details Panel */}
      <Box sx={{ 
        height: '100%',
        overflow: 'hidden',
      }}>
        {selectedCommand ? (
          <CommandDetailsSidebar 
            command={selectedCommand} 
            onClose={handleSidebarClose} 
          />
        ) : (
          <Paper
            elevation={0}
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'background.paper',
              borderWidth: 0,
              color: 'text.secondary',
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            <Typography variant="body1">
              Select a command to view details
            </Typography>
          </Paper>
        )}
      </Box>
    </Split>
  );
} 
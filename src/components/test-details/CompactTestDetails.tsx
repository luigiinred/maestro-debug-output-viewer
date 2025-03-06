import { Box, Paper, Typography } from '@mui/material';
import { CommandEntry } from '../../types/commandTypes';
import { CommandItem } from '../CommandItem';
import { ErrorDisplay } from './ErrorDisplay';
import { CommandDetailsSidebar } from './CommandDetailsSidebar';
import { useState, useMemo, useCallback } from 'react';
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
  // Add state to remember split sizes
  const [splitSizes, setSplitSizes] = useState<number[]>([50, 50]);

  const handleCommandSelect = (command: CommandEntry) => {
    // Only set the command if it's not already selected
    // This prevents closing the details when tapping on the active item
    if (command !== selectedCommand) {
      setSelectedCommand(command);
    }
  };

  const handleSidebarClose = () => {
    setSelectedCommand(null);
  };

  // Handle split drag to update sizes
  const handleDragEnd = useCallback((sizes: number[]) => {
    setSplitSizes(sizes);
  }, []);

  // Count commands but ONLY top-level ones for stats display
  const commandCounts = useMemo(() => {
    return countCommandStatuses(commands);
  }, [commands]);

  if (error) {
    return <ErrorDisplay error={error} />;
  }

  // If no command is selected, only render the commands list
  if (!selectedCommand) {
    return (
      <Box sx={{
        height: '100%',
        overflow: 'hidden',
        borderRadius: 2,
      }}>
        <Paper
          elevation={0}
          sx={{
            height: '100%',
            overflowY: 'auto',
            fontFamily: 'monospace',
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
                  isSelected={false}
                  isLastItem={index === commands.length - 1}
                />
              </React.Fragment>
            ))}
          </Box>
        </Paper>
      </Box>
    );
  }

  // If a command is selected, render the split view
  return (
    <Split
      sizes={splitSizes}
      minSize={[200, 200]}
      expandToMin={false}
      gutterSize={8}
      gutterAlign="center"
      snapOffset={30}
      dragInterval={1}
      direction="horizontal"
      cursor="col-resize"
      style={{ display: 'flex', height: '100%' }}
      onDragEnd={handleDragEnd}
    >
      {/* Commands List */}
      <Box sx={{
        height: '100%',
        overflow: 'hidden',
        borderRadius: 2,
      }}>
        <Paper
          elevation={0}
          sx={{
            height: '100%',
            overflowY: 'auto',
            fontFamily: 'monospace',
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
        borderRadius: 2,
      }}>
        <CommandDetailsSidebar
          command={selectedCommand}
          onClose={handleSidebarClose}
        />
      </Box>
    </Split>
  );
} 
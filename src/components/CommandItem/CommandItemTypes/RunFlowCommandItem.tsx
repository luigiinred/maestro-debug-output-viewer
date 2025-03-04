import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import { BaseCommandItem, BaseCommandItemProps } from './BaseCommandItem';
import { CommandItem } from '../index';
import { Command, CommandEntry } from '../../../types/commandTypes';

export const RunFlowCommandItem: React.FC<BaseCommandItemProps> = (props) => {
  const { commandEntry } = props;
  const metadata = commandEntry.metadata;
  const isSkipped = metadata.status === "SKIPPED";
  const duration = metadata.duration || 0;
  const runFlowCommand = commandEntry.command.runFlowCommand;
  
  const nestedCommands = runFlowCommand?.commands || [];
  
  // Default to collapsed if skipped or duration is 0
  const [expanded, setExpanded] = useState(!(isSkipped || duration === 0));
  
  const toggleExpanded = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering parent click events
    setExpanded(!expanded);
  };

  // Create the arrow button with the same dimensions as the placeholder
  const renderArrow = () => {
    if (nestedCommands.length > 0) {
      return (
        <Box 
          onClick={toggleExpanded} 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            cursor: 'pointer',
            ml: 1,
            width: 24, // Same width as TimestampPlaceholder
            height: 24, // Same height as TimestampPlaceholder
            '&:hover': {
              opacity: 0.8
            }
          }}
        >
          {expanded ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />}
        </Box>
      );
    }
    return null; // BaseCommandItem will use the default placeholder
  };

  // Format condition for display
  const renderConditionInfo = () => {
    if (!runFlowCommand?.condition) return null;
    
    const condition = runFlowCommand.condition;
    
    if ('scriptCondition' in condition) {
      return (
        <Box sx={{ mt: 1, ml: 4, color: 'text.secondary', fontSize: '0.85rem' }}>
          <Typography variant="body2" component="div" sx={{ fontFamily: 'monospace' }}>
            Condition: {condition.scriptCondition}
          </Typography>
        </Box>
      );
    } else if (condition.visible) {
      return (
        <Box sx={{ mt: 1, ml: 4, color: 'text.secondary', fontSize: '0.85rem' }}>
          <Typography variant="body2" component="div" sx={{ fontFamily: 'monospace' }}>
            Condition: Visible "{condition.visible.textRegex}"
            {condition.visible.optional ? " (optional)" : ""}
          </Typography>
        </Box>
      );
    } else if (condition.notVisible) {
      return (
        <Box sx={{ mt: 1, ml: 4, color: 'text.secondary', fontSize: '0.85rem' }}>
          <Typography variant="body2" component="div" sx={{ fontFamily: 'monospace' }}>
            Condition: Not Visible "{condition.notVisible.textRegex}"
            {condition.notVisible.optional ? " (optional)" : ""}
          </Typography>
        </Box>
      );
    }
    
    return null;
  };

  // Determine if we should show condition info
  const shouldShowCondition = !runFlowCommand?.flow && runFlowCommand?.condition;

  return (
    <>
      <BaseCommandItem 
        {...props} 
        getCommandTypeColor={() => '#3f51b5'} // Indigo for Run Flow
        renderAfterTimestamp={nestedCommands.length > 0 ? renderArrow() : undefined}
      />
           
      {nestedCommands.length > 0 && expanded && (
        <Box sx={{ paddingLeft: 4 }}>
          {nestedCommands.map((nestedCommand, index) => {
            // Ensure we're passing a proper CommandEntry
            const commandEntry: CommandEntry = {
              command: nestedCommand.command || nestedCommand as unknown as Command,
              metadata:  nestedCommand.command.metadata || {
                status: isSkipped ? "SKIPPED" : "COMPLETED", 
                timestamp: nestedCommand.metadata?.timestamp || props.startTime || 0,
                duration: nestedCommand.metadata?.duration || 0
              }
            };
            
            return (
              <CommandItem
                key={`nested-${index}`}
                commandEntry={commandEntry}
                index={index}
                startTime={props.startTime}
                onSelect={props.onSelect}
                isSelected={props.isSelected && index === 0} // You might want to adjust this logic
              />
            );
          })}
        </Box>
      )}
    </>
  );
};

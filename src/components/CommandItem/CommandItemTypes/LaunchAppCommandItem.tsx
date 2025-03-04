import React, { useState } from 'react';
import { Box, Typography, Collapse, IconButton } from '@mui/material';
import { BaseCommandItem, BaseCommandItemProps } from './BaseCommandItem';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';

export const LaunchAppCommandItem: React.FC<BaseCommandItemProps> = (props) => {
  const { commandEntry } = props;
  const launchAppCommand = commandEntry.command.launchAppCommand;
  const [showArguments, setShowArguments] = useState(false);
  
  const toggleArguments = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering parent onClick
    setShowArguments(!showArguments);
  };

  // Check if there are any launch arguments
  const hasLaunchArguments = launchAppCommand?.launchArguments && 
    Object.keys(launchAppCommand.launchArguments).length > 0;

  return (
    <>
      <BaseCommandItem 
        {...props} 
        getCommandTypeColor={() => '#2e7d32'} // Green for Launch App
      />
      
    </>
  );
}; 
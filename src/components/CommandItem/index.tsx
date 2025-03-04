import React from 'react';
import { CommandEntry } from '../../types/commandTypes';
import { BaseCommandItem, BaseCommandItemProps } from './CommandItemTypes/BaseCommandItem';
import { TapOnCommandItem } from './CommandItemTypes/TapOnCommandItem';
import { RunFlowCommandItem } from './CommandItemTypes/RunFlowCommandItem';
import { UnknownCommandItem } from './CommandItemTypes/UnknownCommandItem';
import { LaunchAppCommandItem } from './CommandItemTypes/LaunchAppCommandItem';

// Factory function to determine which CommandItem component to use
const getCommandItemComponent = (commandEntry: CommandEntry) => {
  if (!commandEntry?.command) {
    return UnknownCommandItem;
  }

  const commandEntryType = Object.keys(commandEntry?.command)?.[0];
  if (!commandEntryType) {
    return UnknownCommandItem;
  }

  switch (commandEntryType) {
    case 'tapOnCommand':
    case 'tapOnElement':
      return TapOnCommandItem;
    case 'runFlowCommand':
      return RunFlowCommandItem;
    case 'launchAppCommand':
      return LaunchAppCommandItem;
    // All other command types use the base component
    default:
      return BaseCommandItem;
  }
};

// Re-export the BaseCommandItemProps interface
export type { BaseCommandItemProps as CommandItemProps };

export const CommandItem: React.FC<BaseCommandItemProps> = (props) => {
  const { commandEntry } = props;
  
  const CommandItemComponent = getCommandItemComponent(commandEntry);
  
  return <CommandItemComponent {...props} />;
};

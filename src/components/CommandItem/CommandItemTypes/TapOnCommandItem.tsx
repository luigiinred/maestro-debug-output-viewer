import React from 'react';
import { BaseCommandItem, BaseCommandItemProps } from './BaseCommandItem';

export const TapOnCommandItem: React.FC<BaseCommandItemProps> = (props) => {
  return (
    <BaseCommandItem 
      {...props} 
      getCommandTypeColor={() => '#2196f3'} // Blue for Tap
    />
  );
};

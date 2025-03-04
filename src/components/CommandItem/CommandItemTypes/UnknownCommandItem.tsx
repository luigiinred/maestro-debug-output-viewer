import React from 'react';
import { BaseCommandItem, BaseCommandItemProps } from './BaseCommandItem';

export const UnknownCommandItem: React.FC<BaseCommandItemProps> = (props) => {
  console.log("UnknownCommandItem", props);
  return (
    <>
      <BaseCommandItem 
        {...props} 
        getCommandTypeColor={() => '#ff9800'} // Orange/warning color for unknown commands
      />
    </>
  );
}; 
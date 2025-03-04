import { useState } from 'react';

interface UseCommandExpansionResult {
  expandedCommands: Record<string, boolean>;
  toggleCommandExpand: (commandId: string) => void;
  isExpanded: (commandId: string) => boolean;
}

export function useCommandExpansion(): UseCommandExpansionResult {
  const [expandedCommands, setExpandedCommands] = useState<Record<string, boolean>>({});

  const toggleCommandExpand = (commandId: string) => {
    setExpandedCommands(prev => ({
      ...prev,
      [commandId]: !prev[commandId]
    }));
  };

  const isExpanded = (commandId: string): boolean => {
    return expandedCommands[commandId] || false;
  };

  return {
    expandedCommands,
    toggleCommandExpand,
    isExpanded
  };
} 
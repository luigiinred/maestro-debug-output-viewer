import {
  Box,
  Typography,
  Collapse,
  useTheme,
  alpha,
  Tooltip,
  Modal,
} from '@mui/material';
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { CommandEntry } from '../../../types/commandTypes';
import { getCommandName, getCommandDetails, formatTimestamp } from '../../../utils/commandUtils';

// Common placeholder component for consistent timestamp alignment
export const TimestampPlaceholder = () => (
  <Box
    sx={{
      ml: 1,
      width: 24, // Fixed width for consistent alignment
      height: 24, // Fixed height for consistent alignment
      visibility: 'hidden' // Hide it but keep the space
    }}
  />
);

export interface BaseCommandItemProps {
  commandEntry: CommandEntry;
  index: number;
  startTime: number | null;
  isLastItem?: boolean;
  onSelect: (command: CommandEntry) => void;
  isSelected: boolean;
  getCommandTypeColor?: () => string;
  renderAfterTimestamp?: React.ReactNode;
}

export const BaseCommandItem = ({
  commandEntry,
  index,
  startTime,
  onSelect,
  isSelected,
  getCommandTypeColor: customGetCommandTypeColor,
  renderAfterTimestamp = <TimestampPlaceholder /> // Default placeholder for consistent alignment
}: BaseCommandItemProps) => {
  const theme = useTheme();
  const location = useLocation();
  const commandName = getCommandName(commandEntry.command);
  const commandDetails = getCommandDetails(commandEntry.command);
  const isOptional = commandEntry.command && typeof commandEntry.command === 'object'
    ? Object.values(commandEntry.command)[0]?.optional
    : false;
  const isSkipped = commandEntry.metadata?.status === 'SKIPPED';
  const isFailed = commandEntry.metadata?.status === 'FAILED';
  const errorMessage = commandEntry.metadata?.error?.message;

  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Extract test directory from the URL
  const testDirectory = new URLSearchParams(location.search).get('dir') || '';

  // Fetch screenshot for failed commands
  useEffect(() => {
    if (isFailed && commandEntry.metadata?.timestamp && testDirectory && commandName) {
      // Reset states
      setScreenshotUrl(null);

      // Construct the URL for the screenshot
      const url = `/api/screenshot?directory=${encodeURIComponent(testDirectory)}&timestamp=${commandEntry.metadata.timestamp}&commandName=${encodeURIComponent(commandName)}`;

      // Check if the screenshot exists
      fetch(url, { method: 'HEAD' })
        .then(response => {
          if (response.ok) {
            setScreenshotUrl(url);
          }
        })
        .catch(err => {
          console.error('Error checking for screenshot:', err);
        });
    }
  }, [isFailed, commandEntry.metadata?.timestamp, testDirectory, commandName]);

  const handleSelect = () => {
    onSelect(commandEntry);
  };

  const handleOpenModal = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the command selection
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const getStatusColor = () => {
    if (!commandEntry.metadata) return theme.palette.text.disabled; // Default to disabled text color

    switch (commandEntry.metadata.status) {
      case 'COMPLETED':
        return theme.palette.success.main;  // Green
      case 'FAILED':
        return theme.palette.error.main;  // Red
      case 'SKIPPED':
        return theme.palette.warning.main;  // Orange
      default:
        return theme.palette.text.disabled;  // Disabled text color
    }
  };

  const getStatusIcon = () => {
    if (!commandEntry.metadata) return '•'; // Default icon if metadata is missing

    switch (commandEntry.metadata.status) {
      case 'COMPLETED':
        return '✓';
      case 'FAILED':
        return '✗';
      case 'SKIPPED':
        return '⦿';
      default:
        return '•';
    }
  };

  // Get command type color - can be overridden by specific command types
  const getCommandTypeColor = () => {
    if (customGetCommandTypeColor) {
      return customGetCommandTypeColor();
    }

    // Default color handling
    const isRunFlowCommand = !!commandEntry.command.runFlowCommand;
    const isApplyConfigCommand = !!commandEntry.command.applyConfigurationCommand;
    const isTapCommand = !!commandEntry.command.tapOnElement || !!commandEntry.command.tapOnElementCommand;
    const isInputCommand = !!commandEntry.command.inputTextCommand;
    const isAssertCommand = !!commandEntry.command.assertConditionCommand;
    const isOpenLinkCommand = !!commandEntry.command.openLinkCommand;
    const isLaunchAppCommand = !!commandEntry.command.launchAppCommand;
    const isStopAppCommand = !!commandEntry.command.stopAppCommand;
    const isDefineVariablesCommand = !!commandEntry.command.defineVariablesCommand;

    if (isRunFlowCommand) return '#3f51b5'; // Indigo for Run Flow
    if (isApplyConfigCommand) return '#9c27b0'; // Purple for Apply Config
    if (isTapCommand) return '#2196f3'; // Blue for Tap
    if (isInputCommand) return '#009688'; // Teal for Input
    if (isAssertCommand) return '#ff5722'; // Deep Orange for Assert
    if (isOpenLinkCommand) return '#e91e63'; // Pink for Open Link
    if (isLaunchAppCommand) return '#4caf50'; // Green for Launch App
    if (isStopAppCommand) return '#f44336'; // Red for Stop App
    if (isDefineVariablesCommand) return '#ff9800'; // Orange for Define Variables
    return '#757575'; // Grey for others
  };

  return (
    <Box sx={{ mb: 0 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1,
          py: 0.5,
          backgroundColor: isSelected
            ? alpha(theme.palette.primary.main, 0.12)
            : 'transparent',
          '&:hover': {
            backgroundColor: isSelected
              ? alpha(theme.palette.primary.main, 0.18)
              : alpha(theme.palette.action.hover, 0.04),
          },
          cursor: 'pointer',
          opacity: isSkipped ? 0.75 : 1,
          textDecoration: isSkipped ? 'line-through' : 'none',
          borderRadius: 1,
        }}
        onClick={handleSelect}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          {/* Status icon */}
          <Box
            sx={{
              color: getStatusColor(),
              mr: 1.5,
              fontSize: '1rem',
              width: 16,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            {getStatusIcon()}
          </Box>

          {/* Command name and details */}
          <Box
            sx={{
              flexGrow: 1,
              display: 'flex',
              overflow: 'hidden',
              mr: 2,
              minWidth: 0, // This is crucial for proper text truncation
            }}
          >
            <Typography
              variant="body2"
              sx={{
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontSize: '0.85rem',
                fontFamily: 'monospace',
                color: commandEntry.metadata?.status === 'FAILED' ? theme.palette.error.main : 'inherit',
                width: '100%', // Take full width of parent
              }}
            >
              <span style={{ fontWeight: 500 }}>{commandName}</span>
              {' '}
              <span style={{ opacity: 0.7 }}>{commandDetails}</span>
              {isOptional && <span style={{ fontSize: '0.7rem', color: '#666', marginLeft: 4 }}>(Optional)</span>}
            </Typography>
          </Box>

          {/* Timestamp and optional content after timestamp */}
          <Box sx={{ display: 'flex', alignItems: 'center', ml: 'auto', flexShrink: 0 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                fontSize: '0.75rem',
                whiteSpace: 'nowrap',
                fontFamily: 'monospace'
              }}
            >
              {formatTimestamp(commandEntry.metadata?.timestamp, index, startTime)}
            </Typography>

            {renderAfterTimestamp}

            {/* Screenshot thumbnail for failed tests */}
            {isFailed && screenshotUrl && (
              <Tooltip title="View screenshot">
                <Box
                  sx={{
                    ml: 1,
                    width: 24,
                    height: 24,
                    borderRadius: '4px',
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor: 'divider',
                    cursor: 'pointer',
                  }}
                  onClick={handleOpenModal}
                >
                  <img
                    src={screenshotUrl}
                    alt="Failure Screenshot"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                </Box>
              </Tooltip>
            )}
          </Box>
        </Box>
      </Box>



      {/* Modal for displaying larger screenshot */}
      <Modal
        open={isModalOpen}
        onClose={handleCloseModal}
        aria-labelledby="screenshot-modal"
        aria-describedby="failed-test-screenshot"
      >
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          bgcolor: 'background.paper',
          boxShadow: 24,
          p: 2,
          borderRadius: 1,
          maxWidth: '90vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <Typography id="screenshot-modal" variant="h6" component="h2" sx={{ mb: 2 }}>
            Failure Screenshot: {commandName}
          </Typography>
          <Box sx={{
            overflow: 'auto',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            {screenshotUrl && (
              <img
                src={screenshotUrl}
                alt="Failure Screenshot"
                style={{
                  maxWidth: '100%',
                  maxHeight: 'calc(90vh - 80px)',
                  objectFit: 'contain',
                }}
              />
            )}
          </Box>
        </Box>
      </Modal>
    </Box>
  );
};

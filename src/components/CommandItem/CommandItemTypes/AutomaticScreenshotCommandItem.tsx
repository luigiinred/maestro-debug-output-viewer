import React, { useState } from 'react';
import { Box, Modal, Typography } from '@mui/material';
import { BaseCommandItem, BaseCommandItemProps } from './BaseCommandItem';
import PhotoIcon from '@mui/icons-material/Photo';

/**
 * Formats a timestamp into a human-readable date and time
 * @param timestamp The timestamp to format
 * @returns A formatted date and time string
 */
function formatScreenshotTimestamp(timestamp: number): string {
    if (!timestamp) return 'Unknown time';

    const date = new Date(timestamp);

    // Format: "Dec 4, 2024 11:54:29.084"
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }) + '.' + date.getMilliseconds().toString().padStart(3, '0');
}

export const AutomaticScreenshotCommandItem: React.FC<BaseCommandItemProps> = (props) => {
    const { commandEntry } = props;
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleOpenModal = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent triggering the command selection
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    // Custom color for screenshot commands
    const getCommandTypeColor = () => {
        return '#8e24aa'; // Purple color for screenshot commands
    };

    // Custom content to render after the timestamp
    const renderAfterTimestamp = () => {
        const imageUrl = commandEntry.command.automaticScreenshotCommand?.imageUrl;

        if (!imageUrl) return null;

        return (
            <Box
                sx={{
                    ml: 1,
                    width: 24,
                    height: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#8e24aa', // Purple color for the icon
                }}
                onClick={handleOpenModal}
            >
                <PhotoIcon fontSize="small" />
            </Box>
        );
    };

    // Extract the timestamp for display in the modal
    const timestamp = commandEntry.metadata?.timestamp || 0;
    const formattedTimestamp = formatScreenshotTimestamp(timestamp);

    return (
        <>
            <BaseCommandItem
                {...props}
                getCommandTypeColor={getCommandTypeColor}
                renderAfterTimestamp={renderAfterTimestamp()}
            />

            {/* Modal for displaying the full-size screenshot */}
            <Modal
                open={isModalOpen}
                onClose={handleCloseModal}
                aria-labelledby="screenshot-modal"
                aria-describedby="view full screenshot"
            >
                <Box sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    bgcolor: 'background.paper',
                    boxShadow: 24,
                    p: 4,
                    maxWidth: '90vw',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    borderRadius: 2,
                }}>
                    <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
                        Automatic Screenshot
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Captured at {formattedTimestamp}
                    </Typography>
                    <img
                        src={commandEntry.command.automaticScreenshotCommand?.imageUrl || ''}
                        alt="Automatic Screenshot"
                        style={{ maxWidth: '100%', maxHeight: '70vh' }}
                    />
                </Box>
            </Modal>
        </>
    );
}; 
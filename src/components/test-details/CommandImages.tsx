import { Box, Typography, ImageList, ImageListItem, Modal } from '@mui/material';
import { useState, useEffect } from 'react';
import { getCommandName } from '../../utils/commandUtils';
import { CommandEntry } from '../../types/commandTypes';

interface CommandImagesProps {
  command: CommandEntry;
  testDirectory: string;
}

interface CommandImage {
  path: string;
  url: string;
}

export function CommandImages({ command, testDirectory }: CommandImagesProps) {
  const [images, setImages] = useState<CommandImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  console.log('CommandImages - Component mounted/updated with props:', {
    command,
    testDirectory,
    hasCommand: !!command,
    hasMetadata: !!command?.metadata,
    hasTimestamp: !!command?.metadata?.timestamp
  });

  useEffect(() => {
    const fetchImages = async () => {
      console.log('CommandImages - fetchImages starting with:', {
        command,
        testDirectory,
        timestamp: command.metadata?.timestamp,
        commandName: getCommandName(command.command)
      });

      if (!command.metadata?.timestamp || !testDirectory) {
        console.log('CommandImages - Missing required data:', {
          hasTimestamp: !!command.metadata?.timestamp,
          timestamp: command.metadata?.timestamp,
          hasTestDirectory: !!testDirectory,
          testDirectory: testDirectory
        });
        setLoading(false);
        return;
      }

      const commandName = getCommandName(command.command);
      const url = `http://localhost:3001/api/command-images/${encodeURIComponent(commandName)}?` +
                 `dir=${encodeURIComponent(testDirectory)}&` +
                 `timestamp=${command.metadata.timestamp}`;
      
      console.log('CommandImages - Fetching images from:', url);

      try {
        console.log('CommandImages - Starting fetch request');
        const response = await fetch(url);
        console.log('CommandImages - Response received:', {
          status: response.status,
          ok: response.ok,
          statusText: response.statusText
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('CommandImages - Error response:', errorData);
          throw new Error(errorData.error || 'Failed to fetch images');
        }

        const data = await response.json();
        console.log('CommandImages - Received images data:', data);
        setImages(data.images || []);
        setError(null);
      } catch (err) {
        console.error('CommandImages - Error fetching images:', err);
        setError(err instanceof Error ? err.message : 'Failed to load command images');
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [command, testDirectory]);

  console.log('CommandImages - Current state:', {
    loading,
    error,
    imagesCount: images.length,
    testDirectory,
    hasCommand: !!command,
    commandName: command ? getCommandName(command.command) : null
  });

  if (loading) {
    return <Typography>Loading images...</Typography>;
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  if (images.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        Command Images
      </Typography>
      <ImageList sx={{ maxHeight: 300 }} cols={2} rowHeight={164}>
        {images.map((image, index) => (
          <ImageListItem 
            key={image.path}
            onClick={() => setSelectedImage(image.url)}
            sx={{ cursor: 'pointer' }}
          >
            <img
              src={`http://localhost:3001${image.url}`}
              alt={`Command execution ${index + 1}`}
              loading="lazy"
              style={{ objectFit: 'contain' }}
            />
          </ImageListItem>
        ))}
      </ImageList>

      <Modal
        open={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box
          component="img"
          src={selectedImage ? `http://localhost:3001${selectedImage}` : ''}
          alt="Command execution detail"
          sx={{
            maxWidth: '90vw',
            maxHeight: '90vh',
            objectFit: 'contain',
            bgcolor: 'background.paper',
            boxShadow: 24,
            p: 1,
          }}
        />
      </Modal>
    </Box>
  );
} 
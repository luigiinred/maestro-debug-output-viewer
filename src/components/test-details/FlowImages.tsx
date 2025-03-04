import { Box, ImageList, ImageListItem, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { createFlowImagesUrl, createFileContentUrl } from '../../utils/apiConfig';

interface FlowImage {
  path: string;
  url: string;
  timestamp: number;
  filename: string;
}

interface FlowImagesProps {
  testId: string;
  directory: string;
  flowName: string;
}

function formatTimestamp(timestamp: number): string {
  if (!timestamp) return 'Unknown time';

  const date = new Date(timestamp);
  const timeStr = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);

  // Add milliseconds manually
  const ms = date.getMilliseconds().toString().padStart(3, '0');
  return `${timeStr}.${ms}`;
}

export function FlowImages({ testId, directory, flowName }: FlowImagesProps) {
  const [images, setImages] = useState<FlowImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchImages = async () => {
      console.log('Fetching images with params:', { directory, flowName });

      try {
        const apiUrl = await createFlowImagesUrl(directory, flowName);
        const response = await fetch(apiUrl);

        console.log('Response status:', response.status);

        if (!response.ok) {
          throw new Error('Failed to fetch flow images');
        }

        const data = await response.json();
        console.log('Received images:', data);

        setImages(data.images);

        // Pre-generate image URLs
        const urls: Record<string, string> = {};
        for (const image of data.images) {
          urls[image.path] = await createFileContentUrl(image.path);
        }
        setImageUrls(urls);
      } catch (err) {
        console.error('Error fetching images:', err);
        setError(err instanceof Error ? err.message : 'Failed to load images');
      }
    };

    if (directory && flowName) {
      fetchImages();
    } else {
      console.log('Missing required params:', { directory, flowName });
    }
  }, [directory, flowName]);

  if (error) {
    return (
      <Box sx={{ mt: 2 }}>
        <Typography color="error">Error loading images: {error}</Typography>
      </Box>
    );
  }

  if (images.length === 0) {
    return (
      <Box sx={{ mt: 2 }}>
        <Typography>No images found for this test flow.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Flow Images ({images.length})</Typography>
      <ImageList cols={1} gap={8}>
        {images.map((image, index) => (
          <ImageListItem key={image.path}>
            <Box sx={{ position: 'relative' }}>
              <img
                src={imageUrls[image.path] || ''}
                alt={`Flow step ${index + 1}`}
                loading="lazy"
                style={{ maxWidth: '100%', height: 'auto' }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  bgcolor: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  padding: 1,
                  fontSize: '0.875rem',
                }}
              >
                <Typography variant="caption" sx={{ display: 'block', textAlign: 'center' }}>
                  {formatTimestamp(image.timestamp)}
                </Typography>
              </Box>
            </Box>
          </ImageListItem>
        ))}
      </ImageList>
    </Box>
  );
} 
import { useEffect, useState } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  ListItemIcon,
  Chip,
  IconButton,
  useMediaQuery,
  useTheme,
  Button,
  Divider,
  Paper,
  Checkbox,
  ListSubheader,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Tooltip,
} from '@mui/material';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import MenuIcon from '@mui/icons-material/Menu';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import FolderIcon from '@mui/icons-material/Folder';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import SyncIcon from '@mui/icons-material/Sync';
import SyncDisabledIcon from '@mui/icons-material/SyncDisabled';
import { getTestStatus, getFlowStatus, getTestStatusFromPath } from '../utils/testStatusUtils';
import { useNavigate } from 'react-router-dom';
import { createDirectoryListUrl, createFileContentUrl, createDeleteTestRunUrl, fetchWithRetry } from '../utils/apiConfig';
import websocketService, { WebSocketMessage } from '../utils/websocketService';

interface FileInfo {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modifiedTime?: string;
  testStatus?: 'COMPLETED' | 'FAILED';
  testDuration?: number;
  flowStatus?: 'PASSED' | 'FAILED';
  testCount?: number;  // Total number of tests in flow
  failedCount?: number;  // Number of failed tests
  selected?: boolean;  // For selection in the UI
  date?: Date;  // For grouping by day
  hasTests?: boolean;  // Whether the flow has tests
}

interface TestExplorerProps {
  selectedTest: string | null;
  onTestSelect: (testId: string) => void;
}

interface CommandMetadata {
  status?: 'COMPLETED' | 'FAILED' | 'SKIPPED';
  timestamp?: number;
  duration?: number;
}

interface CommandEntry {
  command: Record<string, unknown>;
  metadata?: CommandMetadata;
}

export function TestExplorer({
  selectedTest,
  onTestSelect,
}: TestExplorerProps) {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [testsPath, setTestsPath] = useState<string>('');
  const [isInTestRun, setIsInTestRun] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const navigate = useNavigate();

  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    fetchFiles();

    // Initialize WebSocket connection
    initializeWebSocket();

    // Clean up WebSocket connection on unmount
    return () => {
      websocketService.disconnect();
    };
  }, []);

  // Initialize WebSocket connection and set up event handlers
  const initializeWebSocket = async () => {
    await websocketService.connect({
      onOpen: () => {
        console.log('WebSocket connected');
        setWsConnected(true);
      },
      onMessage: handleWebSocketMessage,
      onClose: () => {
        console.log('WebSocket disconnected');
        setWsConnected(false);
      },
      onError: (error) => {
        console.error('WebSocket error:', error);
        setWsConnected(false);
      }
    });
  };

  // Handle WebSocket messages
  const handleWebSocketMessage = (message: WebSocketMessage) => {
    console.log('Received WebSocket message:', message);

    // If we receive a change event, refetch the files
    if (message.type === 'change') {
      console.log('File change detected, refetching files...');
      fetchFiles();
    }
  };

  const fetchFiles = async () => {
    try {
      setLoading(true);
      setError('');

      // First try to get the current directory from localStorage
      const testDir = localStorage.getItem('maestro-test-dir');
      const apiUrl = await createDirectoryListUrl(testDir || undefined);

      console.log('Fetching files from:', apiUrl);

      const response = await fetchWithRetry(apiUrl);
      const data: FileInfo[] = await response.json();
      console.log('Fetched files:', data.length);

      // Store the current path
      if (data.length > 0) {
        const dirPath = data[0].path.split('/').slice(0, -1).join('/');
        setCurrentPath(dirPath);
        console.log('Current directory:', dirPath);
      } else {
        console.log('No files found in directory');
      }

      // First, check if we're already in a test run directory (has command files)
      const hasCommandFiles = data.some(file => isCommandFile(file.name));
      if (hasCommandFiles) {
        console.log('Already in a test run directory');
        setIsInTestRun(true);
        processTestFiles(data);
        return;
      }

      // Check if we're in the tests directory by looking for timestamp-based directories
      const hasTestRuns = data.some((file: FileInfo) =>
        file.type === 'directory' && /^\d{4}-\d{2}-\d{2}_\d{6}$/.test(file.name)
      );
      if (hasTestRuns) {
        console.log('In tests directory, showing test runs');
        setTestsPath(currentPath);
        setIsInTestRun(false);
        processTestRuns(data);

        // Set up watcher for the tests directory
        if (wsConnected) {
          try {
            const watchResult = await websocketService.watchDirectory(currentPath);
            console.log('Watch directory result:', watchResult);
          } catch (watchError) {
            console.error('Error setting up directory watch:', watchError);
          }
        }

        return;
      }

      // Check for .maestro directory
      const maestroDir = data.find(file =>
        file.type === 'directory' && file.name === '.maestro'
      );

      if (maestroDir) {
        console.log('Found .maestro directory, looking for tests directory');
        // Look in .maestro directory
        const maestroUrl = await createDirectoryListUrl(maestroDir.path);

        try {
          const maestroResponse = await fetchWithRetry(maestroUrl);
          const maestroData = await maestroResponse.json();
          const testsDir = maestroData.find((file: FileInfo) =>
            file.type === 'directory' && file.name === 'tests'
          );

          if (testsDir) {
            console.log('Found tests directory, fetching test runs');
            const testsUrl = await createDirectoryListUrl(testsDir.path);

            try {
              const testsResponse = await fetchWithRetry(testsUrl);
              const testsData = await testsResponse.json();
              setTestsPath(testsDir.path);
              setIsInTestRun(false);
              processTestRuns(testsData);

              // Set up watcher for the .maestro/tests directory
              if (wsConnected) {
                try {
                  const watchResult = await websocketService.watchDirectory(testsDir.path);
                  console.log('Watch directory result:', watchResult);
                } catch (watchError) {
                  console.error('Error setting up directory watch:', watchError);
                }
              }

              return;
            } catch (testsError) {
              console.error('Error fetching tests directory:', testsError);
              throw testsError;
            }
          } else {
            setError('No tests directory found in .maestro');
            setFiles([]);
            return;
          }
        } catch (maestroError) {
          console.error('Error fetching .maestro directory:', maestroError);
          throw maestroError;
        }
      }

      setError(`No .maestro directory found in ${currentPath || 'current directory'}.\nMake sure you're in a project with Maestro tests.`);
      setFiles([]);
    } catch (error) {
      console.error('Error fetching files:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch files');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const processTestRuns = (data: FileInfo[]) => {
    // Filter and sort test run directories
    const testRuns = data
      .filter((file: FileInfo) =>
        file.type === 'directory' && /^\d{4}-\d{2}-\d{2}_\d{6}$/.test(file.name)
      )
      .sort((a: FileInfo, b: FileInfo) => b.name.localeCompare(a.name));

    if (testRuns.length === 0) {
      setError('No test runs found in tests directory');
      setFiles([]);
      return;
    }

    // For each test run, fetch its contents to count tests and failures
    Promise.all(
      testRuns.map(async (testRun) => {
        try {
          // Parse the date from the directory name
          const datePart = testRun.name.substring(0, 10); // YYYY-MM-DD
          const timePart = testRun.name.substring(11, 17); // HHMMSS

          // Create a date object, handling potential future dates
          let testDate;
          try {
            testDate = new Date(
              parseInt(datePart.substring(0, 4)), // Year
              parseInt(datePart.substring(5, 7)) - 1, // Month (0-based)
              parseInt(datePart.substring(8, 10)), // Day
              parseInt(timePart.substring(0, 2)), // Hour
              parseInt(timePart.substring(2, 4)), // Minute
              parseInt(timePart.substring(4, 6)) // Second
            );

            // Check if date is valid
            if (isNaN(testDate.getTime())) {
              console.warn(`Invalid date parsed from directory name: ${testRun.name}`);
              // Use current date as fallback
              testDate = new Date();
            }

            // Check if date is in the future
            const now = new Date();
            if (testDate > now) {
              console.warn(`Future date detected in directory name: ${testRun.name}, using current date instead`);
              testDate = now;
            }
          } catch (dateError) {
            console.error(`Error parsing date from directory name: ${testRun.name}`, dateError);
            // Use current date as fallback
            testDate = new Date();
          }

          // Fetch the test run contents to count tests and failures
          const testRunUrl = await createDirectoryListUrl(testRun.path);
          try {
            const testRunResponse = await fetchWithRetry(testRunUrl);
            const testRunData = await testRunResponse.json();

            // Count the number of tests and failures
            const testFiles = testRunData.filter((file: FileInfo) => isCommandFile(file.name));
            const testCount = testFiles.length;

            // Count failures by checking each test file
            let failedCount = 0;

            for (const testFile of testFiles) {
              try {
                const testStatus = await getTestStatusFromPath(testFile.path);
                if (testStatus === 'FAILED') {
                  failedCount++;
                }
              } catch (statusError) {
                console.error(`Error getting test status for ${testFile.name}:`, statusError);
              }
            }

            return {
              ...testRun,
              testCount,
              failedCount,
              selected: selectedFiles.includes(testRun.path),
              date: testDate
            };
          } catch (fetchError) {
            console.error(`Error fetching test run ${testRun.name}:`, fetchError);
            return {
              ...testRun,
              testCount: 0,
              failedCount: 0,
              selected: selectedFiles.includes(testRun.path),
              date: testDate,
              error: fetchError instanceof Error ? fetchError.message : 'Failed to fetch test run'
            };
          }
        } catch (error) {
          console.error(`Error processing test run ${testRun.name}:`, error);
          return {
            ...testRun,
            testCount: 0,
            failedCount: 0,
            selected: selectedFiles.includes(testRun.path),
            date: new Date(), // Fallback to current date
            error: error instanceof Error ? error.message : 'Error processing test run'
          };
        }
      })
    ).then((processedRuns) => {
      setFiles(processedRuns);
      setLoading(false);
    }).catch((error) => {
      console.error('Error processing test runs:', error);
      setError('Error processing test runs: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setLoading(false);
    });
  };

  const handleFileClick = async (file: FileInfo) => {
    if (selectedTest === file.path) {
      // Already selected
      return;
    }

    if (file.type === 'file') {
      onTestSelect(file.path);
      if (isSmallScreen) setDrawerOpen(false);
    } else if (file.type === 'directory') {
      // Fetch contents of the test run directory
      try {
        const dirUrl = await createDirectoryListUrl(file.path);
        const response = await fetch(dirUrl);
        if (response.ok) {
          const data = await response.json();
          setCurrentPath(file.path);
          setIsInTestRun(true);
          processTestFiles(data);
        }
      } catch (error) {
        console.error('Error fetching directory:', error);
      }
    }
  };

  const handleBackClick = () => {
    if (isInTestRun && testsPath) {
      // Use the API config utility for directory listing
      createDirectoryListUrl(testsPath).then(apiUrl => {
        fetch(apiUrl)
          .then(response => response.json())
          .then(data => {
            setCurrentPath(testsPath);
            setIsInTestRun(false);
            processTestRuns(data);
          })
          .catch(error => {
            console.error('Error fetching parent directory:', error);
            setError('Failed to go back to test runs');
          });
      });
    }
  };

  const formatTestRunName = (name: string): string => {
    const match = name.match(/^(\d{4})-(\d{2})-(\d{2})_(\d{2})(\d{2})(\d{2})$/);
    if (!match) return name;

    const [_, year, month, day, hour, minute, second] = match;
    const date = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second)
    );

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(date);
  };

  const processTestFiles = (data: FileInfo[]) => {
    // Filter for command files only
    let filteredFiles = data.filter(file => {
      return file.type === 'file' && isCommandFile(file.name);
    });

    console.log('Found command files:', filteredFiles.map(f => f.name));

    if (filteredFiles.length === 0) {
      setError(`No test files found in ${currentPath || 'current directory'}.\nMake sure you're in a .maestro/tests/<test-run> directory.`);
      setFiles([]);
      return;
    }

    // Fetch test metadata for command files
    Promise.all(
      filteredFiles.map(async (file) => {
        try {
          const fileUrl = await createFileContentUrl(file.path);
          const metadataResponse = await fetch(fileUrl);
          if (metadataResponse.ok) {
            const testData = await metadataResponse.json();

            if (Array.isArray(testData) && testData.length > 0) {
              const testStatus = getTestStatus(testData);

              return {
                ...file,
                testStatus,
                testDuration: calculateTotalDuration(testData),
                hasTests: testData.length > 0
              };
            }
          }
        } catch (error) {
          console.error('Error fetching test metadata:', error);
        }
        return {
          ...file,
          hasTests: false
        };
      })
    ).then(filesWithMetadata => {
      filteredFiles = filesWithMetadata as FileInfo[];

      // Determine overall flow status
      const testStatuses = filteredFiles
        .map(file => file.testStatus)
        .filter((status): status is 'COMPLETED' | 'FAILED' => status !== undefined);

      const flowStatus = getFlowStatus(testStatuses);

      // Add flow status to each file
      filteredFiles = filteredFiles.map(file => ({
        ...file,
        flowStatus
      }));

      // Filter out flows that have no tests
      filteredFiles = filteredFiles.filter(file => file.hasTests);

      setFiles(filteredFiles);
      setError('');
    });
  };

  const calculateTotalDuration = (commands: CommandEntry[]): number => {
    if (!Array.isArray(commands) || commands.length === 0) return 0;
    return commands.reduce((total, cmd) => {
      return total + (cmd.metadata?.duration || 0);
    }, 0);
  };

  const isCommandFile = (name: string): boolean => {
    return name.startsWith('commands-') && name.endsWith('.json');
  };

  const formatCommandFileName = (name: string): string => {
    if (!isCommandFile(name)) return name;
    const match = name.match(/^commands-\((.*)\)\.json$/);
    return match ? match[1] : name;
  };

  const formatDuration = (duration: number): string => {
    if (!duration) return '';

    const totalSeconds = Math.floor(duration / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = duration % 1000;

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else if (seconds > 0) {
      return `${seconds}.${milliseconds.toString().padStart(3, '0').substring(0, 1)}s`;
    } else {
      return `${milliseconds}ms`;
    }
  };

  // Get status icon based on test status
  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircleOutlineIcon fontSize="small" color="success" />;
      case 'FAILED':
        return <ErrorOutlineIcon fontSize="small" color="error" />;
      default:
        return <PlayArrowIcon color="success" fontSize="small" />;
    }
  };

  // Toggle selection mode
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      // Exit selection mode
      setSelectedFiles([]);
    }
  };

  // Toggle selection of a file
  const toggleFileSelection = (file: FileInfo, event: React.MouseEvent) => {
    event.stopPropagation();

    if (!selectionMode) {
      // If not in selection mode, handle as normal click
      handleFileClick(file);
      return;
    }

    setFiles(prevFiles =>
      prevFiles.map(f =>
        f.path === file.path
          ? { ...f, selected: !f.selected }
          : f
      )
    );

    setSelectedFiles(prevSelected => {
      if (prevSelected.includes(file.path)) {
        return prevSelected.filter(path => path !== file.path);
      } else {
        return [...prevSelected, file.path];
      }
    });
  };

  // Delete selected test runs
  const deleteSelectedTestRuns = async () => {
    if (selectedFiles.length === 0) return;

    setIsDeleting(true);

    try {
      // Delete each selected test run
      await Promise.all(
        selectedFiles.map(async (filePath) => {
          try {
            const deleteUrl = await createDeleteTestRunUrl(filePath);
            const response = await fetch(deleteUrl, { method: 'DELETE' });

            if (!response.ok) {
              throw new Error(`Failed to delete test run: ${response.statusText}`);
            }

            return response.json();
          } catch (error) {
            console.error(`Error deleting test run ${filePath}:`, error);
            throw error;
          }
        })
      );

      // Refresh the file list
      fetchFiles();

      // Exit selection mode
      setSelectionMode(false);
      setSelectedFiles([]);
    } catch (error) {
      console.error('Error deleting test runs:', error);
      setError('Failed to delete one or more test runs');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  // Group files by date category
  const groupFilesByDate = (files: FileInfo[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Calculate reference dates
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const oneMonthAgo = new Date(today);
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const groups: { [key: string]: FileInfo[] } = {
      'Today': [],
      'Yesterday': [],
      'Last 7 Days': [],
      'Last 30 Days': [],
      'Older': []
    };

    files.forEach(file => {
      if (!file.date) {
        groups['Older'].push(file);
        return;
      }

      const fileDate = new Date(file.date.getFullYear(), file.date.getMonth(), file.date.getDate());

      if (fileDate.getTime() === today.getTime()) {
        groups['Today'].push(file);
      } else if (fileDate.getTime() === yesterday.getTime()) {
        groups['Yesterday'].push(file);
      } else if (fileDate.getTime() < yesterday.getTime() && fileDate.getTime() >= oneWeekAgo.getTime()) {
        // Between 1 week ago and yesterday (exclusive)
        groups['Last 7 Days'].push(file);
      } else if (fileDate.getTime() < oneWeekAgo.getTime() && fileDate.getTime() >= oneMonthAgo.getTime()) {
        // Between 1 month ago and 1 week ago (exclusive)
        groups['Last 30 Days'].push(file);
      } else {
        // Older than 1 month
        groups['Older'].push(file);
      }
    });

    return groups;
  };

  return (
    <Drawer
      variant={isSmallScreen ? 'temporary' : 'permanent'}
      open={isSmallScreen ? drawerOpen : true}
      onClose={() => setDrawerOpen(false)}
      sx={{
        width: 300,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 300,
          boxSizing: 'border-box',
          height: '100vh',
          position: 'relative',
          border: 'none',
        },
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 0,
          ml: 0,
          mt: 2,
          mb: 2,
          borderWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'background.paper',
          borderRadius: 2,
          height: 'calc(100% - 32px)', // Adjust for margins
          overflow: 'hidden', // Prevent outer scrolling
        }}
      >
        <Box sx={{
          p: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden', // Prevent outer scrolling
        }}>
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 1,
            flexShrink: 0, // Prevent header from shrinking
          }}>
            {isInTestRun && (
              <IconButton onClick={handleBackClick} size="small">
                <ArrowBackIcon />
              </IconButton>
            )}

            {!isInTestRun && !error && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                {/* WebSocket connection status indicator */}
                <Tooltip title={wsConnected ? "Auto-refresh active" : "Auto-refresh inactive"}>
                  <IconButton
                    color={wsConnected ? "success" : "default"}
                    onClick={initializeWebSocket}
                    size="small"
                  >
                    {wsConnected ? <SyncIcon fontSize="small" /> : <SyncDisabledIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>

                <Button
                  size="small"
                  variant={selectionMode ? "contained" : "outlined"}
                  onClick={toggleSelectionMode}
                  color={selectionMode ? "primary" : "inherit"}
                >
                  {selectionMode ? "Cancel" : "Select"}
                </Button>

                {selectionMode && (
                  <Tooltip title="Delete selected test runs">
                    <Button
                      size="small"
                      variant="contained"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => setDeleteDialogOpen(true)}
                      disabled={selectedFiles.length === 0 || isDeleting}
                    >
                      Delete
                    </Button>
                  </Tooltip>
                )}
              </Box>
            )}
          </Box>

          {error ? (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography color="error" variant="body2" sx={{ mb: 1, whiteSpace: 'pre-wrap' }}>
                {error}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Current directory: {currentPath || 'unknown'}
              </Typography>
              <Button
                variant="outlined"
                sx={{ mt: 2 }}
                onClick={() => {
                  localStorage.removeItem('maestro-test-dir');
                  fetchFiles();
                }}
              >
                Reset Directory
              </Button>
            </Box>
          ) : loading ? (
            <Box sx={{ p: 2 }}>
              <Typography>Loading...</Typography>
            </Box>
          ) : (
            <>
              {isInTestRun && files.length > 0 && files[0].flowStatus && (
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  mb: 1,
                  px: 1,
                  flexShrink: 0, // Prevent from shrinking
                }}>
                  <Typography variant="body2" sx={{ mr: 1 }}>
                    Flow Status:
                  </Typography>
                  <Chip
                    size="small"
                    label={files[0].flowStatus}
                    color={files[0].flowStatus === 'PASSED' ? 'success' : 'error'}
                    icon={files[0].flowStatus === 'PASSED' ?
                      <CheckCircleOutlineIcon fontSize="small" /> :
                      <ErrorOutlineIcon fontSize="small" />}
                    sx={{ height: 24 }}
                  />
                </Box>
              )}

              {isInTestRun ? (
                <Box sx={{
                  flexGrow: 1,
                  overflow: 'auto',
                  height: '100%', // Take remaining height
                }}>
                  <List dense>
                    {files.map((file) => (
                      <ListItem key={file.path} disablePadding>
                        <ListItemButton
                          onClick={() => handleFileClick(file)}
                          selected={file.path === selectedTest}
                          dense
                          sx={{ py: 0.5, borderRadius: 1 }}
                        >
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            {file.testStatus ? getStatusIcon(file.testStatus) : <InsertDriveFileIcon fontSize="small" />}
                          </ListItemIcon>
                          <ListItemText
                            primary={formatCommandFileName(file.name)}
                            secondary={file.testDuration ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                                <AccessTimeIcon fontSize="small" sx={{ mr: 0.5, fontSize: '0.75rem', color: 'text.secondary' }} />
                                <Typography variant="caption" color="text.secondary">
                                  {formatDuration(file.testDuration)}
                                </Typography>
                              </Box>
                            ) : undefined}
                            primaryTypographyProps={{
                              noWrap: false,
                              variant: "body2",
                              sx: { lineHeight: 1.2 }
                            }}
                            secondaryTypographyProps={{
                              noWrap: false,
                              variant: "caption",
                              sx: { lineHeight: 1.2 }
                            }}
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              ) : (
                <Box sx={{
                  flexGrow: 1,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%', // Take remaining height
                }}>
                  <List
                    dense
                    sx={{
                      flexGrow: 1,
                      overflow: 'auto',
                      position: 'relative',
                      '& ul': {
                        padding: 0,
                        backgroundColor: 'background.paper',
                      },
                      '& .MuiListSubheader-root': {
                        backgroundColor: theme.palette.background.paper,
                        lineHeight: '30px',
                        fontWeight: 'bold',
                        position: 'sticky',
                        top: 0,
                        zIndex: 1,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)', // Add subtle shadow for better visibility
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }
                    }}
                    subheader={<li />}
                  >
                    {['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'Older'].map((groupName) => {
                      const groupFiles = groupFilesByDate(files)[groupName] || [];

                      // Skip empty groups
                      if (groupFiles.length === 0) return null;

                      // Check if all files in this group are selected
                      const allSelected = groupFiles.every(file => file.selected);
                      const someSelected = groupFiles.some(file => file.selected);

                      // Handler for selecting/deselecting all files in this group
                      const handleSelectAllInGroup = (event: React.ChangeEvent<HTMLInputElement>) => {
                        const checked = event.target.checked;
                        setFiles(prevFiles =>
                          prevFiles.map(f =>
                            groupFiles.some(gf => gf.path === f.path)
                              ? { ...f, selected: checked }
                              : f
                          )
                        );

                        // Update selectedFiles state
                        setSelectedFiles(prevSelected => {
                          // First, remove all files from this group
                          const withoutGroup = prevSelected.filter(path =>
                            !groupFiles.some(gf => gf.path === path)
                          );

                          // If checked, add all files from this group
                          if (checked) {
                            return [...withoutGroup, ...groupFiles.map(f => f.path)];
                          }

                          // If unchecked, just return without this group
                          return withoutGroup;
                        });
                      };

                      return (
                        <li key={groupName}>
                          <ul>
                            <ListSubheader disableSticky={false}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                {selectionMode && (
                                  <Checkbox
                                    edge="start"
                                    checked={allSelected}
                                    indeterminate={!allSelected && someSelected}
                                    onChange={handleSelectAllInGroup}
                                    tabIndex={-1}
                                    disableRipple
                                    size="small"
                                    sx={{ mr: 1 }}
                                  />
                                )}
                                {groupName}
                              </Box>
                              {selectionMode && (
                                <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                                  {groupFiles.filter(f => f.selected).length}/{groupFiles.length} selected
                                </Typography>
                              )}
                            </ListSubheader>
                            {groupFiles.map((file) => (
                              <ListItem key={file.path} disablePadding>
                                <ListItemButton
                                  onClick={(event) => toggleFileSelection(file, event)}
                                  selected={file.path === selectedTest}
                                  dense
                                  sx={{ py: 0.5, borderRadius: 1 }}
                                >
                                  {selectionMode && (
                                    <Checkbox
                                      edge="start"
                                      checked={!!file.selected}
                                      tabIndex={-1}
                                      disableRipple
                                      size="small"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        toggleFileSelection(file, event as React.MouseEvent);
                                      }}
                                    />
                                  )}
                                  <ListItemIcon sx={{ minWidth: selectionMode ? 24 : 36 }}>
                                    {file.failedCount && file.failedCount > 0 ? (
                                      <ErrorOutlineIcon fontSize="small" color="error" />
                                    ) : (
                                      <CheckCircleOutlineIcon fontSize="small" color="success" />
                                    )}
                                  </ListItemIcon>
                                  <ListItemText
                                    primary={formatTestRunName(file.name)}
                                    secondary={
                                      <Box sx={{ display: 'flex', flexDirection: 'column', mt: 0.5 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                          {file.testCount !== undefined && file.failedCount !== undefined && (file.testCount - file.failedCount) > 0 && (
                                            <Chip
                                              size="small"
                                              label={`${file.testCount - file.failedCount} Success`}
                                              color="success"
                                              sx={{ height: 20 }}
                                            />
                                          )}
                                          {file.failedCount !== undefined && file.failedCount > 0 && (
                                            <Chip
                                              size="small"
                                              label={`${file.failedCount} Failures`}
                                              color="error"
                                              sx={{ height: 20 }}
                                            />
                                          )}
                                        </Box>
                                      </Box>
                                    }
                                    primaryTypographyProps={{
                                      noWrap: false,
                                      variant: "body2",
                                      sx: { lineHeight: 1.2 }
                                    }}
                                    secondaryTypographyProps={{
                                      noWrap: false,
                                      variant: "caption",
                                      sx: { lineHeight: 1.2 }
                                    }}
                                  />
                                </ListItemButton>
                              </ListItem>
                            ))}
                          </ul>
                        </li>
                      );
                    })}
                  </List>
                </Box>
              )}
            </>
          )}
        </Box>
      </Paper>

      {/* Confirmation Dialog for Deletion */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {"Delete Selected Test Runs?"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete {selectedFiles.length} selected test run{selectedFiles.length !== 1 ? 's' : ''}? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            onClick={deleteSelectedTestRuns}
            color="error"
            autoFocus
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Drawer>
  );
} 
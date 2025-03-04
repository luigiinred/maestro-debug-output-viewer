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
} from '@mui/material';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import MenuIcon from '@mui/icons-material/Menu';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import FolderIcon from '@mui/icons-material/Folder';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SettingsIcon from '@mui/icons-material/Settings';
import { getTestStatus, getFlowStatus } from '../utils/testStatusUtils';
import { useNavigate } from 'react-router-dom';
import { createDirectoryListUrl, createFileContentUrl } from '../utils/apiConfig';

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
  const navigate = useNavigate();

  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      setError('');

      // First try to get the current directory from localStorage
      const testDir = localStorage.getItem('maestro-test-dir');
      const apiUrl = await createDirectoryListUrl(testDir || undefined);
      const response = await fetch(apiUrl);

      console.log('Fetching files from:', apiUrl);
      if (!response.ok) throw new Error('Failed to fetch files');
      const data: FileInfo[] = await response.json();

      // Store the current path
      if (data.length > 0) {
        const dirPath = data[0].path.split('/').slice(0, -1).join('/');
        setCurrentPath(dirPath);
        console.log('Current directory:', dirPath);
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
        const maestroResponse = await fetch(maestroUrl);
        if (maestroResponse.ok) {
          const maestroData = await maestroResponse.json();
          const testsDir = maestroData.find((file: FileInfo) =>
            file.type === 'directory' && file.name === 'tests'
          );

          if (testsDir) {
            console.log('Found tests directory, fetching test runs');
            const testsUrl = await createDirectoryListUrl(testsDir.path);
            const testsResponse = await fetch(testsUrl);
            if (testsResponse.ok) {
              const testsData = await testsResponse.json();
              setTestsPath(testsDir.path);
              setIsInTestRun(false);
              processTestRuns(testsData);
              return;
            }
          } else {
            setError('No tests directory found in .maestro');
            setFiles([]);
            return;
          }
        }
      }

      setError(`No .maestro directory found in ${currentPath || 'current directory'}.\nMake sure you're in a project with Maestro tests.`);
      setFiles([]);
    } catch (error) {
      console.error('Error fetching files:', error);
      setError('Failed to fetch files');
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
          const dirUrl = await createDirectoryListUrl(testRun.path);
          const response = await fetch(dirUrl);
          if (!response.ok) throw new Error('Failed to fetch test run contents');
          const contents = await response.json();

          // Get all command files
          const commandFiles = contents.filter((f: FileInfo) =>
            f.name.startsWith('commands-') && f.name.endsWith('.json')
          );

          const testCount = commandFiles.length;
          let failedCount = 0;

          // Check each command file for failures
          await Promise.all(
            commandFiles.map(async (file: FileInfo) => {
              try {
                const fileUrl = await createFileContentUrl(file.path);
                const metadataResponse = await fetch(fileUrl);
                if (metadataResponse.ok) {
                  const testData = await metadataResponse.json();
                  if (Array.isArray(testData) && testData.length > 0) {
                    const testStatus = getTestStatus(testData);
                    if (testStatus === 'FAILED') {
                      failedCount++;
                    }
                  }
                }
              } catch (error) {
                console.error('Error fetching test metadata:', error);
              }
            })
          );

          return {
            ...testRun,
            testCount,
            failedCount
          };
        } catch (error) {
          console.error('Error fetching test run contents:', error);
          return testRun;
        }
      })
    ).then(updatedTestRuns => {
      // Filter out test runs with 0 tests before setting the state
      const nonEmptyTestRuns = updatedTestRuns.filter(run => run.testCount && run.testCount > 0);

      if (nonEmptyTestRuns.length === 0) {
        setError('No test runs with tests found in tests directory');
        setFiles([]);
      } else {
        setFiles(nonEmptyTestRuns);
        setError('');
      }
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
                testDuration: calculateTotalDuration(testData)
              };
            }
          }
        } catch (error) {
          console.error('Error fetching test metadata:', error);
        }
        return file;
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

  const handleOpenSettings = () => {
    navigate('/settings');
    if (isSmallScreen) {
      setDrawerOpen(false);
    }
  };

  const drawerContent = (
    <Box sx={{ p: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        {isInTestRun && (
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={handleBackClick}
            sx={{ flex: 1, mr: 1 }}
            size="small"
          >
            Back to Test Runs
          </Button>
        )}
        <IconButton
          onClick={handleOpenSettings}
          size="small"
          sx={{
            border: 1,
            borderColor: 'divider',
            '&:hover': {
              backgroundColor: 'action.hover',
            }
          }}
        >
          <SettingsIcon />
        </IconButton>
      </Box>

      {error ? (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography color="error" variant="body2" sx={{ mb: 1, whiteSpace: 'pre-wrap' }}>
            {error}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Current directory: {currentPath || 'unknown'}
          </Typography>
        </Box>
      ) : (
        <>
          {isInTestRun && files.length > 0 && files[0].flowStatus && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, px: 1 }}>
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

          <List dense sx={{ flexGrow: 1, overflow: 'auto' }}>
            {files.map((file) => (
              <ListItem key={file.path} disablePadding>
                <ListItemButton
                  onClick={() => handleFileClick(file)}
                  selected={file.path === selectedTest}
                  dense
                  sx={{ py: 0.5 }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {isInTestRun ? (
                      file.testStatus ? getStatusIcon(file.testStatus) : <InsertDriveFileIcon fontSize="small" />
                    ) : (
                      file.failedCount && file.failedCount > 0 ? (
                        <ErrorOutlineIcon fontSize="small" color="error" />
                      ) : (
                        <CheckCircleOutlineIcon fontSize="small" color="success" />
                      )
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={isInTestRun ? formatCommandFileName(file.name) : formatTestRunName(file.name)}
                    secondary={
                      !isInTestRun ? (
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
                      ) : file.testDuration ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                          <AccessTimeIcon fontSize="small" sx={{ mr: 0.5, fontSize: '0.75rem', color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">
                            {formatDuration(file.testDuration)}
                          </Typography>
                        </Box>
                      ) : undefined
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
          </List>
        </>
      )}
    </Box>
  );

  return (
    <>
      {isSmallScreen ? (
        <>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={() => setDrawerOpen(true)}
            sx={{
              position: 'fixed',
              bottom: 16,
              right: 16,
              zIndex: 1200,
              bgcolor: 'primary.main',
              color: 'white',
              '&:hover': {
                bgcolor: 'primary.dark',
              },
            }}
          >
            <MenuIcon />
          </IconButton>
          <Drawer
            variant="temporary"
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            ModalProps={{
              keepMounted: true,
            }}
            sx={{
              '& .MuiDrawer-paper': {
                width: 300,
                boxSizing: 'border-box',
                height: '100%'
              },
            }}
          >
            {drawerContent}
          </Drawer>
        </>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            width: 300,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: 300,
              boxSizing: 'border-box',
              height: '100%',
              borderRight: 'none',
              boxShadow: 'none',
              bgcolor: 'background.default',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}
    </>
  );
} 
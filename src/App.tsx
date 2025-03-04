import { 
  BrowserRouter as Router,
  Routes,
  Route,
  useParams,
  useNavigate,
  Navigate
} from 'react-router-dom'
import { 
  Box, 
  CssBaseline,
  useMediaQuery,
  Typography
} from '@mui/material'
import { TestExplorer } from './components/TestExplorer'
import { TestDetails } from './components/TestDetails'
import { Settings } from './components/Settings'
import { ThemeProvider } from './contexts/ThemeContext'

// Main content component that uses URL parameters
function MainContent() {
  const { testPath } = useParams<{ testPath?: string }>()
  const navigate = useNavigate()
  const isSmallScreen = useMediaQuery(`(max-width:600px)`)
  
  // Decode the URL parameter if it exists
  const decodedTestPath = testPath ? decodeURIComponent(testPath) : null
  
  // Handle test selection by updating the URL
  const handleTestSelect = (testId: string) => {
    navigate(`/test/${encodeURIComponent(testId)}`)
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <TestExplorer
        selectedTest={decodedTestPath}
        onTestSelect={handleTestSelect}
      />
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          p: 0,
          width: isSmallScreen ? '100%' : 'calc(100% - 300px)',
          overflow: 'auto',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {decodedTestPath ? (
          <TestDetails testId={decodedTestPath} />
        ) : (
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              height: '100vh',
              flexDirection: 'column',
              opacity: 0.7
            }}
          >
            <Typography variant="h5" color="text.secondary">
              Select a test to view details
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  )
}

// Wrapper component for routes that need the theme context
function AppContent() {
  return (
    <Routes>
      <Route path="/" element={<MainContent />} />
      <Route path="/test/:testPath" element={<MainContent />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <ThemeProvider>
      <CssBaseline />
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  )
}

export default App

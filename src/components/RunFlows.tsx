import React, { useState } from 'react';
import {
    Box,
    Typography,
    Paper,
    Button,
    TextField,
    CircularProgress,
    Alert,
    Divider,
    FormControl,
    FormControlLabel,
    FormGroup,
    InputLabel,
    MenuItem,
    Select,
    Switch,
    IconButton,
    Grid,
    Tooltip,
    Accordion,
    AccordionSummary,
    AccordionDetails,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { createRunMaestroTestUrl, fetchWithRetry } from '../utils/apiConfig';

interface EnvVariable {
    key: string;
    value: string;
}

interface TagGroup {
    tags: string;
}

export function RunFlows() {
    // Basic flow path input
    const [flowPath, setFlowPath] = useState('');

    // Additional test options
    const [analyze, setAnalyze] = useState<boolean>(false);
    const [continuous, setContinuous] = useState<boolean>(false);
    const [configFile, setConfigFile] = useState<string>('');
    const [debugOutput, setDebugOutput] = useState<string>('');
    const [flattenDebugOutput, setFlattenDebugOutput] = useState<boolean>(false);
    const [format, setFormat] = useState<string>('');
    const [headless, setHeadless] = useState<boolean>(false);
    const [ansi, setAnsi] = useState<boolean>(true);
    const [apiKey, setApiKey] = useState<string>('');
    const [apiUrl, setApiUrl] = useState<string>('');
    const [output, setOutput] = useState<string>('');
    const [shards, setShards] = useState<string>('');
    const [shardAll, setShardAll] = useState<string>('');
    const [shardSplit, setShardSplit] = useState<string>('');
    const [testSuiteName, setTestSuiteName] = useState<string>('');

    // Advanced options
    const [envVariables, setEnvVariables] = useState<EnvVariable[]>([{ key: '', value: '' }]);
    const [includeTags, setIncludeTags] = useState<TagGroup[]>([{ tags: '' }]);
    const [excludeTags, setExcludeTags] = useState<TagGroup[]>([{ tags: '' }]);

    // Form state
    const [isRunning, setIsRunning] = useState<boolean>(false);
    const [result, setResult] = useState<{ success: boolean; message: string; stdout?: string; stderr?: string } | null>(null);
    const [showAdvancedOptions, setShowAdvancedOptions] = useState<boolean>(false);
    const [commandOutput, setCommandOutput] = useState<string>('');

    // Handle adding/removing environment variables
    const handleAddEnvVariable = () => {
        setEnvVariables([...envVariables, { key: '', value: '' }]);
    };

    const handleRemoveEnvVariable = (index: number) => {
        const newEnvVariables = [...envVariables];
        newEnvVariables.splice(index, 1);
        setEnvVariables(newEnvVariables);
    };

    const handleEnvVariableChange = (index: number, field: 'key' | 'value', value: string) => {
        const newEnvVariables = [...envVariables];
        newEnvVariables[index][field] = value;
        setEnvVariables(newEnvVariables);
    };

    // Handle adding/removing tag groups
    const handleAddIncludeTagGroup = () => {
        setIncludeTags([...includeTags, { tags: '' }]);
    };

    const handleRemoveIncludeTagGroup = (index: number) => {
        const newIncludeTags = [...includeTags];
        newIncludeTags.splice(index, 1);
        setIncludeTags(newIncludeTags);
    };

    const handleIncludeTagsChange = (index: number, value: string) => {
        const newIncludeTags = [...includeTags];
        newIncludeTags[index].tags = value;
        setIncludeTags(newIncludeTags);
    };

    const handleAddExcludeTagGroup = () => {
        setExcludeTags([...excludeTags, { tags: '' }]);
    };

    const handleRemoveExcludeTagGroup = (index: number) => {
        const newExcludeTags = [...excludeTags];
        newExcludeTags.splice(index, 1);
        setExcludeTags(newExcludeTags);
    };

    const handleExcludeTagsChange = (index: number, value: string) => {
        const newExcludeTags = [...excludeTags];
        newExcludeTags[index].tags = value;
        setExcludeTags(newExcludeTags);
    };

    // Build the command string
    const buildCommand = (): string => {
        const parts: string[] = ['maestro test'];

        // Required parameter - flow path
        if (flowPath) {
            parts.push(flowPath);
        }

        // Boolean flags
        if (analyze) parts.push('--analyze');
        if (continuous) parts.push('-c');
        if (flattenDebugOutput) parts.push('--flatten-debug-output');
        if (headless) parts.push('--headless');
        if (!ansi) parts.push('--no-ansi');

        // String parameters
        if (apiKey) parts.push(`--api-key=${apiKey}`);
        if (apiUrl) parts.push(`--api-url=${apiUrl}`);
        if (configFile) parts.push(`--config=${configFile}`);
        if (debugOutput) parts.push(`--debug-output=${debugOutput}`);
        if (format) parts.push(`--format=${format}`);
        if (output) parts.push(`--output=${output}`);
        if (shards) parts.push(`-s=${shards}`);
        if (shardAll) parts.push(`--shard-all=${shardAll}`);
        if (shardSplit) parts.push(`--shard-split=${shardSplit}`);
        if (testSuiteName) parts.push(`--test-suite-name=${testSuiteName}`);

        // Environment variables
        envVariables.forEach(variable => {
            if (variable.key && variable.value) {
                parts.push(`-e=${variable.key}=${variable.value}`);
            }
        });

        // Include tags
        includeTags.forEach(tagGroup => {
            if (tagGroup.tags) {
                parts.push(`--include-tags=${tagGroup.tags}`);
            }
        });

        // Exclude tags
        excludeTags.forEach(tagGroup => {
            if (tagGroup.tags) {
                parts.push(`--exclude-tags=${tagGroup.tags}`);
            }
        });

        return parts.join(' ');
    };

    const handleRunFlow = async () => {
        if (!flowPath.trim()) {
            setResult({
                success: false,
                message: 'Please enter a valid flow path'
            });
            return;
        }

        setIsRunning(true);
        setResult(null);
        setCommandOutput('');

        try {
            const command = buildCommand();

            console.log('Running command:', command);

            // Call the API endpoint to run the Maestro test
            const apiUrl = await createRunMaestroTestUrl();
            const response = await fetchWithRetry(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ command }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to run command');
            }

            // Combine stdout and stderr for display
            const output = [
                data.stdout ? data.stdout : '',
                data.stderr ? `\nStderr:\n${data.stderr}` : ''
            ].filter(Boolean).join('\n');

            setCommandOutput(output);
            setResult({
                success: true,
                message: `Command executed successfully: ${command}`,
                stdout: data.stdout,
                stderr: data.stderr
            });
        } catch (error) {
            setResult({
                success: false,
                message: `Failed to run command: ${error instanceof Error ? error.message : String(error)}`
            });
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <Box sx={{ p: 3, height: '100vh', overflow: 'auto' }}>
            <Typography variant="h4" gutterBottom>
                Run Maestro Commands
            </Typography>

            <Typography variant="body1" paragraph>
                Configure and run Maestro tests with various options.
            </Typography>

            <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {/* Required Parameters */}
                    <Typography variant="h6" gutterBottom>
                        Flow Path
                    </Typography>

                    <TextField
                        label="Flow Path"
                        variant="outlined"
                        fullWidth
                        value={flowPath}
                        onChange={(e) => setFlowPath(e.target.value)}
                        placeholder="Path to flow file or directory"
                        required
                        helperText="Path to a flow file or directory containing flow files"
                        disabled={isRunning}
                    />

                    {/* Additional Options Accordion */}
                    <Accordion
                        expanded={showAdvancedOptions}
                        onChange={() => setShowAdvancedOptions(!showAdvancedOptions)}
                        sx={{ mt: 2 }}
                    >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="h6">Additional Options</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                    <FormGroup>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={analyze}
                                                    onChange={(e) => setAnalyze(e.target.checked)}
                                                    disabled={isRunning}
                                                />
                                            }
                                            label={
                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                    <Typography>Analyze</Typography>
                                                    <Tooltip title="[Beta] Enhance the test output analysis with AI Insights">
                                                        <IconButton size="small">
                                                            <HelpOutlineIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                            }
                                        />
                                    </FormGroup>
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    <FormGroup>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={continuous}
                                                    onChange={(e) => setContinuous(e.target.checked)}
                                                    disabled={isRunning}
                                                />
                                            }
                                            label="Continuous"
                                        />
                                    </FormGroup>
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    <FormGroup>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={flattenDebugOutput}
                                                    onChange={(e) => setFlattenDebugOutput(e.target.checked)}
                                                    disabled={isRunning}
                                                />
                                            }
                                            label={
                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                    <Typography>Flatten Debug Output</Typography>
                                                    <Tooltip title="All file outputs from the test case are created in the folder without subfolders or timestamps for each run">
                                                        <IconButton size="small">
                                                            <HelpOutlineIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                            }
                                        />
                                    </FormGroup>
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    <FormGroup>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={headless}
                                                    onChange={(e) => setHeadless(e.target.checked)}
                                                    disabled={isRunning}
                                                />
                                            }
                                            label={
                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                    <Typography>Headless</Typography>
                                                    <Tooltip title="(Web only) Run the tests in headless mode">
                                                        <IconButton size="small">
                                                            <HelpOutlineIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                            }
                                        />
                                    </FormGroup>
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    <FormGroup>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={ansi}
                                                    onChange={(e) => setAnsi(e.target.checked)}
                                                    disabled={isRunning}
                                                />
                                            }
                                            label="ANSI Colors"
                                        />
                                    </FormGroup>
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    <TextField
                                        label="Debug Output"
                                        variant="outlined"
                                        fullWidth
                                        value={debugOutput}
                                        onChange={(e) => setDebugOutput(e.target.value)}
                                        placeholder="Path for debug output"
                                        helperText="Configures the debug output in this path, instead of default"
                                        disabled={isRunning}
                                    />
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    <TextField
                                        label="Config File"
                                        variant="outlined"
                                        fullWidth
                                        value={configFile}
                                        onChange={(e) => setConfigFile(e.target.value)}
                                        placeholder="Path to config.yaml"
                                        helperText="Optional YAML configuration file for the workspace"
                                        disabled={isRunning}
                                    />
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    <FormControl fullWidth disabled={isRunning}>
                                        <InputLabel id="format-label">Format</InputLabel>
                                        <Select
                                            labelId="format-label"
                                            value={format}
                                            label="Format"
                                            onChange={(e) => setFormat(e.target.value)}
                                        >
                                            <MenuItem value="">NOOP (Default)</MenuItem>
                                            <MenuItem value="JUNIT">JUNIT</MenuItem>
                                            <MenuItem value="HTML">HTML</MenuItem>
                                            <MenuItem value="NOOP">NOOP</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    <TextField
                                        label="Output"
                                        variant="outlined"
                                        fullWidth
                                        value={output}
                                        onChange={(e) => setOutput(e.target.value)}
                                        placeholder="Output path"
                                        disabled={isRunning}
                                    />
                                </Grid>

                                <Grid item xs={12} md={4}>
                                    <TextField
                                        label="Shards"
                                        variant="outlined"
                                        fullWidth
                                        value={shards}
                                        onChange={(e) => setShards(e.target.value)}
                                        placeholder="Number of shards"
                                        helperText="Number of parallel shards to distribute tests across"
                                        disabled={isRunning}
                                        type="number"
                                    />
                                </Grid>

                                <Grid item xs={12} md={4}>
                                    <TextField
                                        label="Shard All"
                                        variant="outlined"
                                        fullWidth
                                        value={shardAll}
                                        onChange={(e) => setShardAll(e.target.value)}
                                        placeholder="Number of devices"
                                        helperText="Run all the tests across N connected devices"
                                        disabled={isRunning}
                                        type="number"
                                    />
                                </Grid>

                                <Grid item xs={12} md={4}>
                                    <TextField
                                        label="Shard Split"
                                        variant="outlined"
                                        fullWidth
                                        value={shardSplit}
                                        onChange={(e) => setShardSplit(e.target.value)}
                                        placeholder="Number of devices"
                                        helperText="Run the tests across N connected devices, splitting the tests evenly"
                                        disabled={isRunning}
                                        type="number"
                                    />
                                </Grid>

                                <Grid item xs={12}>
                                    <TextField
                                        label="Test Suite Name"
                                        variant="outlined"
                                        fullWidth
                                        value={testSuiteName}
                                        onChange={(e) => setTestSuiteName(e.target.value)}
                                        placeholder="Test suite name"
                                        disabled={isRunning}
                                    />
                                </Grid>

                                {/* Environment Variables */}
                                <Grid item xs={12}>
                                    <Typography variant="subtitle1" gutterBottom>
                                        Environment Variables
                                    </Typography>

                                    {envVariables.map((variable, index) => (
                                        <Box
                                            key={index}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                                mb: 1
                                            }}
                                        >
                                            <TextField
                                                label="Key"
                                                variant="outlined"
                                                value={variable.key}
                                                onChange={(e) => handleEnvVariableChange(index, 'key', e.target.value)}
                                                disabled={isRunning}
                                                size="small"
                                                sx={{ flex: 1 }}
                                            />
                                            <Typography>=</Typography>
                                            <TextField
                                                label="Value"
                                                variant="outlined"
                                                value={variable.value}
                                                onChange={(e) => handleEnvVariableChange(index, 'value', e.target.value)}
                                                disabled={isRunning}
                                                size="small"
                                                sx={{ flex: 1 }}
                                            />
                                            <IconButton
                                                onClick={() => handleRemoveEnvVariable(index)}
                                                disabled={isRunning || envVariables.length === 1}
                                                color="error"
                                                size="small"
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </Box>
                                    ))}

                                    <Button
                                        startIcon={<AddIcon />}
                                        onClick={handleAddEnvVariable}
                                        disabled={isRunning}
                                        variant="outlined"
                                        size="small"
                                        sx={{ mt: 1 }}
                                    >
                                        Add Environment Variable
                                    </Button>
                                </Grid>

                                {/* Include Tags */}
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle1" gutterBottom>
                                        Include Tags
                                    </Typography>

                                    {includeTags.map((tagGroup, index) => (
                                        <Box
                                            key={index}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                                mb: 1
                                            }}
                                        >
                                            <TextField
                                                label="Tags (comma-separated)"
                                                variant="outlined"
                                                fullWidth
                                                value={tagGroup.tags}
                                                onChange={(e) => handleIncludeTagsChange(index, e.target.value)}
                                                placeholder="tag1,tag2,tag3"
                                                disabled={isRunning}
                                                size="small"
                                                helperText="List of tags that will remove the Flows that do not have the provided tags"
                                            />
                                            <IconButton
                                                onClick={() => handleRemoveIncludeTagGroup(index)}
                                                disabled={isRunning || includeTags.length === 1}
                                                color="error"
                                                size="small"
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </Box>
                                    ))}

                                    <Button
                                        startIcon={<AddIcon />}
                                        onClick={handleAddIncludeTagGroup}
                                        disabled={isRunning}
                                        variant="outlined"
                                        size="small"
                                        sx={{ mt: 1 }}
                                    >
                                        Add Include Tag Group
                                    </Button>
                                </Grid>

                                {/* Exclude Tags */}
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle1" gutterBottom>
                                        Exclude Tags
                                    </Typography>

                                    {excludeTags.map((tagGroup, index) => (
                                        <Box
                                            key={index}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                                mb: 1
                                            }}
                                        >
                                            <TextField
                                                label="Tags (comma-separated)"
                                                variant="outlined"
                                                fullWidth
                                                value={tagGroup.tags}
                                                onChange={(e) => handleExcludeTagsChange(index, e.target.value)}
                                                placeholder="tag1,tag2,tag3"
                                                disabled={isRunning}
                                                size="small"
                                                helperText="List of tags that will remove the Flows containing the provided tags"
                                            />
                                            <IconButton
                                                onClick={() => handleRemoveExcludeTagGroup(index)}
                                                disabled={isRunning || excludeTags.length === 1}
                                                color="error"
                                                size="small"
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </Box>
                                    ))}

                                    <Button
                                        startIcon={<AddIcon />}
                                        onClick={handleAddExcludeTagGroup}
                                        disabled={isRunning}
                                        variant="outlined"
                                        size="small"
                                        sx={{ mt: 1 }}
                                    >
                                        Add Exclude Tag Group
                                    </Button>
                                </Grid>
                            </Grid>
                        </AccordionDetails>
                    </Accordion>

                    {/* Command Preview */}
                    <Box sx={{ mt: 3 }}>
                        <Typography variant="subtitle1" gutterBottom>
                            Command Preview
                        </Typography>
                        <Paper
                            elevation={1}
                            sx={{
                                p: 2,
                                backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                fontFamily: 'monospace',
                                overflowX: 'auto'
                            }}
                        >
                            {buildCommand()}
                        </Paper>
                    </Box>

                    {/* Run Button */}
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={isRunning ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
                        onClick={handleRunFlow}
                        disabled={isRunning || !flowPath.trim()}
                        sx={{ alignSelf: 'flex-start', mt: 3 }}
                        size="large"
                    >
                        {isRunning ? 'Running...' : 'Run Command'}
                    </Button>
                </Box>

                {/* Result */}
                {result && (
                    <Box sx={{ mt: 3 }}>
                        <Divider sx={{ mb: 2 }} />
                        <Alert severity={result.success ? 'success' : 'error'} sx={{ mb: 2 }}>
                            {result.success ? 'Command executed successfully' : 'Error executing command'}
                        </Alert>

                        {/* Command Output */}
                        {(commandOutput || result.message) && (
                            <Paper
                                elevation={1}
                                sx={{
                                    p: 2,
                                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                    fontFamily: 'monospace',
                                    whiteSpace: 'pre-wrap',
                                    overflowX: 'auto',
                                    maxHeight: '400px',
                                    overflowY: 'auto'
                                }}
                            >
                                {commandOutput || result.message}
                            </Paper>
                        )}
                    </Box>
                )}
            </Paper>
        </Box>
    );
} 
import {
  Box,
  Typography,
  TableContainer,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@mui/material';

interface VariablesTableProps {
  variables: Record<string, string>;
}

export function VariablesTable({ variables }: VariablesTableProps) {
  return (
    <Box sx={{ mt: 0.5, p: 0.5, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid rgba(0,0,0,0.1)' }}>
      <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5, fontSize: '0.7rem' }}>
        Variables:
      </Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 150 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', py: 0.5, fontSize: '0.7rem' }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold', py: 0.5, fontSize: '0.7rem' }}>Value</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(variables).map(([key, value]) => (
              <TableRow key={key}>
                <TableCell sx={{ py: 0.25, fontSize: '0.7rem' }}>{key}</TableCell>
                <TableCell sx={{ py: 0.25, fontSize: '0.7rem' }}>{value}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
} 
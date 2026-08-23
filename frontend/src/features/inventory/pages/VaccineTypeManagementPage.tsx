import { Box } from '@mui/material';
import VaccineTypesCatalog from '../components/VaccineTypesCatalog/VaccineTypesCatalog';

export default function VaccineTypeManagementPage() {
  return (
    <Box sx={{ px: 3, py: 1 }}>
      <VaccineTypesCatalog />
    </Box>
  );
}


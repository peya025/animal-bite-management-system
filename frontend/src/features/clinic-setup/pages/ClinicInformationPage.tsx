import { useState, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../shared/config/routes';
import {
  Alert,
  Box,
  Button,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  TextField,
  Typography,
  Switch,
} from '@mui/material';
import Loader from '../../../components/Loader';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Business as BusinessIcon,
  Badge as BadgeIcon,
  LocationOn as LocationOnIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  AccessTime as AccessTimeIcon,
} from '@mui/icons-material';
import api from '../../../services/api';
import { DAYS, DAY_LABELS } from '../components/WorkingHoursModal/WorkingHoursModal';
import { MISAMIS_ORIENTAL_MUNICIPALITIES, FALLBACK_BARANGAYS } from '../../patients/hooks/useAddressLocation';

// Clean, minimal field style matching the reference design
const cleanFieldSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: '#fff',
    fontSize: '14px',
    '& fieldset': {
      borderColor: '#d7e3da',
      borderWidth: '1px',
    },
    '&:hover fieldset': {
      borderColor: '#9fc5ad',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#277a4b',
      borderWidth: '1.5px',
    },
  },
  '& .MuiOutlinedInput-input': {
    padding: '10px 14px',
    fontSize: '14px',
    color: '#374151',
  },
};

const timeFieldSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: '#fff',
    fontSize: '13px',
    '& fieldset': {
      borderColor: '#d7e3da',
    },
    '&:hover fieldset': {
      borderColor: '#9fc5ad',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#277a4b',
      borderWidth: '1.5px',
    },
  },
  '& .MuiOutlinedInput-input': {
    padding: '8px 10px',
    fontSize: '13px',
  },
};

function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <Typography component="label" sx={{ fontSize: 13, fontWeight: 600, color: '#374151', mb: 0.75, display: 'block' }}>
      {children}
      {required && <Box component="span" sx={{ color: '#ef4444', ml: 0.4 }}>*</Box>}
    </Typography>
  );
}

interface ClinicData {
  name: string;
  address: string;
  contact_number: string;
  email: string;
  license_number: string;
  opening_hours: {
    [key: string]: { open: string; close: string; is_open: boolean };
  };
}

export default function ClinicInformation() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clinic, setClinic] = useState<ClinicData>({
    name: '',
    address: '',
    contact_number: '',
    email: '',
    license_number: '',
    opening_hours: {},
  });
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Structured Address State
  const [useManualAddress, setUseManualAddress] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState('Misamis Oriental');
  const [selectedMunicipality, setSelectedMunicipality] = useState('Tagoloan');
  const [selectedBarangay, setSelectedBarangay] = useState('Poblacion');
  const [streetDetail, setStreetDetail] = useState('');

  // Hierarchical Philippine Location Datasets
  const PHILIPPINE_LOCATIONS: Record<string, Record<string, string[]>> = {
    'Misamis Oriental': {
      'Tagoloan': ['Poblacion', 'Baluarte', 'Casinglot', 'Gracia', 'Mohon', 'Natumolan', 'Rosario', 'Santa Ana', 'Santa Cruz', 'Sugbongcogon'],
      'City of Cagayan De Oro': ['Carmen', 'Lapasan', 'Balulang', 'Kauswagan', 'Bulua', 'Camaman-an', 'Gusa', 'Puerto', 'Macasandig', 'Puntod'],
      'Villanueva': ['Balacanas', 'Dayawan', 'Katipunan', 'Kimaya', 'Poblacion 1', 'San Martin', 'Tambobong', 'Imelda', 'Looc', 'Poblacion 2', 'Poblacion 3'],
      'Claveria': [
        'Ani-e', 'Aposkahoy', 'Balwarte', 'Bulahan', 'Cabacungan', 'Gumaod',
        'Hinaplanan', 'Impata-ao', 'Kalawag', 'Malagana', 'Mat-i', 'Minalwang',
        'Parmbugas', 'Pelaez', 'Plaridel', 'Poblacion', 'Punong', 'Rizal',
        'Samay', 'San Jose', 'Santa Cruz', 'Santa Rita', 'Tamboboan', 'Tipolohon'
      ],
      'Alubijid': ['Poblacion', 'Baybay', 'Benigwayan', 'Calatcat', 'Loguilo', 'Lourdes', 'Matag-ob', 'Tula'],
      'Balingasag': ['Poblacion', 'Balagnan', 'Blanco', 'Calawag', 'Cogon', 'Hermano', 'Linabu', 'Mandangoa'],
      'City of El Salvador': ['Poblacion', 'Amoros', 'Bolisong', 'Cogon', 'Hilasgasan', 'Molugan', 'Sambulawan', 'Taytay'],
      'City of Gingoog': ['Poblacion', 'Anakan', 'Agay-ayan', 'Balingasag', 'Lunao', 'Murallon', 'San Jose', 'Talisay'],
      'Jasaan': ['Poblacion', 'Aplaya', 'Bobontogan', 'Danao', 'Lower Jasaan', 'San Antonio', 'Upper Jasaan'],
      'Laguindingan': ['Poblacion', 'Aromanon', 'Gitan', 'Lipse', 'Mauswagon', 'Moog', 'Sambulawan', 'Tubajon'],
      'Opol': ['Poblacion', 'Barra', 'Bonbon', 'Igpit', 'Luyongbonbon', 'Malanang', 'Nangcaon', 'Patag'],
    },
    'Bukidnon': {
      'Malaybalay City': ['Poblacion 1', 'Poblacion 2', 'Poblacion 3', 'Casisang', 'Casanayan', 'Impalambong', 'Kabalantian', 'Sumpong'],
      'Valencia City': ['Poblacion', 'Batangan', 'Catumbalon', 'Concepcion', 'Lumbo', 'Mailag', 'San Carlos', 'Sugod'],
      'Manolo Fortich': ['Poblacion', 'Agusan Canyon', 'Alae', 'Dahilayan', 'Dicklum', 'Lingion', 'Lunocan', 'Sankanan', 'Tankulan'],
      'Maramag': ['Poblacion', 'Anapolon', 'Base Camp', 'Camp 1', 'Danggawan', 'Dologon', 'Kuya', 'North Poblacion', 'South Poblacion'],
      'Libona': ['Poblacion', 'Capihan', 'Crossing', 'Kiliog', 'Laturan', 'Palaopao', 'Pongol', 'San Jose'],
      'Sumilao': ['Poblacion', 'Kauswagan', 'Kinawe', 'Lupiagan', 'Puntian', 'San Roque', 'Vista Villa'],
      'Talakag': ['Poblacion', 'Basak', 'Dominorog', 'Indulang', 'Liguron', 'Lingion', 'Miarayon', 'San Antonio', 'San Isidro'],
    },
    'Lanao del Norte': {
      'Iligan City': ['Poblacion', 'Abuno', 'Buru-un', 'Hinaplanon', 'Kiwalan', 'Mahayahay', 'Pala-o', 'San Miguel', 'Tubod'],
      'Tubod': ['Poblacion', 'Barakan', 'Bulod', 'Camp V', 'Canaway', 'Kalilangan', 'Licapao', 'Malingao', 'Pualas'],
      'Lala': ['Poblacion', 'Abaga', 'Darumawang', 'Lanipao', 'Matampay', 'Rebe', 'San Isidro', 'Santa Cruz'],
    },
    'Metro Manila': {
      'Manila': ['Ermita', 'Malate', 'Tondo', 'Sampaloc', 'Santa Cruz', 'Binondo', 'Intramuros', 'Paco', 'San Miguel'],
      'Quezon City': ['Batasan Hills', 'Commonwealth', 'Cubao', 'Diliman', 'Kamuning', 'Novaliches', 'Roxas', 'Tandang Sora'],
      'Makati': ['Bel-Air', 'Dasmariñas', 'Forbes Park', 'Poblacion', 'San Lorenzo', 'Urdaneta'],
    },
    'Cebu': {
      'Cebu City': ['Lahug', 'Mabolo', 'Banilad', 'Guadalupe', 'Labangon', 'Pardo', 'Tisa', 'Zapatera'],
      'Mandaue City': ['Poblacion', 'Bakilid', 'Banilad', 'Basak', 'Cabancalan', 'Centro', 'Looc', 'Subangdaku'],
      'Lapu-Lapu City': ['Poblacion', 'Basak', 'Buaya', 'Maribago', 'Mactan', 'Punta Engaño', 'Subabasbas'],
    }
  };

  // Dynamic Options derived from state
  const provinceData = PHILIPPINE_LOCATIONS[selectedProvince] || PHILIPPINE_LOCATIONS['Misamis Oriental'];
  const municipalityOptions = Object.keys(provinceData);
  const barangayList = provinceData[selectedMunicipality] || provinceData[municipalityOptions[0]] || ['Poblacion'];

  const buildAddressString = (prov: string, mun: string, brgy: string, street: string) => {
    const parts = [
      street,
      brgy,
      mun,
      prov,
    ].filter(Boolean);
    return parts.join(', ');
  };

  const parseClinicAddress = (addrStr: string, mun?: string, prov?: string) => {
    let provVal = prov && PHILIPPINE_LOCATIONS[prov] ? prov : 'Misamis Oriental';
    let munVal = mun || 'Tagoloan';
    let brgyVal = 'Poblacion';
    let streetVal = '';

    if (addrStr) {
      const parts = addrStr.split(',').map(s => s.trim());
      if (parts.length >= 4) {
        streetVal = parts[0];
        brgyVal = parts[1].replace(/^Barangay\s+/i, '');
        munVal = parts[2];
        provVal = parts[3];
      } else if (parts.length === 3) {
        streetVal = '';
        brgyVal = parts[0].replace(/^Barangay\s+/i, '');
        munVal = parts[1];
        provVal = parts[2];
      } else if (parts.length === 2) {
        streetVal = '';
        brgyVal = 'Poblacion';
        munVal = parts[0];
        provVal = parts[1];
      }
    }

    const finalProv = PHILIPPINE_LOCATIONS[provVal] ? provVal : 'Misamis Oriental';
    const provData = PHILIPPINE_LOCATIONS[finalProv];
    const validMuns = Object.keys(provData);
    const matchedMun = validMuns.find(m => m.toLowerCase() === munVal.toLowerCase()) || validMuns[0];
    const validBrgys = provData[matchedMun] || ['Poblacion'];
    const matchedBrgy = validBrgys.find(b => b.toLowerCase() === brgyVal.toLowerCase()) || validBrgys[0];

    setSelectedProvince(finalProv);
    setSelectedMunicipality(matchedMun);
    setSelectedBarangay(matchedBrgy);
    setStreetDetail(streetVal);
  };

  const handleProvinceChange = (prov: string) => {
    setSelectedProvince(prov);
    const newProvData = PHILIPPINE_LOCATIONS[prov] || PHILIPPINE_LOCATIONS['Misamis Oriental'];
    const newMunOptions = Object.keys(newProvData);
    const newMun = newMunOptions[0] || 'Tagoloan';
    const newBrgyOptions = newProvData[newMun] || ['Poblacion'];
    const newBrgy = newBrgyOptions[0] || 'Poblacion';

    setSelectedMunicipality(newMun);
    setSelectedBarangay(newBrgy);
    const full = buildAddressString(prov, newMun, newBrgy, streetDetail);
    setClinic(prev => ({ ...prev, address: full }));
  };

  const handleMunicipalityChange = (mun: string) => {
    setSelectedMunicipality(mun);
    const brgyOpts = provinceData[mun] || ['Poblacion'];
    const newBrgy = brgyOpts[0] || 'Poblacion';

    setSelectedBarangay(newBrgy);
    const full = buildAddressString(selectedProvince, mun, newBrgy, streetDetail);
    setClinic(prev => ({ ...prev, address: full }));
  };

  const handleBarangayChange = (brgy: string) => {
    setSelectedBarangay(brgy);
    const full = buildAddressString(selectedProvince, selectedMunicipality, brgy, streetDetail);
    setClinic(prev => ({ ...prev, address: full }));
  };

  const handleStreetDetailChange = (street: string) => {
    setStreetDetail(street);
    const full = buildAddressString(selectedProvince, selectedMunicipality, selectedBarangay, street);
    setClinic(prev => ({ ...prev, address: full }));
  };

  // Initialize opening hours with default values
  useEffect(() => {
    const defaultHours: ClinicData['opening_hours'] = {};
    DAYS.forEach(day => {
      defaultHours[day] = { open: '08:00', close: '17:00', is_open: day !== 'sunday' };
    });
    setClinic(prev => ({ ...prev, opening_hours: defaultHours }));
  }, []);

  // Load clinic data
  const loadClinicData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/setup/clinic');
      const data = response.data;

      // Parse opening hours if it's a string, or initialize as empty object if null/undefined
      let parsedHours: ClinicData['opening_hours'] = {};
      
      if (data.opening_hours) {
        if (typeof data.opening_hours === 'string') {
          try {
            parsedHours = JSON.parse(data.opening_hours);
          } catch (e) {
            console.error('Failed to parse opening hours:', e);
            parsedHours = {};
          }
        } else if (typeof data.opening_hours === 'object') {
          parsedHours = data.opening_hours;
        }
      }

      // Merge with default hours to ensure all days are present
      const defaultHours: ClinicData['opening_hours'] = {};
      DAYS.forEach(day => {
        defaultHours[day] = (parsedHours && parsedHours[day]) ? parsedHours[day] : {
          open: '08:00',
          close: '17:00',
          is_open: day !== 'sunday',
        };
      });

      setClinic({
        name: data.name || '',
        address: data.address || '',
        contact_number: data.contact_number || '',
        email: data.email || '',
        license_number: data.license_number || '',
        opening_hours: defaultHours,
      });

      parseClinicAddress(data.address || '', data.municipality, data.province);
    } catch (error: any) {
      console.error('Error loading clinic data:', error);
      const errorMessage = error.response?.status === 404 
        ? 'No clinic found. Please contact support to set up your clinic.'
        : error.response?.data?.message || 'Failed to load clinic information. Please try again.';
      
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClinicData();
  }, []);

  const handleInputChange = (field: keyof Omit<ClinicData, 'opening_hours'>, value: string) => {
    setClinic(prev => ({ ...prev, [field]: value }));
  };

  const handleHoursChange = (day: string, field: 'open' | 'close' | 'is_open', value: string | boolean) => {
    setClinic(prev => ({
      ...prev,
      opening_hours: {
        ...prev.opening_hours,
        [day]: {
          ...prev.opening_hours[day],
          [field]: value,
        },
      },
    }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload = {
        ...clinic,
        municipality: selectedMunicipality,
        province: selectedProvince,
        opening_hours: JSON.stringify(clinic.opening_hours),
      };

      await api.put('/setup/clinic', payload);

      setSnackbar({
        open: true,
        message: 'Clinic information updated successfully',
        severity: 'success',
      });
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Failed to update clinic information',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Loader label="Loading Clinic Information..." />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography component="h1" sx={{ fontWeight: 600, fontSize: '25px', lineHeight: 1.2, color: '#173d29', mb: '7px', letterSpacing: '-0.5px' }}>
            Clinic Information
          </Typography>
          <Typography sx={{ fontSize: '13px', lineHeight: 1.5, color: '#77877d' }}>
            Manage your clinic details and operating hours
          </Typography>
          {/* Breadcrumb */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', mt: 0.75, fontSize: 13, color: '#9ca3af' }}>
            <button
              onClick={() => navigate(ROUTES.DASHBOARD)}
              style={{ background: 'none', border: 'none', padding: 0, color: '#3b82f6', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}
            >Dashboard</button>
            <span>›</span>
            <span style={{ color: '#6b7280' }}>Clinic Setup</span>
            <span>›</span>
            <span style={{ color: '#6b7280' }}>Clinic Information</span>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <IconButton
            onClick={loadClinicData}
            disabled={loading}
            sx={{ 
              border: '1px solid #e0eae3',
              borderRadius: 1.5,
              width: 40,
              height: 40,
              '&:hover': { bgcolor: '#f9fafb' }
            }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSubmit}
            disabled={saving}
            disableElevation
            sx={{
              bgcolor: '#10b981',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '14px',
              px: 3,
              py: 1.25,
              borderRadius: 1.5,
              '&:hover': {
                bgcolor: '#059669',
              },
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
      </Box>

      {/* Two Column Layout */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
        {/* Left Column - Clinic Information */}
        <Paper
          elevation={0}
          sx={{
            border: '1px solid #e0eae3',
            borderRadius: 2,
            p: 3,
            bgcolor: '#fff',
          }}
        >
          <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#277a4b', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            I. CLINIC INFORMATION
          </Typography>
          <Box sx={{ height: '2px', width: '40px', bgcolor: '#10b981', mb: 3 }} />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* Clinic Name */}
            <Box>
              <FieldLabel required>Clinic Name</FieldLabel>
              <TextField
                fullWidth
                size="small"
                placeholder="Enter clinic name"
                value={clinic.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                sx={cleanFieldSx}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <BusinessIcon sx={{ color: '#9ca3af', fontSize: 16 }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>

            {/* License Number */}
            <Box>
              <FieldLabel>License Number</FieldLabel>
              <TextField
                fullWidth
                size="small"
                placeholder="Enter license number"
                value={clinic.license_number}
                onChange={(e) => handleInputChange('license_number', e.target.value)}
                sx={cleanFieldSx}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <BadgeIcon sx={{ color: '#9ca3af', fontSize: 16 }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>

            {/* Address */}
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                <FieldLabel>Clinic Address</FieldLabel>
                <Button
                  size="small"
                  onClick={() => setUseManualAddress(!useManualAddress)}
                  sx={{ fontSize: '11px', textTransform: 'none', color: '#10b981', p: 0, minWidth: 0, fontWeight: 600 }}
                >
                  {useManualAddress ? '⚙️ Use Dropdown Selectors' : '✏️ Use Freeform Text'}
                </Button>
              </Box>

              {!useManualAddress ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                    <Box>
                      <Typography sx={{ fontSize: 12, fontWeight: 500, color: '#6b7280', mb: 0.5 }}>Province</Typography>
                      <Select
                        fullWidth
                        size="small"
                        value={selectedProvince}
                        onChange={(e) => handleProvinceChange(e.target.value)}
                        sx={cleanFieldSx}
                        MenuProps={{ style: { maxHeight: 260 } }}
                      >
                        {Object.keys(PHILIPPINE_LOCATIONS).map(p => (
                          <MenuItem key={p} value={p}>{p}</MenuItem>
                        ))}
                      </Select>
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: 12, fontWeight: 500, color: '#6b7280', mb: 0.5 }}>Municipality / City</Typography>
                      <Select
                        fullWidth
                        size="small"
                        value={selectedMunicipality}
                        onChange={(e) => handleMunicipalityChange(e.target.value)}
                        sx={cleanFieldSx}
                        MenuProps={{ style: { maxHeight: 260 } }}
                      >
                        {municipalityOptions.map(m => (
                          <MenuItem key={m} value={m}>{m}</MenuItem>
                        ))}
                      </Select>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                    <Box>
                      <Typography sx={{ fontSize: 12, fontWeight: 500, color: '#6b7280', mb: 0.5 }}>Barangay</Typography>
                      <Select
                        fullWidth
                        size="small"
                        value={selectedBarangay}
                        onChange={(e) => handleBarangayChange(e.target.value)}
                        sx={cleanFieldSx}
                        MenuProps={{ style: { maxHeight: 260 } }}
                      >
                        {barangayList.map(b => (
                          <MenuItem key={b} value={b}>{b}</MenuItem>
                        ))}
                      </Select>
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: 12, fontWeight: 500, color: '#6b7280', mb: 0.5 }}>Street / Zone / Landmark</Typography>
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="e.g. Zone 2, Main Highway"
                        value={streetDetail}
                        onChange={(e) => handleStreetDetailChange(e.target.value)}
                        sx={cleanFieldSx}
                      />
                    </Box>
                  </Box>
                  <Typography sx={{ fontSize: 12, color: '#065f46', fontWeight: 500, bgcolor: '#ecfdf5', border: '1px solid #a7f3d0', p: 1.25, borderRadius: 1.5 }}>
                    📍 Generated Full Address: <strong>{clinic.address || 'Select options above'}</strong>
                  </Typography>
                </Box>
              ) : (
                <TextField
                  fullWidth
                  size="small"
                  multiline
                  rows={2}
                  placeholder="Street, barangay, city"
                  value={clinic.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  sx={cleanFieldSx}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                          <LocationOnIcon sx={{ color: '#9ca3af', fontSize: 16 }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              )}
            </Box>

            {/* Contact Number */}
            <Box>
              <FieldLabel>Contact Number</FieldLabel>
              <TextField
                fullWidth
                size="small"
                placeholder="+63 XXX XXX XXXX"
                value={clinic.contact_number}
                onChange={(e) => handleInputChange('contact_number', e.target.value)}
                sx={cleanFieldSx}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <PhoneIcon sx={{ color: '#9ca3af', fontSize: 16 }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>

            {/* Email Address */}
            <Box>
              <FieldLabel>Email Address</FieldLabel>
              <TextField
                fullWidth
                size="small"
                type="email"
                placeholder="clinic@example.com"
                value={clinic.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                sx={cleanFieldSx}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon sx={{ color: '#9ca3af', fontSize: 16 }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>
          </Box>
        </Paper>

        {/* Right Column - Working Hours */}
        <Paper
          elevation={0}
          sx={{
            border: '1px solid #e0eae3',
            borderRadius: 2,
            p: 3,
            bgcolor: '#fff',
          }}
        >
          <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#277a4b', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            II. WORKING HOURS
          </Typography>
          <Box sx={{ height: '2px', width: '40px', bgcolor: '#10b981', mb: 3 }} />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {DAYS.map(day => {
              const hours = clinic.opening_hours[day];
              const isOpen = hours?.is_open;
              return (
                <Box 
                  key={day}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '140px 1fr',
                    gap: 2,
                    alignItems: 'center',
                    pb: 2,
                    borderBottom: day !== 'saturday' ? '1px solid #f3f4f6' : 'none',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Switch
                      size="small"
                      checked={isOpen}
                      onChange={(e) => handleHoursChange(day, 'is_open', e.target.checked)}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#10b981',
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: '#10b981',
                        },
                      }}
                    />
                    <Typography sx={{ fontSize: '14px', fontWeight: 500, color: isOpen ? '#374151' : '#9ca3af' }}>
                      {DAY_LABELS[day]}
                    </Typography>
                  </Box>

                  {isOpen ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TextField
                        type="time"
                        size="small"
                        value={hours.open}
                        onChange={(e) => handleHoursChange(day, 'open', e.target.value)}
                        sx={{ ...timeFieldSx, flex: 1 }}
                        slotProps={{
                          input: {
                            startAdornment: (
                              <InputAdornment position="start">
                                <AccessTimeIcon sx={{ color: '#9ca3af', fontSize: 16 }} />
                              </InputAdornment>
                            ),
                          },
                        }}
                      />
                      <Typography sx={{ fontSize: '13px', color: '#9ca3af', fontWeight: 500 }}>to</Typography>
                      <TextField
                        type="time"
                        size="small"
                        value={hours.close}
                        onChange={(e) => handleHoursChange(day, 'close', e.target.value)}
                        sx={{ ...timeFieldSx, flex: 1 }}
                        slotProps={{
                          input: {
                            startAdornment: (
                              <InputAdornment position="start">
                                <AccessTimeIcon sx={{ color: '#9ca3af', fontSize: 16 }} />
                              </InputAdornment>
                            ),
                          },
                        }}
                      />
                    </Box>
                  ) : (
                    <Typography sx={{ fontSize: '13px', color: '#9ca3af', fontStyle: 'italic' }}>
                      Closed
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Box>
        </Paper>
      </Box>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} variant="filled" onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

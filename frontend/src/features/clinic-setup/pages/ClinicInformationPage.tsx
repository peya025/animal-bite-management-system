import { getGlobalPrintLogos } from '../../../components/print/printHeaderHelper';
import { Suspense, useState, useEffect, type ReactNode, type ChangeEvent } from 'react';
import { lazyWithRetry } from '../../../shared/utils/lazyWithRetry';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ROUTES } from '../../../shared/config/routes';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Box,
  Button,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import Loader from '../../../components/Loader';
import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Business as BusinessIcon,
  Badge as BadgeIcon,
  LocationOn as LocationOnIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Settings as SettingsIcon,
  Edit as EditIcon,
  Place as PlaceIcon,
  CloudUpload as CloudUploadIcon,
  DeleteOutlined as DeleteOutlineIcon,
  Subtitles as SubtitlesIcon,
} from '@mui/icons-material';
import api from '../../../services/api';
import defaultLogo from '../../../assets/abtcare-app-icon.png';
import { API_BASE_URL } from '../../../shared/services/api';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { DAYS } from '../components/WorkingHoursModal/WorkingHoursModal';
import ConfirmationDialog from '../../../components/feedback/ConfirmationDialog';
import { useFormDraft } from '../../../shared/hooks/useFormDraft';
import DraftStatusBadge from '../../../shared/components/DraftStatusBadge';
import { PatientAppResourcesSection } from './PatientAppResourcesPage';

const AnnouncementsPage = lazyWithRetry(() => import('../../announcements/AnnouncementsPage'));
const clinicInformationTabs = ['general', 'accreditation', 'website', 'patient_app', 'announcements'] as const;

// Clean, minimal field style matching the reference design
const cleanFieldSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: 'var(--input-bg, #fff)',
    fontSize: '14px',
    '& fieldset': {
      borderColor: 'var(--input-border, #d7e3da)',
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
    color: 'var(--input-text, #374151)',
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

interface ClinicFaq { category: string; question: string; answer: string; }

interface ClinicData {
  faqs: ClinicFaq[];
  name: string;
  subtitle: string;
  address: string;
  contact_number: string;
  email: string;
  license_number: string;
  hospital_no: string;
  doh_accreditation_no: string;
  philhealth_accreditation_no: string;
  logo_path?: string | null;
  logo_url?: string | null;
  left_print_logo_path?: string | null;
  left_print_logo_url?: string | null;
  right_print_logo_path?: string | null;
  right_print_logo_url?: string | null;
  header_seal_1_path?: string | null;
  header_seal_1_url?: string | null;
  header_seal_1_label?: string | null;
  header_seal_2_path?: string | null;
  header_seal_2_url?: string | null;
  header_seal_2_label?: string | null;
  header_seal_3_path?: string | null;
  header_seal_3_url?: string | null;
  header_seal_3_label?: string | null;
  hero_image_path?: string | null;
  hero_image_url?: string | null;
  opening_hours: {
    [key: string]: { open: string; close: string; is_open: boolean };
  };
}

export default function ClinicInformation() {
  const navigate = useNavigate();
  const { updateClinic, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const canManageAnnouncements = user?.role === 'admin';
  const requestedTab = searchParams.get('tab');
  const activeTab = clinicInformationTabs.find(tab =>
    tab === requestedTab && (tab !== 'announcements' || canManageAnnouncements)
  ) ?? 'general';
  const showAnnouncements = activeTab === 'announcements';
  const draft = useFormDraft('clinic-info');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState<string>('');
  const [expandedFaq, setExpandedFaq] = useState<number | false>(false);
  const [resourcesRefreshTrigger, setResourcesRefreshTrigger] = useState(0);
  const [clinic, setClinic] = useState<ClinicData>({
    name: '',
    subtitle: '',
    address: '',
    contact_number: '',
    email: '',
    license_number: '',
    hospital_no: '',
    doh_accreditation_no: '',
    philhealth_accreditation_no: '',
    logo_path: null,
    logo_url: null,
    left_print_logo_path: null,
    left_print_logo_url: null,
    right_print_logo_path: null,
    right_print_logo_url: null,
    header_seal_1_path: null,
    header_seal_1_url: null,
    header_seal_1_label: '',
    header_seal_2_path: null,
    header_seal_2_url: null,
    header_seal_2_label: '',
    header_seal_3_path: null,
    header_seal_3_url: null,
    header_seal_3_label: '',
    hero_image_path: null,
    hero_image_url: null,
    opening_hours: {},
    faqs: [],
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);

  // Left Print Logo State
  const [leftLogoFile, setLeftLogoFile] = useState<File | null>(null);
  const [leftLogoPreview, setLeftLogoPreview] = useState<string | null>(null);
  const [removeLeftLogo, setRemoveLeftLogo] = useState(false);

  // Right Print Logo State
  const [rightLogoFile, setRightLogoFile] = useState<File | null>(null);
  const [rightLogoPreview, setRightLogoPreview] = useState<string | null>(null);
  const [removeRightLogo, setRemoveRightLogo] = useState(false);

  // Public Header Seals (Landing Page Navbar)
  const [seal1File, setSeal1File] = useState<File | null>(null);
  const [seal1Preview, setSeal1Preview] = useState<string | null>(null);
  const [removeSeal1, setRemoveSeal1] = useState(false);
  const [seal1Label, setSeal1Label] = useState('Department of Health');

  const [seal2File, setSeal2File] = useState<File | null>(null);
  const [seal2Preview, setSeal2Preview] = useState<string | null>(null);
  const [removeSeal2, setRemoveSeal2] = useState(false);
  const [seal2Label, setSeal2Label] = useState('Tagoloan, Misamis Oriental');

  const [seal3File, setSeal3File] = useState<File | null>(null);
  const [seal3Preview, setSeal3Preview] = useState<string | null>(null);
  const [removeSeal3, setRemoveSeal3] = useState(false);
  const [seal3Label, setSeal3Label] = useState('Rural Health Unit');

  // Landing Page Hero Picture
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null);
  const [heroImagePreview, setHeroImagePreview] = useState<string | null>(null);
  const [removeHeroImage, setRemoveHeroImage] = useState(false);

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
        subtitle: data.subtitle || '',
        address: data.address || '',
        contact_number: data.contact_number || '',
        email: data.email || '',
        license_number: data.license_number || '',
        hospital_no: data.hospital_no || '',
        doh_accreditation_no: data.doh_accreditation_no || '',
        philhealth_accreditation_no: data.philhealth_accreditation_no || '',
        logo_path: data.logo_path || null,
        logo_url: data.logo_url || null,
        left_print_logo_path: data.left_print_logo_path || null,
        left_print_logo_url: data.left_print_logo_url || null,
        right_print_logo_path: data.right_print_logo_path || null,
        right_print_logo_url: data.right_print_logo_url || null,
        header_seal_1_path: data.header_seal_1_path || null,
        header_seal_1_url: data.header_seal_1_url || null,
        header_seal_1_label: data.header_seal_1_label || '',
        header_seal_2_path: data.header_seal_2_path || null,
        header_seal_2_url: data.header_seal_2_url || null,
        header_seal_2_label: data.header_seal_2_label || '',
        header_seal_3_path: data.header_seal_3_path || null,
        header_seal_3_url: data.header_seal_3_url || null,
        header_seal_3_label: data.header_seal_3_label || '',
        hero_image_path: data.hero_image_path || null,
        hero_image_url: data.hero_image_url || null,
        opening_hours: defaultHours,
        faqs: data.faqs || [],
      });

      // If the user had unsaved changes (a draft), restore them on top of the server data
      const savedDraft = draft.readDraft<Partial<Omit<ClinicData, 'logo_path' | 'logo_url' | 'left_print_logo_path' | 'left_print_logo_url' | 'right_print_logo_path' | 'right_print_logo_url' | 'header_seal_1_path' | 'header_seal_1_url' | 'header_seal_2_path' | 'header_seal_2_url' | 'header_seal_3_path' | 'header_seal_3_url' | 'hero_image_path' | 'hero_image_url' | 'opening_hours'>>>();
      if (savedDraft) {
        setClinic(prev => ({ ...prev, ...savedDraft }));
      }

      setLogoFile(null);
      setLogoPreview(null);
      setRemoveLogo(false);

      setLeftLogoFile(null);
      setLeftLogoPreview(null);
      setRemoveLeftLogo(false);

      setRightLogoFile(null);
      setRightLogoPreview(null);
      setRemoveRightLogo(false);

      const loadedSeal1Label = data.header_seal_1_label || 'Department of Health';
      const loadedSeal2Label = data.header_seal_2_label || (data.municipality ? (data.province ? `${data.municipality}, ${data.province}` : data.municipality) : 'Tagoloan, Misamis Oriental');
      const loadedSeal3Label = data.header_seal_3_label || 'Rural Health Unit';

      setSeal1File(null);
      setSeal1Preview(null);
      setRemoveSeal1(false);
      setSeal1Label(loadedSeal1Label);

      setSeal2File(null);
      setSeal2Preview(null);
      setRemoveSeal2(false);
      setSeal2Label(loadedSeal2Label);

      setSeal3File(null);
      setSeal3Preview(null);
      setRemoveSeal3(false);
      setSeal3Label(loadedSeal3Label);

      setHeroImageFile(null);
      setHeroImagePreview(null);
      setRemoveHeroImage(false);

      setSavedSnapshot(JSON.stringify({
        name: data.name || '',
        subtitle: data.subtitle || '',
        address: data.address || '',
        contact_number: data.contact_number || '',
        email: data.email || '',
        license_number: data.license_number || '',
        hospital_no: data.hospital_no || '',
        doh_accreditation_no: data.doh_accreditation_no || '',
        philhealth_accreditation_no: data.philhealth_accreditation_no || '',
        faqs: data.faqs || [],
        seal1Label: loadedSeal1Label,
        seal2Label: loadedSeal2Label,
        seal3Label: loadedSeal3Label,
      }));

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

  const handleInputChange = (field: keyof Omit<ClinicData, 'opening_hours' | 'faqs'>, value: string) => {
    setClinic(prev => {
      const next = { ...prev, [field]: value };
      // Persist draft of text fields only (not logo paths or opening_hours objects)
      const { logo_path, logo_url, left_print_logo_path, left_print_logo_url, right_print_logo_path, right_print_logo_url, header_seal_1_path, header_seal_1_url, header_seal_2_path, header_seal_2_url, header_seal_3_path, header_seal_3_url, hero_image_path, hero_image_url, opening_hours, ...draftable } = next;
      draft.saveDraft(draftable);
      return next;
    });
  };

  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setSnackbar({
        open: true,
        message: 'Logo image must not exceed 2MB in size.',
        severity: 'error',
      });
      return;
    }

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setRemoveLogo(false);
  };

  const handleResetLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setRemoveLogo(true);
  };

  const handleLeftLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setSnackbar({
        open: true,
        message: 'Left print logo image must not exceed 2MB in size.',
        severity: 'error',
      });
      return;
    }

    setLeftLogoFile(file);
    setLeftLogoPreview(URL.createObjectURL(file));
    setRemoveLeftLogo(false);
  };

  const handleResetLeftLogo = () => {
    setLeftLogoFile(null);
    setLeftLogoPreview(null);
    setRemoveLeftLogo(true);
  };

  const handleRightLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setSnackbar({
        open: true,
        message: 'Right print logo image must not exceed 2MB in size.',
        severity: 'error',
      });
      return;
    }

    setRightLogoFile(file);
    setRightLogoPreview(URL.createObjectURL(file));
    setRemoveRightLogo(false);
  };

  const handleResetRightLogo = () => {
    setRightLogoFile(null);
    setRightLogoPreview(null);
    setRemoveRightLogo(true);
  };

  const handleSeal1Change = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setSnackbar({ open: true, message: 'Seal 1 image must not exceed 2MB in size.', severity: 'error' });
      return;
    }
    setSeal1File(file);
    setSeal1Preview(URL.createObjectURL(file));
    setRemoveSeal1(false);
  };

  const handleResetSeal1 = () => {
    setSeal1File(null);
    setSeal1Preview(null);
    setRemoveSeal1(true);
  };

  const handleSeal2Change = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setSnackbar({ open: true, message: 'Seal 2 image must not exceed 2MB in size.', severity: 'error' });
      return;
    }
    setSeal2File(file);
    setSeal2Preview(URL.createObjectURL(file));
    setRemoveSeal2(false);
  };

  const handleResetSeal2 = () => {
    setSeal2File(null);
    setSeal2Preview(null);
    setRemoveSeal2(true);
  };

  const handleSeal3Change = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setSnackbar({ open: true, message: 'Seal 3 image must not exceed 2MB in size.', severity: 'error' });
      return;
    }
    setSeal3File(file);
    setSeal3Preview(URL.createObjectURL(file));
    setRemoveSeal3(false);
  };

  const handleResetSeal3 = () => {
    setSeal3File(null);
    setSeal3Preview(null);
    setRemoveSeal3(true);
  };

  const handleHeroImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setSnackbar({ open: true, message: 'Hero banner image must not exceed 5MB in size.', severity: 'error' });
      return;
    }
    setHeroImageFile(file);
    setHeroImagePreview(URL.createObjectURL(file));
    setRemoveHeroImage(false);
  };

  const handleResetHeroImage = () => {
    setHeroImageFile(null);
    setHeroImagePreview(null);
    setRemoveHeroImage(true);
  };

  const defaultSeal1 = '/assets/logo_doh.jpg';
  const defaultSeal2 = '/assets/logo_mho_tagoloan.jpg';
  const defaultSeal3 = '/assets/logo_rhu.jpg';
  const defaultHero = '/assets/rhu_tagoloan_hero.jpg';

  const displaySeal1Src = seal1Preview
    ? seal1Preview
    : removeSeal1
      ? defaultSeal1
      : clinic.header_seal_1_url || defaultSeal1;

  const displaySeal2Src = seal2Preview
    ? seal2Preview
    : removeSeal2
      ? defaultSeal2
      : clinic.header_seal_2_url || defaultSeal2;

  const displaySeal3Src = seal3Preview
    ? seal3Preview
    : removeSeal3
      ? defaultSeal3
      : clinic.header_seal_3_url || defaultSeal3;

  const displayHeroSrc = heroImagePreview
    ? heroImagePreview
    : removeHeroImage
      ? defaultHero
      : clinic.hero_image_url || defaultHero;

  const backendBase = API_BASE_URL.replace(/\/api\/?$/, '');
  const displayLogoSrc = logoPreview
    ? logoPreview
    : removeLogo
      ? defaultLogo
      : clinic.logo_url
        ? clinic.logo_url
        : clinic.logo_path
          ? `${backendBase}/storage/${clinic.logo_path}`
          : defaultLogo;

  const savedPrintLogos = getGlobalPrintLogos(clinic);
  const displayLeftLogoSrc = leftLogoPreview || (removeLeftLogo ? null : savedPrintLogos.leftLogoUrl);
  const displayRightLogoSrc = rightLogoPreview || (removeRightLogo ? null : savedPrintLogos.rightLogoUrl);

  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const updateFaqs = (faqs: ClinicFaq[]) => {
    const next = { ...clinic, faqs };
    setClinic(next);
    const { logo_path, logo_url, left_print_logo_path, left_print_logo_url, right_print_logo_path, right_print_logo_url, header_seal_1_path, header_seal_1_url, header_seal_2_path, header_seal_2_url, header_seal_3_path, header_seal_3_url, hero_image_path, hero_image_url, opening_hours, ...draftable } = next;
    draft.saveDraft(draftable);
  };

  const handleSubmit = async () => {
    const invalidFaq = clinic.faqs.findIndex(faq => !faq.question.trim() || !faq.answer.trim());
    if (invalidFaq !== -1) {
      setExpandedFaq(invalidFaq);
      setSnackbar({ open: true, message: 'Enter a question and answer for every FAQ, or remove the empty FAQ.', severity: 'error' });
      return;
    }
    if (clinic.contact_number && !/^09\d{9}$/.test(clinic.contact_number.trim())) {
      setSnackbar({
        open: true,
        message: 'Mobile number must start with 09 and contain 11 digits.',
        severity: 'error',
      });
      return;
    }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', clinic.name || '');
      formData.append('subtitle', clinic.subtitle || '');
      formData.append('address', clinic.address || '');
      formData.append('contact_number', clinic.contact_number || '');
      formData.append('email', clinic.email || '');
      formData.append('license_number', clinic.license_number || '');
      formData.append('hospital_no', clinic.hospital_no || '');
      formData.append('doh_accreditation_no', clinic.doh_accreditation_no || '');
      formData.append('philhealth_accreditation_no', clinic.philhealth_accreditation_no || '');
      formData.append('municipality', selectedMunicipality);
      formData.append('province', selectedProvince);
      formData.append('opening_hours', JSON.stringify(clinic.opening_hours));
      formData.append('faqs', JSON.stringify(clinic.faqs.map(faq => ({ category: (faq.category || '').trim(), question: faq.question.trim(), answer: faq.answer.trim() }))));

      if (logoFile) {
        formData.append('logo', logoFile);
      }
      if (removeLogo) {
        formData.append('remove_logo', '1');
      }

      if (leftLogoFile) {
        formData.append('left_print_logo', leftLogoFile);
      }
      if (removeLeftLogo) {
        formData.append('remove_left_print_logo', '1');
      }

      if (rightLogoFile) {
        formData.append('right_print_logo', rightLogoFile);
      }
      if (removeRightLogo) {
        formData.append('remove_right_print_logo', '1');
      }

      // Public Header Seals
      formData.append('header_seal_1_label', seal1Label || '');
      if (seal1File) {
        formData.append('header_seal_1', seal1File);
      }
      if (removeSeal1) {
        formData.append('remove_header_seal_1', '1');
      }

      formData.append('header_seal_2_label', seal2Label || '');
      if (seal2File) {
        formData.append('header_seal_2', seal2File);
      }
      if (removeSeal2) {
        formData.append('remove_header_seal_2', '1');
      }

      formData.append('header_seal_3_label', seal3Label || '');
      if (seal3File) {
        formData.append('header_seal_3', seal3File);
      }
      if (removeSeal3) {
        formData.append('remove_header_seal_3', '1');
      }

      // Landing Hero Picture
      if (heroImageFile) {
        formData.append('hero_image', heroImageFile);
      }
      if (removeHeroImage) {
        formData.append('remove_hero_image', '1');
      }

      const res = await api.post('/setup/clinic', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data?.clinic) {
        const updatedClinic = res.data.clinic;
        if (updateClinic) {
          updateClinic(updatedClinic);
        } else {
          localStorage.setItem('clinicData', JSON.stringify(updatedClinic));
          window.dispatchEvent(new CustomEvent('clinic-updated', { detail: updatedClinic }));
        }

        setClinic(prev => ({
          ...prev,
          name: updatedClinic.name || prev.name,
          subtitle: updatedClinic.subtitle || '',
          logo_path: updatedClinic.logo_path || null,
          logo_url: updatedClinic.logo_url || null,
          left_print_logo_path: updatedClinic.left_print_logo_path || null,
          left_print_logo_url: updatedClinic.left_print_logo_url || null,
          right_print_logo_path: updatedClinic.right_print_logo_path || null,
          right_print_logo_url: updatedClinic.right_print_logo_url || null,
          header_seal_1_path: updatedClinic.header_seal_1_path || null,
          header_seal_1_url: updatedClinic.header_seal_1_url || null,
          header_seal_1_label: updatedClinic.header_seal_1_label || '',
          header_seal_2_path: updatedClinic.header_seal_2_path || null,
          header_seal_2_url: updatedClinic.header_seal_2_url || null,
          header_seal_2_label: updatedClinic.header_seal_2_label || '',
          header_seal_3_path: updatedClinic.header_seal_3_path || null,
          header_seal_3_url: updatedClinic.header_seal_3_url || null,
          header_seal_3_label: updatedClinic.header_seal_3_label || '',
          hero_image_path: updatedClinic.hero_image_path || null,
          hero_image_url: updatedClinic.hero_image_url || null,
        }));
        setLogoFile(null);
        setLogoPreview(null);
        setRemoveLogo(false);

        setLeftLogoFile(null);
        setLeftLogoPreview(null);
        setRemoveLeftLogo(false);

        setRightLogoFile(null);
        setRightLogoPreview(null);
        setRemoveRightLogo(false);

        setSeal1File(null);
        setSeal1Preview(null);
        setRemoveSeal1(false);

        setSeal2File(null);
        setSeal2Preview(null);
        setRemoveSeal2(false);

        setSeal3File(null);
        setSeal3Preview(null);
        setRemoveSeal3(false);

        setHeroImageFile(null);
        setHeroImagePreview(null);
        setRemoveHeroImage(false);
      }

      setSavedSnapshot(JSON.stringify({
        name: clinic.name || '',
        subtitle: clinic.subtitle || '',
        address: clinic.address || '',
        contact_number: clinic.contact_number || '',
        email: clinic.email || '',
        license_number: clinic.license_number || '',
        hospital_no: clinic.hospital_no || '',
        doh_accreditation_no: clinic.doh_accreditation_no || '',
        philhealth_accreditation_no: clinic.philhealth_accreditation_no || '',
        faqs: clinic.faqs.map(faq => ({ category: (faq.category || '').trim(), question: faq.question.trim(), answer: faq.answer.trim() })),
        seal1Label,
        seal2Label,
        seal3Label,
      }));

      setShowSuccessModal(true);
      draft.clearDraft();
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

  const currentSnapshot = JSON.stringify({
    name: clinic.name || '',
    subtitle: clinic.subtitle || '',
    address: clinic.address || '',
    contact_number: clinic.contact_number || '',
    email: clinic.email || '',
    license_number: clinic.license_number || '',
    hospital_no: clinic.hospital_no || '',
    doh_accreditation_no: clinic.doh_accreditation_no || '',
    philhealth_accreditation_no: clinic.philhealth_accreditation_no || '',
    faqs: clinic.faqs,
    seal1Label,
    seal2Label,
    seal3Label,
  });

  const hasUnsavedFiles = Boolean(
    logoFile || removeLogo ||
    leftLogoFile || removeLeftLogo ||
    rightLogoFile || removeRightLogo ||
    seal1File || removeSeal1 ||
    seal2File || removeSeal2 ||
    seal3File || removeSeal3 ||
    heroImageFile || removeHeroImage
  );

  const hasUnsavedChanges = Boolean(
    !loading && (hasUnsavedFiles || (savedSnapshot !== '' && currentSnapshot !== savedSnapshot))
  );

  const handleDiscard = () => {
    draft.clearDraft();
    loadClinicData();
  };


  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Loader label="Loading Clinic Information..." />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', pb: hasUnsavedChanges && !showAnnouncements ? 8 : 2 }}>
      {/* Header */}
      <Box data-walkthrough="clinic-info-header" sx={{ mb: 2.5, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography
            component="h1"
            sx={{
              fontSize: '22px',
              fontWeight: 600,
              lineHeight: 1.25,
              letterSpacing: '-0.5px',
              color: 'var(--text-h, #111827)',
              mb: 0.5,
            }}
          >
            Clinic Information
          </Typography>
          {/* Breadcrumb */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '6px',
              fontSize: '13px',
            }}
          >
            <button
              onClick={() => navigate(ROUTES.DASHBOARD)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: '#3b82f6',
                fontSize: '13px',
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              Dashboard
            </button>
            <span style={{ color: '#9ca3af' }}>›</span>
            <span style={{ color: '#6b7280' }}>Clinic Setup</span>
            <span style={{ color: '#9ca3af' }}>›</span>
            <span style={{ color: '#6b7280' }}>Clinic Information</span>
          </div>
        </Box>

        <Box sx={{ display: showAnnouncements ? 'none' : 'flex', alignItems: 'center', gap: 1.25 }}>
          <Button
            data-walkthrough="clinic-save-btn"
            variant={hasUnsavedChanges ? 'contained' : 'outlined'}
            size="small"
            startIcon={<SaveIcon sx={{ fontSize: 17 }} />}
            onClick={handleSubmit}
            disabled={saving || !hasUnsavedChanges}
            disableElevation
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '13px',
              px: 2,
              height: 38,
              borderRadius: 1.5,
              ...(hasUnsavedChanges
                ? {
                    bgcolor: '#10b981',
                    color: '#ffffff',
                    '&:hover': { bgcolor: '#059669' },
                  }
                : {
                    borderColor: '#d1d5db',
                    color: '#6b7280',
                  }),
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
          <IconButton
            onClick={() => {
              void loadClinicData();
              setResourcesRefreshTrigger((prev) => prev + 1);
            }}
            disabled={loading}
            title="Reload Clinic Information"
            sx={{
              border: '1px solid #e0eae3',
              borderRadius: 1.5,
              width: 38,
              height: 38,
              '&:hover': { bgcolor: '#f9fafb' },
            }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Navigation Tabs */}
      <Box
        sx={{
          borderBottom: '1px solid var(--border-glow, #e2e8f0)',
          mb: 3,
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, tab) => setSearchParams(previous => {
            const next = new URLSearchParams(previous);
            if (tab === 'general') next.delete('tab');
            else next.set('tab', tab);
            return next;
          }, { replace: true })}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 42,
            '& .MuiTabs-indicator': {
              backgroundColor: '#10b981',
              height: 2.5,
              borderRadius: '2px 2px 0 0',
            },
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '13.5px',
              color: '#64748b',
              minHeight: 42,
              px: 2,
              '&.Mui-selected': {
                color: '#059669',
                fontWeight: 700,
              },
            },
          }}
        >
          <Tab value="general" label="General" />
          <Tab value="accreditation" label="Accreditation & Print" />
          <Tab value="website" label="Public Website" />
          <Tab value="patient_app" label={`Patient App (${clinic.faqs.length} FAQs)`} />
          {canManageAnnouncements && <Tab value="announcements" label="Announcements" />}
        </Tabs>
      </Box>

      {/* TAB 1: GENERAL */}
      {activeTab === 'general' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Card: Application Identity */}
          <Paper
            data-walkthrough="clinic-branding-section"
            elevation={0}
            sx={{
              border: '1px solid var(--border-glow, #e0eae3)',
              borderRadius: 2,
              p: 3,
              bgcolor: 'var(--card-bg-solid, #fff)',
            }}
          >
            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#277a4b', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              APPLICATION IDENTITY
            </Typography>
            <Box sx={{ height: '2px', width: '40px', bgcolor: '#10b981', mb: 3 }} />

            {/* App Logo Row */}
            <Box
              data-walkthrough="clinic-app-logo"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 2,
                mb: 3,
                maxWidth: 460,
                bgcolor: '#fff',
                border: '1px solid var(--border-glow, #e2e8f0)',
                borderRadius: 2,
              }}
            >
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: 2,
                  border: '2px dashed #10b981',
                  bgcolor: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 1,
                  flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  overflow: 'hidden',
                }}
              >
                <img
                  src={displayLogoSrc}
                  alt="Clinic Logo"
                  style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    if (target.src !== defaultLogo) {
                      target.src = defaultLogo;
                    }
                  }}
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-h, #1f2937)', mb: 1 }}>
                  Clinic &amp; Application Logo
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <input
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    id="clinic-logo-upload"
                    name="clinic_logo"
                    type="file"
                    style={{ display: 'none' }}
                    onChange={handleLogoChange}
                  />
                  <label htmlFor="clinic-logo-upload">
                    <Button
                      variant="outlined"
                      component="span"
                      size="small"
                      startIcon={<CloudUploadIcon />}
                      sx={{
                        textTransform: 'none',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        color: '#059669',
                        borderColor: '#10b981',
                        '&:hover': { borderColor: '#059669', bgcolor: '#ecfdf5' },
                      }}
                    >
                      {logoFile || clinic.logo_path || (clinic.logo_url && clinic.logo_url !== defaultLogo) ? 'Replace Logo' : 'Upload Logo'}
                    </Button>
                  </label>
                  {(clinic.logo_path || logoPreview || (clinic.logo_url && clinic.logo_url !== defaultLogo)) && !removeLogo && (
                    <Button
                      variant="text"
                      size="small"
                      startIcon={<DeleteOutlineIcon />}
                      onClick={handleResetLogo}
                      sx={{
                        textTransform: 'none',
                        fontSize: '12.5px',
                        fontWeight: 500,
                        color: '#ef4444',
                        '&:hover': { bgcolor: '#fef2f2' },
                      }}
                    >
                      Reset
                    </Button>
                  )}
                </Box>
                {logoFile && (
                  <Typography sx={{ fontSize: '11px', color: '#10b981', fontWeight: 500, mt: 0.75, overflowWrap: 'anywhere' }}>
                    Selected: {logoFile.name}
                  </Typography>
                )}
                {removeLogo && (
                  <Typography sx={{ fontSize: '11px', color: '#f59e0b', fontWeight: 500, mt: 0.75 }}>
                    Will reset to default on save
                  </Typography>
                )}
              </Box>
            </Box>

            {/* Title and Subtitle Inputs */}
            <Box data-walkthrough="clinic-name-tagline" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
              <Box data-walkthrough="clinic-name-input">
                <FieldLabel required>Main Title (Clinic Name)</FieldLabel>
                <TextField
                  id="clinic-name-input"
                  name="clinic_name"
                  fullWidth
                  size="small"
                  placeholder="e.g. Animal Bite Treatment Center"
                  value={clinic.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  sx={cleanFieldSx}
                  helperText="Primary clinic name shown at the top of the sidebar"
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

              <Box data-walkthrough="clinic-subtitle-input">
                <FieldLabel>Subtitle (Application Tagline)</FieldLabel>
                <TextField
                  id="clinic-subtitle-input"
                  name="clinic_subtitle"
                  fullWidth
                  size="small"
                  placeholder="e.g. Tagoloan Animal Bite Treatment Application"
                  value={clinic.subtitle}
                  onChange={(e) => handleInputChange('subtitle', e.target.value)}
                  sx={cleanFieldSx}
                  helperText="Secondary tagline displayed below the clinic name in the sidebar"
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SubtitlesIcon sx={{ color: '#9ca3af', fontSize: 16 }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Box>
            </Box>
          </Paper>

          {/* Card: Location & Contact */}
          <Paper
            elevation={0}
            sx={{
              border: '1px solid var(--border-glow, #e0eae3)',
              borderRadius: 2,
              p: 3,
              bgcolor: 'var(--card-bg-solid, #fff)',
            }}
          >
            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#277a4b', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              LOCATION &amp; CONTACT
            </Typography>
            <Box sx={{ height: '2px', width: '40px', bgcolor: '#10b981', mb: 3 }} />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {/* Address */}
              <Box data-walkthrough="clinic-address-section">
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                  <FieldLabel>Clinic Address</FieldLabel>
                  <Button
                    size="small"
                    onClick={() => setUseManualAddress(!useManualAddress)}
                    sx={{ fontSize: '11.5px', textTransform: 'none', color: '#10b981', p: 0, minWidth: 0, fontWeight: 600 }}
                  >
                    {useManualAddress ? (
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                        <SettingsIcon sx={{ fontSize: 13 }} />
                        <span>Use Dropdown Selectors</span>
                      </Box>
                    ) : (
                      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                        <EditIcon sx={{ fontSize: 13 }} />
                        <span>Use Freeform Text</span>
                      </Box>
                    )}
                  </Button>
                </Box>

                {!useManualAddress ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                      <Box>
                        <Typography sx={{ fontSize: 12, fontWeight: 500, color: '#6b7280', mb: 0.5 }}>Province</Typography>
                        <Select
                          id="clinic-province-select"
                          name="province"
                          inputProps={{ id: 'clinic-province-select-input', name: 'province' }}
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
                          id="clinic-municipality-select"
                          name="municipality"
                          inputProps={{ id: 'clinic-municipality-select-input', name: 'municipality' }}
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
                          id="clinic-barangay-select"
                          name="barangay"
                          inputProps={{ id: 'clinic-barangay-select-input', name: 'barangay' }}
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
                          id="clinic-street-input"
                          name="street"
                          fullWidth
                          size="small"
                          placeholder="e.g. Zone 2, Main Highway"
                          value={streetDetail}
                          onChange={(e) => handleStreetDetailChange(e.target.value)}
                          sx={cleanFieldSx}
                        />
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: 12, color: '#065f46', fontWeight: 500, bgcolor: '#ecfdf5', border: '1px solid #a7f3d0', p: 1.25, borderRadius: 1.5 }}>
                      <PlaceIcon sx={{ fontSize: 16, color: '#059669' }} />
                      <span>Generated Full Address: <strong>{clinic.address || 'Select options above'}</strong></span>
                    </Box>
                  </Box>
                ) : (
                  <TextField
                    id="clinic-address-input"
                    name="address"
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

              {/* Contact Channels */}
              <Box
                data-walkthrough="clinic-contact-channels-section"
                sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}
              >
                <Box data-walkthrough="clinic-contact-number">
                  <FieldLabel>Contact Number</FieldLabel>
                  <TextField
                    id="clinic-contact-number-input"
                    name="contact_number"
                    fullWidth
                    size="small"
                    placeholder="09XXXXXXXXX"
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

                <Box data-walkthrough="clinic-email-address">
                  <FieldLabel>Email Address</FieldLabel>
                  <TextField
                    id="clinic-email-input"
                    name="email"
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
            </Box>
          </Paper>
        </Box>
      )}

      {/* TAB 2: ACCREDITATION & PRINT */}
      {activeTab === 'accreditation' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Card: Accreditation Numbers */}
          <Paper
            data-walkthrough="clinic-facility-section"
            elevation={0}
            sx={{
              border: '1px solid var(--border-glow, #e0eae3)',
              borderRadius: 2,
              p: 3,
              bgcolor: 'var(--card-bg-solid, #fff)',
            }}
          >
            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#277a4b', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              FACILITY &amp; ACCREDITATION NUMBERS
            </Typography>
            <Box sx={{ height: '2px', width: '40px', bgcolor: '#10b981', mb: 3 }} />

            <Box
              data-walkthrough="clinic-accreditation-block"
              sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}
            >
              <Box data-walkthrough="clinic-license-number">
                <FieldLabel>License Number</FieldLabel>
                <TextField
                  id="clinic-license-number-input"
                  name="license_number"
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

              <Box data-walkthrough="clinic-hospital-number">
                <FieldLabel>Hospital Number (Hospital No.)</FieldLabel>
                <TextField
                  id="clinic-hospital-no-input"
                  name="hospital_no"
                  fullWidth
                  size="small"
                  placeholder="e.g. HOSP-9923"
                  value={clinic.hospital_no}
                  onChange={(e) => handleInputChange('hospital_no', e.target.value)}
                  sx={cleanFieldSx}
                  helperText="Official hospital identifier displayed on treatment cards"
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

              <Box data-walkthrough="clinic-doh-number">
                <FieldLabel>DOH Accreditation Number</FieldLabel>
                <TextField
                  id="clinic-doh-number-input"
                  name="doh_accreditation_no"
                  fullWidth
                  size="small"
                  placeholder="e.g. 2022-10-037"
                  value={clinic.doh_accreditation_no}
                  onChange={(e) => handleInputChange('doh_accreditation_no', e.target.value)}
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

              <Box data-walkthrough="clinic-philhealth-number">
                <FieldLabel>PhilHealth Accreditation Number</FieldLabel>
                <TextField
                  id="clinic-philhealth-number-input"
                  name="philhealth_accreditation_no"
                  fullWidth
                  size="small"
                  placeholder="e.g. B10034377"
                  value={clinic.philhealth_accreditation_no}
                  onChange={(e) => handleInputChange('philhealth_accreditation_no', e.target.value)}
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
            </Box>
          </Paper>

          {/* Card: Print Form Header Logos */}
          <Paper
            elevation={0}
            sx={{
              border: '1px solid var(--border-glow, #e0eae3)',
              borderRadius: 2,
              p: 3,
              bgcolor: 'var(--card-bg-solid, #fff)',
            }}
          >
            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#277a4b', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              PRINT FORM HEADER LOGOS
            </Typography>
            <Box sx={{ height: '2px', width: '40px', bgcolor: '#10b981', mb: 1.5 }} />
            <Typography sx={{ fontSize: '13px', color: '#64748b', mb: 2.5 }}>
              Logos printed on the left and right corners of official DOH forms, vaccination cards, and reports.
            </Typography>

            <Box data-walkthrough="clinic-logos-container" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
              {/* Left Print Logo */}
              <Box
                data-walkthrough="clinic-left-logo"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 2,
                  bgcolor: '#ffffff',
                  border: '1px solid var(--border-glow, #e2e8f0)',
                  borderRadius: 2,
                }}
              >
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: 2,
                    border: displayLeftLogoSrc ? '2px dashed #10b981' : '1.5px dashed #cbd5e1',
                    bgcolor: displayLeftLogoSrc ? '#ffffff' : '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 0.75,
                    flexShrink: 0,
                    overflow: 'hidden',
                  }}
                >
                  {displayLeftLogoSrc ? (
                    <img src={displayLeftLogoSrc} alt="Left Print Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                  ) : (
                    <Box sx={{ textAlign: 'center', p: 0.5 }}>
                      <CloudUploadIcon sx={{ fontSize: 20, color: '#94a3b8' }} />
                      <Typography sx={{ fontSize: '9px', color: '#94a3b8', lineHeight: 1.1, mt: 0.25 }}>No logo</Typography>
                    </Box>
                  )}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-h, #1f2937)', mb: 1 }}>
                    Left Print Logo
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <input accept="image/png,image/jpeg,image/webp,image/svg+xml" id="left-print-logo-upload" name="left_print_logo" type="file" style={{ display: 'none' }} onChange={handleLeftLogoChange} />
                    <label htmlFor="left-print-logo-upload">
                      <Button variant="outlined" component="span" size="small" startIcon={<CloudUploadIcon />} sx={{ textTransform: 'none', fontSize: '12.5px', fontWeight: 600, color: '#059669', borderColor: '#10b981', '&:hover': { borderColor: '#059669', bgcolor: '#ecfdf5' } }}>
                        {displayLeftLogoSrc ? 'Replace Logo' : 'Upload Logo'}
                      </Button>
                    </label>
                    {displayLeftLogoSrc && !removeLeftLogo && (
                      <Button variant="text" size="small" startIcon={<DeleteOutlineIcon />} onClick={handleResetLeftLogo} sx={{ textTransform: 'none', fontSize: '12.5px', fontWeight: 500, color: '#ef4444', '&:hover': { bgcolor: '#fef2f2' } }}>
                        Remove
                      </Button>
                    )}
                  </Box>
                  {leftLogoFile && <Typography sx={{ fontSize: '11px', color: '#10b981', fontWeight: 500, mt: 0.75, overflowWrap: 'anywhere' }}>Selected: {leftLogoFile.name}</Typography>}
                  {removeLeftLogo && <Typography sx={{ fontSize: '11px', color: '#f59e0b', fontWeight: 500, mt: 0.75 }}>Will be removed on save</Typography>}
                </Box>
              </Box>

              {/* Right Print Logo */}
              <Box
                data-walkthrough="clinic-right-logo"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 2,
                  bgcolor: '#ffffff',
                  border: '1px solid var(--border-glow, #e2e8f0)',
                  borderRadius: 2,
                }}
              >
                <Box
                  sx={{
                    width: 64,
                    height: 64,
                    borderRadius: 2,
                    border: displayRightLogoSrc ? '2px dashed #10b981' : '1.5px dashed #cbd5e1',
                    bgcolor: displayRightLogoSrc ? '#ffffff' : '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 0.75,
                    flexShrink: 0,
                    overflow: 'hidden',
                  }}
                >
                  {displayRightLogoSrc ? (
                    <img src={displayRightLogoSrc} alt="Right Print Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                  ) : (
                    <Box sx={{ textAlign: 'center', p: 0.5 }}>
                      <CloudUploadIcon sx={{ fontSize: 20, color: '#94a3b8' }} />
                      <Typography sx={{ fontSize: '9px', color: '#94a3b8', lineHeight: 1.1, mt: 0.25 }}>No logo</Typography>
                    </Box>
                  )}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-h, #1f2937)', mb: 1 }}>
                    Right Print Logo
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <input accept="image/png,image/jpeg,image/webp,image/svg+xml" id="right-print-logo-upload" name="right_print_logo" type="file" style={{ display: 'none' }} onChange={handleRightLogoChange} />
                    <label htmlFor="right-print-logo-upload">
                      <Button variant="outlined" component="span" size="small" startIcon={<CloudUploadIcon />} sx={{ textTransform: 'none', fontSize: '12.5px', fontWeight: 600, color: '#059669', borderColor: '#10b981', '&:hover': { borderColor: '#059669', bgcolor: '#ecfdf5' } }}>
                        {displayRightLogoSrc ? 'Replace Logo' : 'Upload Logo'}
                      </Button>
                    </label>
                    {displayRightLogoSrc && !removeRightLogo && (
                      <Button variant="text" size="small" startIcon={<DeleteOutlineIcon />} onClick={handleResetRightLogo} sx={{ textTransform: 'none', fontSize: '12.5px', fontWeight: 500, color: '#ef4444', '&:hover': { bgcolor: '#fef2f2' } }}>
                        Remove
                      </Button>
                    )}
                  </Box>
                  {rightLogoFile && <Typography sx={{ fontSize: '11px', color: '#10b981', fontWeight: 500, mt: 0.75, overflowWrap: 'anywhere' }}>Selected: {rightLogoFile.name}</Typography>}
                  {removeRightLogo && <Typography sx={{ fontSize: '11px', color: '#f59e0b', fontWeight: 500, mt: 0.75 }}>Will be removed on save</Typography>}
                </Box>
              </Box>
            </Box>
          </Paper>
        </Box>
      )}

      {/* TAB 3: PUBLIC WEBSITE */}
      {activeTab === 'website' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Card: Navbar Official Seals */}
          <Paper
            data-walkthrough="clinic-landing-branding-section"
            elevation={0}
            sx={{
              border: '1px solid var(--border-glow, #e0eae3)',
              borderRadius: 2,
              p: 3,
              bgcolor: 'var(--card-bg-solid, #fff)',
            }}
          >
            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#277a4b', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              NAVBAR OFFICIAL SEALS
            </Typography>
            <Box sx={{ height: '2px', width: '40px', bgcolor: '#10b981', mb: 1.5 }} />
            <Typography sx={{ fontSize: '13px', color: '#64748b', mb: 2.5 }}>
              The 3 official seals displayed in the public landing page header.
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }, gap: 2 }}>
              {[
                {
                  id: 'seal-1-upload',
                  badge: 'Header Seal 1',
                  placeholder: 'e.g. Department of Health',
                  src: displaySeal1Src,
                  fallback: defaultSeal1,
                  label: seal1Label,
                  setLabel: setSeal1Label,
                  file: seal1File,
                  preview: seal1Preview,
                  savedPath: clinic.header_seal_1_path,
                  removed: removeSeal1,
                  onChange: handleSeal1Change,
                  onReset: handleResetSeal1,
                },
                {
                  id: 'seal-2-upload',
                  badge: 'Header Seal 2',
                  placeholder: 'e.g. Tagoloan, Misamis Oriental',
                  src: displaySeal2Src,
                  fallback: defaultSeal2,
                  label: seal2Label,
                  setLabel: setSeal2Label,
                  file: seal2File,
                  preview: seal2Preview,
                  savedPath: clinic.header_seal_2_path,
                  removed: removeSeal2,
                  onChange: handleSeal2Change,
                  onReset: handleResetSeal2,
                },
                {
                  id: 'seal-3-upload',
                  badge: 'Header Seal 3',
                  placeholder: 'e.g. Rural Health Unit',
                  src: displaySeal3Src,
                  fallback: defaultSeal3,
                  label: seal3Label,
                  setLabel: setSeal3Label,
                  file: seal3File,
                  preview: seal3Preview,
                  savedPath: clinic.header_seal_3_path,
                  removed: removeSeal3,
                  onChange: handleSeal3Change,
                  onReset: handleResetSeal3,
                },
              ].map((seal) => (
                <Box
                  key={seal.id}
                  sx={{
                    p: 2,
                    bgcolor: '#ffffff',
                    border: '1px solid var(--border-glow, #e2e8f0)',
                    borderRadius: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 52,
                        height: 52,
                        borderRadius: '50%',
                        border: '2px solid #10b981',
                        bgcolor: '#ffffff',
                        p: 0.4,
                        flexShrink: 0,
                        overflow: 'hidden',
                      }}
                    >
                      <img
                        src={seal.src}
                        alt={`${seal.badge} Preview`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = seal.fallback;
                        }}
                      />
                    </Box>
                    <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {seal.badge}
                    </Typography>
                  </Box>

                  <Box>
                    <FieldLabel>Label</FieldLabel>
                    <TextField
                      fullWidth
                      size="small"
                      value={seal.label}
                      onChange={(e) => seal.setLabel(e.target.value)}
                      placeholder={seal.placeholder}
                      sx={cleanFieldSx}
                    />
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 'auto' }}>
                    <input accept="image/png,image/jpeg,image/webp,image/svg+xml" id={seal.id} type="file" style={{ display: 'none' }} onChange={seal.onChange} />
                    <label htmlFor={seal.id}>
                      <Button variant="outlined" component="span" size="small" startIcon={<CloudUploadIcon />} sx={{ textTransform: 'none', fontSize: '12px', fontWeight: 600, color: '#059669', borderColor: '#10b981', py: 0.5, px: 1.25, '&:hover': { borderColor: '#059669', bgcolor: '#ecfdf5' } }}>
                        {seal.file || seal.savedPath ? 'Replace Seal' : 'Upload Seal'}
                      </Button>
                    </label>
                    {(seal.file || seal.savedPath || seal.preview) && !seal.removed && (
                      <Button variant="text" size="small" startIcon={<DeleteOutlineIcon />} onClick={seal.onReset} sx={{ textTransform: 'none', fontSize: '12px', fontWeight: 500, color: '#ef4444', py: 0.5, px: 1, '&:hover': { bgcolor: '#fef2f2' } }}>
                        Reset
                      </Button>
                    )}
                  </Box>

                  {seal.file && <Typography sx={{ fontSize: '11px', color: '#10b981', fontWeight: 500 }}>Selected: {seal.file.name}</Typography>}
                  {seal.removed && <Typography sx={{ fontSize: '11px', color: '#f59e0b', fontWeight: 500 }}>Will reset to default on save</Typography>}
                </Box>
              ))}
            </Box>
          </Paper>

          {/* Card: Landing Page Hero Picture */}
          <Paper
            elevation={0}
            sx={{
              border: '1px solid var(--border-glow, #e0eae3)',
              borderRadius: 2,
              p: 3,
              bgcolor: 'var(--card-bg-solid, #fff)',
            }}
          >
            <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#277a4b', mb: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              LANDING PAGE HERO PICTURE
            </Typography>
            <Box sx={{ height: '2px', width: '40px', bgcolor: '#10b981', mb: 2.5 }} />

            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { md: 'center' }, gap: 3 }}>
              <Box
                sx={{
                  width: { xs: '100%', md: 420 },
                  height: 175,
                  borderRadius: 2,
                  overflow: 'hidden',
                  position: 'relative',
                  border: '1px solid #cbd5e1',
                  bgcolor: '#0f172a',
                  flexShrink: 0,
                }}
              >
                <img
                  src={displayHeroSrc}
                  alt="Landing Page Hero Preview"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = defaultHero;
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(15, 23, 42, 0.72) 0%, transparent 65%)',
                    pointerEvents: 'none',
                  }}
                />
                <Box sx={{ position: 'absolute', bottom: 12, left: 14, color: '#ffffff', pointerEvents: 'none' }}>
                  <Typography sx={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#34d399' }}>
                    Hero Preview
                  </Typography>
                  <Typography sx={{ fontSize: '14px', fontWeight: 700 }}>
                    ANIMAL BITE TREATMENT CENTER
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: '13px', color: '#475569', mb: 1.5, lineHeight: 1.5 }}>
                  Displayed at the top of the public landing page. Use a landscape photo (16:9 or 21:9, at least 1920×800px, max 5MB).
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <input accept="image/png,image/jpeg,image/webp" id="hero-image-upload" type="file" style={{ display: 'none' }} onChange={handleHeroImageChange} />
                  <label htmlFor="hero-image-upload">
                    <Button variant="outlined" component="span" size="small" startIcon={<CloudUploadIcon />} sx={{ textTransform: 'none', fontSize: '12.5px', fontWeight: 600, color: '#059669', borderColor: '#10b981', py: 0.75, px: 2, '&:hover': { borderColor: '#059669', bgcolor: '#ecfdf5' } }}>
                      {heroImageFile || clinic.hero_image_path ? 'Replace Hero Picture' : 'Upload Hero Picture'}
                    </Button>
                  </label>
                  {(heroImageFile || clinic.hero_image_path || heroImagePreview) && !removeHeroImage && (
                    <Button variant="text" size="small" startIcon={<DeleteOutlineIcon />} onClick={handleResetHeroImage} sx={{ textTransform: 'none', fontSize: '12.5px', fontWeight: 500, color: '#ef4444', py: 0.75, px: 1.5, '&:hover': { bgcolor: '#fef2f2' } }}>
                      Reset to Default
                    </Button>
                  )}
                </Box>

                {heroImageFile && (
                  <Typography sx={{ fontSize: '12px', color: '#10b981', fontWeight: 600, mt: 1 }}>
                    Selected: {heroImageFile.name} ({(heroImageFile.size / (1024 * 1024)).toFixed(2)} MB)
                  </Typography>
                )}
                {removeHeroImage && (
                  <Typography sx={{ fontSize: '12px', color: '#f59e0b', fontWeight: 600, mt: 1 }}>
                    Will reset to default hero image on save
                  </Typography>
                )}
              </Box>
            </Box>
          </Paper>
        </Box>
      )}

      {/* TAB 4: PATIENT APP */}
      {activeTab === 'patient_app' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Card: FAQs */}
          <Paper
            data-walkthrough="clinic-faqs-section"
            elevation={0}
            sx={{
              border: '1px solid var(--border-glow, #e0eae3)',
              borderRadius: 2,
              p: 3,
              bgcolor: 'var(--card-bg-solid, #fff)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 0.5 }}>
              <Box>
                <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#277a4b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  PATIENT APP FAQS ({clinic.faqs.length})
                </Typography>
                <Box sx={{ height: '2px', width: '40px', bgcolor: '#10b981', mt: 0.5 }} />
              </Box>
              <Button
                data-walkthrough="clinic-faqs-add-btn"
                size="small"
                variant="outlined"
                startIcon={<AddIcon />}
                disabled={saving || clinic.faqs.length >= 50}
                onClick={() => {
                  setExpandedFaq(clinic.faqs.length);
                  updateFaqs([...clinic.faqs, { category: '', question: '', answer: '' }]);
                }}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '12.5px',
                  color: '#059669',
                  borderColor: '#10b981',
                  '&:hover': { borderColor: '#059669', bgcolor: '#ecfdf5' },
                }}
              >
                Add FAQ
              </Button>
            </Box>
            <Typography sx={{ fontSize: '12.5px', color: '#64748b', mt: 1, mb: 2 }}>
              Select a question to edit. Click Save Changes to publish FAQ updates to the patient app.
            </Typography>
            <Box data-walkthrough="clinic-faqs-list">
              {clinic.faqs.length === 0 && <Typography variant="body2" color="text.secondary">No FAQs added yet.</Typography>}
              {clinic.faqs.map((faq, index) => (
                <Accordion
                  key={index}
                  disableGutters
                  elevation={0}
                  expanded={expandedFaq === index}
                  onChange={(_, expanded) => setExpandedFaq(expanded ? index : false)}
                  sx={{ border: '1px solid #d7e3da', borderRadius: '6px !important', mb: 0.75, '&:before': { display: 'none' } }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    id={`faq-${index}-header`}
                    aria-controls={`faq-${index}-content`}
                    sx={{ minHeight: 44, px: 1.5, '& .MuiAccordionSummary-content': { my: 1, minWidth: 0, alignItems: 'center', gap: 1 } }}
                  >
                    <Typography variant="caption" color="text.secondary">{index + 1}.</Typography>
                    <Typography variant="body2" noWrap sx={{ fontWeight: 500, flex: 1 }}>{faq.question.trim() || 'New question'}</Typography>
                    {faq.category && <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: '25%', display: { xs: 'none', sm: 'block' } }}>{faq.category}</Typography>}
                  </AccordionSummary>
                  <AccordionDetails id={`faq-${index}-content`} sx={{ p: 1.5, pt: 0.5, display: 'grid', gap: 1.5 }}>
                    {(['category', 'question', 'answer'] as const).map(field => (
                      <TextField
                        key={field}
                        id={`faq-${index}-${field}`}
                        name={`faq_${index}_${field}`}
                        size="small"
                        label={field === 'category' ? 'Category (optional)' : field === 'question' ? 'Question' : 'Answer'}
                        required={field !== 'category'}
                        fullWidth
                        disabled={saving}
                        value={faq[field] ?? ''}
                        multiline={field !== 'category'}
                        minRows={field === 'answer' ? 2 : undefined}
                        slotProps={{ htmlInput: { maxLength: field === 'category' ? 100 : field === 'question' ? 500 : 5000 } }}
                        onChange={event => updateFaqs(clinic.faqs.map((item, i) => i === index ? { ...item, [field]: event.target.value } : item))}
                      />
                    ))}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Button size="small" color="error" disabled={saving} startIcon={<DeleteOutlineIcon />} onClick={() => { updateFaqs(clinic.faqs.filter((_, i) => i !== index)); setExpandedFaq(false); }}>
                        Remove FAQ
                      </Button>
                      <Button size="small" onClick={() => setExpandedFaq(false)}>Collapse</Button>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          </Paper>

          {/* Card: Learn More Resources (auto-saves immediately) */}
          <PatientAppResourcesSection embedded refreshTrigger={resourcesRefreshTrigger} />
        </Box>
      )}

      {showAnnouncements && (
        <Suspense fallback={<Loader label="Loading Announcements..." />}>
          <AnnouncementsPage />
        </Suspense>
      )}

      {/* Sticky Save Bar (appears only when there are unsaved changes) */}
      {hasUnsavedChanges && !showAnnouncements && (
        <Paper
          elevation={4}
          sx={{
            position: 'sticky',
            bottom: 16,
            zIndex: 30,
            mt: 3,
            px: 2.5,
            py: 1.5,
            borderRadius: 2,
            border: '1px solid #a7f3d0',
            bgcolor: 'rgba(255, 255, 255, 0.96)',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1.5,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#f59e0b', flexShrink: 0 }} />
            <Typography sx={{ fontSize: '13.5px', fontWeight: 600, color: '#111827' }}>
              Unsaved changes
            </Typography>
            <DraftStatusBadge status={draft.status} savedAt={draft.savedAt} />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={handleDiscard}
              disabled={saving}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '13px',
                color: '#475569',
                borderColor: '#cbd5e1',
                px: 2,
                py: 0.75,
                borderRadius: 1.5,
                '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' },
              }}
            >
              Discard
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<SaveIcon />}
              onClick={handleSubmit}
              disabled={saving}
              disableElevation
              sx={{
                bgcolor: '#10b981',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '13.5px',
                px: 2.5,
                py: 0.75,
                borderRadius: 1.5,
                '&:hover': { bgcolor: '#059669' },
              }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        </Paper>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <ConfirmationDialog
          variant="success"
          title="Clinic Information Saved"
          message="Clinic details and operating hours have been updated successfully."
          confirmLabel="OK"
          hideCancel
          onConfirm={() => setShowSuccessModal(false)}
        />
      )}

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

# Bite Location Map Implementation Guide

**Purpose**: Visualize geographical distribution of animal bite incidents across municipalities and barangays  
**Target User**: Admin Dashboard  
**Last Updated**: July 27, 2026

---

## 📍 **Overview**

The Bite Map is a geographical visualization tool that displays:
- **Heatmap** of bite incidents by location
- **Markers** for individual bite cases with details
- **Clustering** for dense areas
- **Statistics** by municipality and barangay
- **Time-based filtering** (date range, last 30/60/90 days)
- **Interactive tooltips** with case details

---

## 🎯 **Placement Recommendation**

### **Option 1: Dedicated Page (RECOMMENDED)**
Create a new "Bite Map" page in the admin dashboard navigation.

**Location**: `frontend/src/features/bite-cases/pages/BiteMapPage.tsx`

**Reasons**:
- ✅ Full screen space for map visualization
- ✅ Dedicated UI for filters and statistics
- ✅ Better user experience for detailed analysis
- ✅ Easier to implement advanced features
- ✅ Doesn't clutter the main dashboard

**Navigation**:
```
Admin Dashboard → Sidebar → "Bite Map" (new menu item)
```


### **Option 2: Dashboard Widget**
Add a smaller map widget to the Admin Dashboard.

**Location**: `frontend/src/features/dashboard/components/BiteMapWidget/`

**Reasons**:
- ✅ Quick overview on main dashboard
- ✅ Click to view full map
- ⚠️ Limited space for detailed analysis
- ⚠️ May clutter the dashboard

**Recommendation**: Use Option 2 as a **preview** that links to Option 1.

---

## 🏗️ **Architecture**

### **Backend Structure**

```
backend/
├── app/
│   ├── Http/Controllers/
│   │   └── BiteCaseController.php
│   │       └── getMapData() method ✨ NEW
│   └── Models/
│       ├── BiteIncident.php (existing)
│       └── BiteLocation.php (existing)
└── routes/
    └── api.php
        └── GET /api/bite-cases/map-data ✨ NEW
```

### **Frontend Structure**


```
frontend/src/features/bite-cases/
├── pages/
│   └── BiteMapPage.tsx ✨ NEW
├── components/
│   ├── BiteMap/
│   │   ├── BiteMap.tsx ✨ NEW
│   │   ├── BiteMap.styles.ts ✨ NEW
│   │   ├── MapMarker.tsx ✨ NEW
│   │   ├── MapLegend.tsx ✨ NEW
│   │   ├── MapFilters.tsx ✨ NEW
│   │   └── MapStats.tsx ✨ NEW
│   └── index.ts (update)
├── services/
│   └── biteCaseService.ts ✨ NEW
└── types/
    └── biteCase.types.ts ✨ NEW
```

---

## 📦 **Required Libraries**

### **Recommended: Leaflet (Open Source)**

```bash
cd frontend
npm install leaflet react-leaflet
npm install --save-dev @types/leaflet
```

**Why Leaflet?**
- ✅ Free and open source
- ✅ Lightweight (38KB)
- ✅ Excellent React support
- ✅ Offline-capable
- ✅ Customizable markers and layers
- ✅ Good for Philippine maps (OpenStreetMap)


### **Alternative: Google Maps**

```bash
npm install @react-google-maps/api
```

**Considerations**:
- ⚠️ Requires API key (free tier: 28,000 loads/month)
- ⚠️ Billing required after free tier
- ✅ Better for Philippine locations
- ✅ Street view integration

---

## 🔨 **Implementation Steps**

### **STEP 1: Backend API Endpoint**

#### 1.1 Add Controller Method

**File**: `backend/app/Http/Controllers/BiteCaseController.php`

```php
/**
 * Get bite cases with location data for map visualization
 * 
 * @param Request $request
 * @return JsonResponse
 */
public function getMapData(Request $request)
{
    $query = BiteIncident::with(['location', 'patient'])
        ->whereHas('location', function ($q) {
            $q->whereNotNull('latitude')
              ->whereNotNull('longitude');
        });
    
    // Filter by date range
    if ($request->has('date_from')) {
        $query->where('bite_date', '>=', $request->date_from);
    }
    if ($request->has('date_to')) {
        $query->where('bite_date', '<=', $request->date_to);
    }
    

    // Filter by municipality
    if ($request->has('municipality')) {
        $query->whereHas('location', function ($q) use ($request) {
            $q->where('municipality', $request->municipality);
        });
    }
    
    // Filter by severity
    if ($request->has('severity')) {
        $query->where('severity', $request->severity);
    }
    
    $cases = $query->get()->map(function ($case) {
        return [
            'bite_id' => $case->bite_id,
            'case_number' => $case->case_number,
            'bite_date' => $case->bite_date,
            'latitude' => $case->location->latitude,
            'longitude' => $case->location->longitude,
            'barangay' => $case->location->barangay,
            'municipality' => $case->location->municipality,
            'address' => $case->location->bite_address,
            'severity' => $case->severity,
            'animal_type' => $case->animal_type,
            'exposure_type' => $case->exposure_type,
            'patient_name' => $case->patient ? 
                "{$case->patient->first_name} {$case->patient->last_name}" : 'Unknown',
            'status' => $case->status,
        ];
    });
    

    // Generate statistics
    $stats = [
        'total_cases' => $cases->count(),
        'by_municipality' => $cases->groupBy('municipality')->map->count(),
        'by_barangay' => $cases->groupBy('barangay')->map->count(),
        'by_severity' => [
            'minor' => $cases->where('severity', 'minor')->count(),
            'moderate' => $cases->where('severity', 'moderate')->count(),
            'severe' => $cases->where('severity', 'severe')->count(),
        ],
        'by_animal' => $cases->groupBy('animal_type')->map->count(),
    ];
    
    return response()->json([
        'cases' => $cases,
        'statistics' => $stats,
    ]);
}
```

#### 1.2 Add Route

**File**: `backend/routes/api.php`

```php
// Inside authenticated routes group
Route::get('/bite-cases/map-data', [BiteCaseController::class, 'getMapData']);
```

#### 1.3 Test the Endpoint

```bash
# Start backend
cd backend
php artisan serve

# Test in browser or Postman
GET http://localhost:8000/api/bite-cases/map-data
```


---

### **STEP 2: Frontend Types**

**File**: `frontend/src/features/bite-cases/types/biteCase.types.ts`

```typescript
export interface BiteMapCase {
  bite_id: number;
  case_number: string;
  bite_date: string;
  latitude: number;
  longitude: number;
  barangay: string;
  municipality: string;
  address: string;
  severity: 'minor' | 'moderate' | 'severe';
  animal_type: string;
  exposure_type: string;
  patient_name: string;
  status: string;
}

export interface MapStatistics {
  total_cases: number;
  by_municipality: Record<string, number>;
  by_barangay: Record<string, number>;
  by_severity: {
    minor: number;
    moderate: number;
    severe: number;
  };
  by_animal: Record<string, number>;
}

export interface BiteMapData {
  cases: BiteMapCase[];
  statistics: MapStatistics;
}

export interface MapFilters {
  date_from?: string;
  date_to?: string;
  municipality?: string;
  severity?: 'minor' | 'moderate' | 'severe';
}
```


---

### **STEP 3: Frontend Service**

**File**: `frontend/src/features/bite-cases/services/biteCaseService.ts`

```typescript
import api from '../../../services/api';
import type { BiteMapData, MapFilters } from '../types/biteCase.types';

class BiteCaseService {
  /**
   * Get bite cases with location data for map visualization
   */
  async getMapData(filters?: MapFilters): Promise<BiteMapData> {
    const response = await api.get('/bite-cases/map-data', {
      params: filters,
    });
    return response.data;
  }
}

export default new BiteCaseService();
```

---

### **STEP 4: Map Component**

**File**: `frontend/src/features/bite-cases/components/BiteMap/BiteMap.tsx`

```typescript
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon, LatLngBounds } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { BiteMapCase } from '../../types/biteCase.types';
import { BiteMapRoot } from './BiteMap.styles';

// Fix Leaflet default icon issue with Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';


delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface Props {
  cases: BiteMapCase[];
  onMarkerClick?: (caseData: BiteMapCase) => void;
}

// Component to fit map bounds to markers
function FitBounds({ cases }: { cases: BiteMapCase[] }) {
  const map = useMap();

  useEffect(() => {
    if (cases.length > 0) {
      const bounds = new LatLngBounds(
        cases.map(c => [c.latitude, c.longitude])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [cases, map]);

  return null;
}

// Severity-based marker colors
function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'severe': return '#ef4444'; // red
    case 'moderate': return '#f59e0b'; // orange
    case 'minor': return '#10b981'; // green
    default: return '#6b7280'; // gray
  }
}


export default function BiteMap({ cases, onMarkerClick }: Props) {
  // Default center: Philippines (adjust to your clinic location)
  const defaultCenter: [number, number] = [14.5995, 120.9842]; // Manila
  const defaultZoom = 12;

  return (
    <BiteMapRoot>
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        
        <FitBounds cases={cases} />

        {cases.map((caseData) => (
          <Marker
            key={caseData.bite_id}
            position={[caseData.latitude, caseData.longitude]}
            eventHandlers={{
              click: () => onMarkerClick?.(caseData),
            }}
          >
            <Popup>
              <div style={{ minWidth: 200 }}>
                <h4 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600 }}>
                  {caseData.case_number}
                </h4>
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  <p><strong>Patient:</strong> {caseData.patient_name}</p>
                  <p><strong>Date:</strong> {new Date(caseData.bite_date).toLocaleDateString()}</p>

                  <p><strong>Location:</strong> {caseData.barangay}, {caseData.municipality}</p>
                  <p><strong>Animal:</strong> {caseData.animal_type}</p>
                  <p>
                    <strong>Severity:</strong>{' '}
                    <span style={{ 
                      color: getSeverityColor(caseData.severity),
                      fontWeight: 600,
                      textTransform: 'capitalize'
                    }}>
                      {caseData.severity}
                    </span>
                  </p>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </BiteMapRoot>
  );
}
```

---

### **STEP 5: Map Styles**

**File**: `frontend/src/features/bite-cases/components/BiteMap/BiteMap.styles.ts`

```typescript
import { styled } from '@mui/material/styles';

export const BiteMapRoot = styled('div')(({ theme }) => ({
  width: '100%',
  height: '600px',
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden',
  boxShadow: theme.shadows[2],
  
  '& .leaflet-container': {
    fontFamily: theme.typography.fontFamily,
  },
  

  '& .leaflet-popup-content': {
    margin: 0,
    padding: theme.spacing(2),
  },
  
  '& .leaflet-popup-content-wrapper': {
    borderRadius: theme.shape.borderRadius,
  },
}));
```

---

### **STEP 6: Map Page**

**File**: `frontend/src/features/bite-cases/pages/BiteMapPage.tsx`

```typescript
import { useEffect, useState } from 'react';
import { Box, Card, CardContent, Grid, Typography, CircularProgress } from '@mui/material';
import DashboardLayout from '../../../components/Layout/DashboardLayout';
import BiteMap from '../components/BiteMap/BiteMap';
import biteCaseService from '../services/biteCaseService';
import type { BiteMapData, MapFilters } from '../types/biteCase.types';

export default function BiteMapPage() {
  const [data, setData] = useState<BiteMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<MapFilters>({});

  useEffect(() => {
    loadMapData();
  }, [filters]);

  const loadMapData = async () => {
    try {
      setLoading(true);
      const mapData = await biteCaseService.getMapData(filters);
      setData(mapData);
    } catch (error) {
      console.error('Failed to load map data:', error);
    } finally {
      setLoading(false);
    }
  };


  return (
    <DashboardLayout pageTitle="Bite Location Map">
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Bite Location Map
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Geographical distribution of animal bite incidents
          </Typography>
        </Box>

        {/* Statistics Cards */}
        {data && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" variant="body2">
                    Total Cases
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {data.statistics.total_cases}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" variant="body2">
                    Severe Cases
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#ef4444' }}>
                    {data.statistics.by_severity.severe}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" variant="body2">
                    Moderate Cases
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#f59e0b' }}>
                    {data.statistics.by_severity.moderate}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" variant="body2">
                    Minor Cases
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#10b981' }}>
                    {data.statistics.by_severity.minor}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Map */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
            <CircularProgress />
          </Box>
        ) : data ? (
          <BiteMap cases={data.cases} />
        ) : (
          <Typography>No data available</Typography>
        )}
      </Box>
    </DashboardLayout>
  );
}
```


---

### **STEP 7: Add Route**

**File**: `frontend/src/App.tsx`

```typescript
import BiteMapPage from './features/bite-cases/pages/BiteMapPage';

// Inside your routes
<Route path="/bite-map" element={
  <ProtectedRoute allowedRoles={['admin']}>
    <BiteMapPage />
  </ProtectedRoute>
} />
```

**File**: `frontend/src/shared/config/routes.ts`

```typescript
export const ROUTES = {
  // ... existing routes
  BITE_CASES: {
    LIST: '/bite-cases',
    NEW: '/bite-cases/new',
    DETAILS: '/bite-cases/:id',
    MAP: '/bite-map', // ✨ NEW
  },
  // ...
};
```

---

### **STEP 8: Add Navigation Link**

**File**: `frontend/src/components/Layout/DashboardLayout.tsx`

Add to the admin navigation menu items:

```typescript
const menuItems = [
  // ... existing items
  {
    label: 'Bite Map',
    path: '/bite-map',
    icon: '🗺️',
    roles: ['admin'],
  },
];
```


---

## 🎨 **Advanced Features (Optional)**

### **1. Heatmap Layer**

Install heat map plugin:
```bash
npm install leaflet.heat
npm install --save-dev @types/leaflet.heat
```

Add heatmap to map component:
```typescript
import 'leaflet.heat';

// In BiteMap component
useEffect(() => {
  if (mapRef.current) {
    const heatData = cases.map(c => [c.latitude, c.longitude, 1]);
    const heatLayer = (window as any).L.heatLayer(heatData, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
    });
    heatLayer.addTo(mapRef.current);
  }
}, [cases]);
```

---

### **2. Marker Clustering**

Install clustering plugin:
```bash
npm install react-leaflet-cluster
```

Use in map:
```typescript
import MarkerClusterGroup from 'react-leaflet-cluster';

<MarkerClusterGroup>
  {cases.map((caseData) => (
    <Marker key={caseData.bite_id} position={[...]}>
      {/* ... */}
    </Marker>
  ))}
</MarkerClusterGroup>
```


---

### **3. Filter Panel**

**File**: `frontend/src/features/bite-cases/components/BiteMap/MapFilters.tsx`

```typescript
import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Select,
  MenuItem,
  Button,
  FormControl,
  InputLabel,
} from '@mui/material';
import type { MapFilters } from '../../types/biteCase.types';

interface Props {
  onFilterChange: (filters: MapFilters) => void;
}

export default function MapFiltersPanel({ onFilterChange }: Props) {
  const [filters, setFilters] = useState<MapFilters>({});

  const handleApplyFilters = () => {
    onFilterChange(filters);
  };

  const handleReset = () => {
    setFilters({});
    onFilterChange({});
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            label="From Date"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={filters.date_from || ''}
            onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
            sx={{ minWidth: 160 }}
          />

          <TextField
            label="To Date"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={filters.date_to || ''}
            onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
            sx={{ minWidth: 160 }}
          />
          
          <FormControl sx={{ minWidth: 160 }}>
            <InputLabel>Severity</InputLabel>
            <Select
              value={filters.severity || ''}
              label="Severity"
              onChange={(e) => setFilters({ 
                ...filters, 
                severity: e.target.value as any 
              })}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="minor">Minor</MenuItem>
              <MenuItem value="moderate">Moderate</MenuItem>
              <MenuItem value="severe">Severe</MenuItem>
            </Select>
          </FormControl>
          
          <Button variant="contained" onClick={handleApplyFilters}>
            Apply Filters
          </Button>
          <Button variant="outlined" onClick={handleReset}>
            Reset
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
```


---

### **4. Custom Marker Icons**

Create severity-based colored markers:

```typescript
import L from 'leaflet';

const createCustomIcon = (severity: string) => {
  const color = getSeverityColor(severity);
  
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
  });
};

// Use in marker
<Marker
  position={[...]}
  icon={createCustomIcon(caseData.severity)}
>
  {/* ... */}
</Marker>
```

---

### **5. Legend Component**

**File**: `frontend/src/features/bite-cases/components/BiteMap/MapLegend.tsx`

```typescript
import { Box, Card, CardContent, Typography } from '@mui/material';

export default function MapLegend() {
  return (
    <Card sx={{ position: 'absolute', bottom: 20, right: 20, zIndex: 1000 }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          Severity
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 16, height: 16, bgcolor: '#ef4444', borderRadius: '50%' }} />
            <Typography variant="body2">Severe</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 16, height: 16, bgcolor: '#f59e0b', borderRadius: '50%' }} />
            <Typography variant="body2">Moderate</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 16, height: 16, bgcolor: '#10b981', borderRadius: '50%' }} />
            <Typography variant="body2">Minor</Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
```

---

## 📱 **Mobile Responsive Design**

Make the map mobile-friendly:

```typescript
// In BiteMapPage
<Box sx={{ 
  height: { xs: '400px', md: '600px' },
  width: '100%' 
}}>
  <BiteMap cases={data.cases} />
</Box>
```

```css
/* In BiteMap.styles.ts */
height: '600px',
[theme.breakpoints.down('md')]: {
  height: '400px',
}
```


---

## 🧪 **Testing**

### **Backend Testing**

```bash
# Test the API endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/api/bite-cases/map-data"

# Test with filters
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/api/bite-cases/map-data?date_from=2026-01-01&severity=severe"
```

### **Frontend Testing**

1. **Test with sample data**:
   - Insert bite cases with location data in database
   - Navigate to `/bite-map`
   - Verify markers appear
   - Click markers to test popups

2. **Test filters**:
   - Apply date range filters
   - Apply severity filters
   - Verify map updates

3. **Test responsiveness**:
   - Test on mobile (375px)
   - Test on tablet (768px)
   - Test on desktop (1440px)

---

## 🎨 **UI/UX Recommendations**

### **Dashboard Widget Preview (Option 2)**

Add a small map preview to Admin Dashboard:

**File**: `frontend/src/features/dashboard/components/BiteMapWidget.tsx`

```typescript
import { Box, Card, CardContent, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function BiteMapWidget() {
  const navigate = useNavigate();
  
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Bite Locations</Typography>

          <Button size="small" onClick={() => navigate('/bite-map')}>
            View Full Map →
          </Button>
        </Box>
        {/* Mini map preview - height: 200px */}
        <Box sx={{ height: 200, bgcolor: '#f3f4f6', borderRadius: 1 }}>
          {/* Simplified map or static image */}
        </Box>
      </CardContent>
    </Card>
  );
}
```

Then add to Admin Dashboard:

```typescript
// In DashboardPage.tsx - AdminDashboard component
<div className="dashboard-grid">
  <div className="dashboard-card">
    <h3>Recent Patients</h3>
    {/* ... */}
  </div>
  <BiteMapWidget /> {/* ✨ NEW */}
</div>
```

---

## 📊 **Data Requirements**

### **Sample Data for Testing**

Insert sample bite locations in your database:

```sql
-- Update existing bite incidents with location data
UPDATE bite_locations 
SET 
  latitude = 14.5995 + (RAND() - 0.5) * 0.1,
  longitude = 120.9842 + (RAND() - 0.5) * 0.1,
  barangay = CONCAT('Barangay ', FLOOR(1 + RAND() * 50)),
  municipality = 'Manila'
WHERE location_id IN (SELECT location_id FROM bite_locations LIMIT 20);
```

**Note**: Replace with actual coordinates for your clinic's area.


---

## 🚀 **Deployment Considerations**

### **Production Setup**

1. **Optimize Map Tiles**:
   - Consider self-hosting tiles for better performance
   - Use CDN for tile delivery

2. **Caching**:
   - Cache map data on backend (Redis)
   - Implement frontend caching

3. **Performance**:
   - Limit markers displayed (pagination or clustering)
   - Lazy load map component
   - Use map bounds to fetch only visible markers

4. **Security**:
   - Sanitize coordinates
   - Validate lat/lng ranges
   - Rate limit API endpoint

---

## 📚 **Resources**

### **Leaflet Documentation**
- [Leaflet Docs](https://leafletjs.com/)
- [React Leaflet](https://react-leaflet.js.org/)
- [Leaflet Tutorials](https://leafletjs.com/examples.html)

### **Philippine Maps**
- [OpenStreetMap Philippines](https://www.openstreetmap.org/relation/443174)
- [Philippine Barangay Boundaries](https://data.gov.ph/)

### **Map Styling**
- [Leaflet Providers](https://leaflet-extras.github.io/leaflet-providers/preview/)
- [Mapbox Styles](https://docs.mapbox.com/mapbox-gl-js/style-spec/)


---

## 🎯 **Implementation Checklist**

### **Backend**
- [ ] Add `getMapData()` method to `BiteCaseController`
- [ ] Add route `/api/bite-cases/map-data`
- [ ] Test API endpoint with Postman
- [ ] Verify location data exists in database

### **Frontend**
- [ ] Install Leaflet: `npm install leaflet react-leaflet`
- [ ] Install types: `npm install --save-dev @types/leaflet`
- [ ] Create types file: `biteCase.types.ts`
- [ ] Create service file: `biteCaseService.ts`
- [ ] Create `BiteMap.tsx` component
- [ ] Create `BiteMap.styles.ts`
- [ ] Create `BiteMapPage.tsx`
- [ ] Add route to `App.tsx`
- [ ] Add navigation link to sidebar
- [ ] Test with sample data

### **Optional Enhancements**
- [ ] Add filter panel
- [ ] Add map legend
- [ ] Add custom markers
- [ ] Add marker clustering
- [ ] Add heatmap layer
- [ ] Add statistics panel
- [ ] Add export map feature
- [ ] Add print map feature
- [ ] Add dashboard widget preview

---

## 💡 **Tips & Best Practices**

1. **Start Simple**: Implement basic map first, then add features
2. **Test with Real Data**: Use actual clinic coordinates
3. **Mobile First**: Ensure map works on mobile devices
4. **Performance**: Use clustering for 100+ markers
5. **User Experience**: Add loading states and error handling
6. **Accessibility**: Provide alternative data views (table)


7. **Privacy**: Consider anonymizing exact addresses for HIPAA/privacy
8. **Offline**: Plan for offline map tiles if internet is unreliable

---

## 🐛 **Troubleshooting**

### **Map Not Displaying**
```typescript
// Check Leaflet CSS is imported
import 'leaflet/dist/leaflet.css';

// Check container has height
<div style={{ height: '600px' }}>
  <MapContainer>...</MapContainer>
</div>
```

### **Markers Not Showing**
```typescript
// Fix default icon paths
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});
```

### **Map Tiles Not Loading**
- Check internet connection
- Verify tile server URL
- Check for CORS issues
- Try alternative tile provider

---

## 📞 **Support**

For questions or issues:
1. Check Leaflet documentation
2. Review React Leaflet examples
3. Search Stack Overflow
4. Check your browser console for errors

---

**Happy Mapping! 🗺️**

---

**Document Version**: 1.0  
**Last Updated**: July 27, 2026  
**Author**: Animal Bite Management System Team

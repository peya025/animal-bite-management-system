# Dynamic Address System Design - International Ready 🌍

## Problem Statement
Current system is **hardcoded for Philippines** with:
- Hardcoded PSGC API (Philippine-specific)
- Barangay/Municipality/Province labels
- Misamis Oriental defaults
- No flexibility for international deployment

## Solution: Configurable Address System

### Design Goals
✅ **International Ready** - Works for any country  
✅ **Clinic Configurable** - Each clinic sets address format  
✅ **Backward Compatible** - Existing Philippine data works  
✅ **API Agnostic** - Can use any geocoding API or manual entry  
✅ **Flexible Hierarchy** - Support any admin levels (Country → State → City → District → Street)  

---

## 🏗️ Architecture

### 1. Database Schema Changes

#### New Table: `address_configurations`
```sql
CREATE TABLE address_configurations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  clinic_id BIGINT UNSIGNED,
  country_code VARCHAR(2) DEFAULT 'PH', -- ISO 3166-1 alpha-2
  
  -- Address hierarchy (max 6 levels)
  level_1_label VARCHAR(50), -- e.g., "Country"
  level_2_label VARCHAR(50), -- e.g., "Province" or "State"
  level_3_label VARCHAR(50), -- e.g., "Municipality" or "City"
  level_4_label VARCHAR(50), -- e.g., "Barangay" or "District"
  level_5_label VARCHAR(50), -- e.g., "Purok" or "Zone"
  level_6_label VARCHAR(50), -- e.g., "Street"
  
  -- Which levels are required
  level_1_required BOOLEAN DEFAULT TRUE,
  level_2_required BOOLEAN DEFAULT TRUE,
  level_3_required BOOLEAN DEFAULT TRUE,
  level_4_required BOOLEAN DEFAULT FALSE,
  level_5_required BOOLEAN DEFAULT FALSE,
  level_6_required BOOLEAN DEFAULT FALSE,
  
  -- API configuration
  geocoding_api_provider VARCHAR(50), -- 'psgc', 'google', 'nominatim', 'manual'
  geocoding_api_key VARCHAR(255) NULL,
  
  -- Defaults for new entries
  default_country VARCHAR(100),
  default_level_2 VARCHAR(100), -- e.g., "Misamis Oriental"
  
  -- Display format
  address_format VARCHAR(255), -- e.g., "{level_6}, {level_4}, {level_3}, {level_2}"
  
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  
  FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE
);
```

#### Update: `patient_details` table
```sql
ALTER TABLE patient_details
  -- Keep old columns for backward compatibility
  -- ADD new flexible columns
  ADD COLUMN address_level_1 VARCHAR(100) NULL, -- Country
  ADD COLUMN address_level_2 VARCHAR(100) NULL, -- Province/State
  ADD COLUMN address_level_3 VARCHAR(100) NULL, -- Municipality/City
  ADD COLUMN address_level_4 VARCHAR(100) NULL, -- Barangay/District
  ADD COLUMN address_level_5 VARCHAR(100) NULL, -- Purok/Zone
  ADD COLUMN address_level_6 VARCHAR(100) NULL, -- Street
  
  -- Geocoding
  ADD COLUMN latitude DECIMAL(10, 7) NULL,
  ADD COLUMN longitude DECIMAL(10, 7) NULL,
  
  -- Formatted full address
  ADD COLUMN formatted_address TEXT NULL;

-- Map old data to new structure
UPDATE patient_details SET
  address_level_1 = 'Philippines',
  address_level_2 = province,
  address_level_3 = address_municipality,
  address_level_4 = address_barangay,
  address_level_5 = address_purok;
```

#### Update: `bite_locations` table
```sql
ALTER TABLE bite_locations
  ADD COLUMN address_level_1 VARCHAR(100) NULL,
  ADD COLUMN address_level_2 VARCHAR(100) NULL,
  ADD COLUMN address_level_3 VARCHAR(100) NULL,
  ADD COLUMN address_level_4 VARCHAR(100) NULL,
  ADD COLUMN address_level_5 VARCHAR(100) NULL,
  ADD COLUMN address_level_6 VARCHAR(100) NULL;

-- Map old data
UPDATE bite_locations SET
  address_level_1 = 'Philippines',
  address_level_3 = municipality,
  address_level_4 = barangay;
```

---

### 2. Country Presets

#### New Table: `address_presets`
```sql
CREATE TABLE address_presets (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  country_code VARCHAR(2),
  country_name VARCHAR(100),
  
  level_1_label VARCHAR(50),
  level_2_label VARCHAR(50),
  level_3_label VARCHAR(50),
  level_4_label VARCHAR(50),
  level_5_label VARCHAR(50),
  level_6_label VARCHAR(50),
  
  level_1_required BOOLEAN,
  level_2_required BOOLEAN,
  level_3_required BOOLEAN,
  level_4_required BOOLEAN,
  level_5_required BOOLEAN,
  level_6_required BOOLEAN,
  
  recommended_api VARCHAR(50),
  address_format VARCHAR(255),
  
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### Example Presets (Seed Data)
```php
// database/seeders/AddressPresetSeeder.php

$presets = [
  // Philippines
  [
    'country_code' => 'PH',
    'country_name' => 'Philippines',
    'level_1_label' => 'Country',
    'level_2_label' => 'Province',
    'level_3_label' => 'Municipality/City',
    'level_4_label' => 'Barangay',
    'level_5_label' => 'Purok/Sitio',
    'level_6_label' => 'Street',
    'level_1_required' => true,
    'level_2_required' => true,
    'level_3_required' => true,
    'level_4_required' => true,
    'level_5_required' => false,
    'level_6_required' => false,
    'recommended_api' => 'psgc',
    'address_format' => '{level_6}, {level_4}, {level_3}, {level_2}, {level_1}'
  ],
  
  // United States
  [
    'country_code' => 'US',
    'country_name' => 'United States',
    'level_1_label' => 'Country',
    'level_2_label' => 'State',
    'level_3_label' => 'City',
    'level_4_label' => 'District/Borough',
    'level_5_label' => 'Neighborhood',
    'level_6_label' => 'Street',
    'level_1_required' => true,
    'level_2_required' => true,
    'level_3_required' => true,
    'level_4_required' => false,
    'level_5_required' => false,
    'level_6_required' => false,
    'recommended_api' => 'google',
    'address_format' => '{level_6}, {level_3}, {level_2}, {level_1}'
  ],
  
  // India
  [
    'country_code' => 'IN',
    'country_name' => 'India',
    'level_1_label' => 'Country',
    'level_2_label' => 'State',
    'level_3_label' => 'District',
    'level_4_label' => 'Tehsil/Taluka',
    'level_5_label' => 'Village/Town',
    'level_6_label' => 'Street',
    'level_1_required' => true,
    'level_2_required' => true,
    'level_3_required' => true,
    'level_4_required' => false,
    'level_5_required' => false,
    'level_6_required' => false,
    'recommended_api' => 'nominatim',
    'address_format' => '{level_6}, {level_5}, {level_4}, {level_3}, {level_2}, {level_1}'
  ],
  
  // Indonesia
  [
    'country_code' => 'ID',
    'country_name' => 'Indonesia',
    'level_1_label' => 'Country',
    'level_2_label' => 'Province',
    'level_3_label' => 'Kabupaten/Kota',
    'level_4_label' => 'Kecamatan',
    'level_5_label' => 'Kelurahan/Desa',
    'level_6_label' => 'Street',
    'level_1_required' => true,
    'level_2_required' => true,
    'level_3_required' => true,
    'level_4_required' => true,
    'level_5_required' => false,
    'level_6_required' => false,
    'recommended_api' => 'nominatim',
    'address_format' => '{level_6}, {level_5}, {level_4}, {level_3}, {level_2}, {level_1}'
  ],
  
  // Malaysia
  [
    'country_code' => 'MY',
    'country_name' => 'Malaysia',
    'level_1_label' => 'Country',
    'level_2_label' => 'State',
    'level_3_label' => 'District',
    'level_4_label' => 'Mukim',
    'level_5_label' => 'Kampung/Taman',
    'level_6_label' => 'Street',
    'level_1_required' => true,
    'level_2_required' => true,
    'level_3_required' => true,
    'level_4_required' => false,
    'level_5_required' => false,
    'level_6_required' => false,
    'recommended_api' => 'nominatim',
    'address_format' => '{level_6}, {level_5}, {level_3}, {level_2}, {level_1}'
  ],
];
```

---

### 3. Backend API Changes

#### New Controller: `AddressConfigurationController.php`
```php
<?php

namespace App\Http\Controllers;

use App\Models\AddressConfiguration;
use App\Models\AddressPreset;
use Illuminate\Http\Request;

class AddressConfigurationController extends Controller
{
    // Get clinic's address configuration
    public function getConfig(Request $request)
    {
        $clinicId = $request->user()->clinic_id;
        
        $config = AddressConfiguration::where('clinic_id', $clinicId)->first();
        
        if (!$config) {
            // Return default Philippine config
            return response()->json($this->getDefaultConfig());
        }
        
        return response()->json($config);
    }
    
    // Get all available presets
    public function getPresets()
    {
        return response()->json(AddressPreset::all());
    }
    
    // Apply a preset to clinic
    public function applyPreset(Request $request, $presetId)
    {
        $preset = AddressPreset::findOrFail($presetId);
        $clinicId = $request->user()->clinic_id;
        
        $config = AddressConfiguration::updateOrCreate(
            ['clinic_id' => $clinicId],
            [
                'country_code' => $preset->country_code,
                'level_1_label' => $preset->level_1_label,
                'level_2_label' => $preset->level_2_label,
                'level_3_label' => $preset->level_3_label,
                'level_4_label' => $preset->level_4_label,
                'level_5_label' => $preset->level_5_label,
                'level_6_label' => $preset->level_6_label,
                'level_1_required' => $preset->level_1_required,
                'level_2_required' => $preset->level_2_required,
                'level_3_required' => $preset->level_3_required,
                'level_4_required' => $preset->level_4_required,
                'level_5_required' => $preset->level_5_required,
                'level_6_required' => $preset->level_6_required,
                'geocoding_api_provider' => $preset->recommended_api,
                'address_format' => $preset->address_format,
            ]
        );
        
        return response()->json($config);
    }
    
    // Custom configuration
    public function updateConfig(Request $request)
    {
        $validated = $request->validate([
            'country_code' => 'required|string|size:2',
            'level_1_label' => 'required|string|max:50',
            'level_2_label' => 'nullable|string|max:50',
            'level_3_label' => 'nullable|string|max:50',
            'level_4_label' => 'nullable|string|max:50',
            'level_5_label' => 'nullable|string|max:50',
            'level_6_label' => 'nullable|string|max:50',
            'level_1_required' => 'boolean',
            'level_2_required' => 'boolean',
            'level_3_required' => 'boolean',
            'level_4_required' => 'boolean',
            'level_5_required' => 'boolean',
            'level_6_required' => 'boolean',
            'geocoding_api_provider' => 'nullable|string',
            'geocoding_api_key' => 'nullable|string',
            'address_format' => 'nullable|string',
        ]);
        
        $clinicId = $request->user()->clinic_id;
        
        $config = AddressConfiguration::updateOrCreate(
            ['clinic_id' => $clinicId],
            $validated
        );
        
        return response()->json($config);
    }
    
    private function getDefaultConfig()
    {
        // Default Philippine config for backward compatibility
        return [
            'country_code' => 'PH',
            'level_1_label' => 'Country',
            'level_2_label' => 'Province',
            'level_3_label' => 'Municipality/City',
            'level_4_label' => 'Barangay',
            'level_5_label' => 'Purok/Sitio',
            'level_6_label' => 'Street',
            'level_1_required' => true,
            'level_2_required' => true,
            'level_3_required' => true,
            'level_4_required' => true,
            'level_5_required' => false,
            'level_6_required' => false,
            'geocoding_api_provider' => 'psgc',
            'address_format' => '{level_6}, {level_4}, {level_3}, {level_2}, {level_1}',
        ];
    }
}
```

#### New Route: `routes/api.php`
```php
// Address configuration routes
Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('/address-config', [AddressConfigurationController::class, 'getConfig']);
    Route::get('/address-presets', [AddressConfigurationController::class, 'getPresets']);
    Route::post('/address-config/preset/{id}', [AddressConfigurationController::class, 'applyPreset']);
    Route::put('/address-config', [AddressConfigurationController::class, 'updateConfig']);
});
```

---

### 4. Frontend Implementation

#### New Service: `addressConfigService.ts`
```typescript
// frontend/src/features/settings/services/addressConfigService.ts

import api from '@/shared/services/api';

export interface AddressLevel {
  label: string;
  required: boolean;
}

export interface AddressConfig {
  country_code: string;
  level_1: AddressLevel;
  level_2: AddressLevel;
  level_3: AddressLevel;
  level_4: AddressLevel;
  level_5: AddressLevel;
  level_6: AddressLevel;
  geocoding_api_provider: 'psgc' | 'google' | 'nominatim' | 'manual';
  geocoding_api_key?: string;
  address_format: string;
}

export interface AddressPreset {
  id: number;
  country_code: string;
  country_name: string;
  level_1_label: string;
  level_2_label: string;
  level_3_label: string;
  level_4_label: string;
  level_5_label: string;
  level_6_label: string;
  recommended_api: string;
}

class AddressConfigService {
  async getConfig(): Promise<AddressConfig> {
    const response = await api.get('/address-config');
    return response.data;
  }
  
  async getPresets(): Promise<AddressPreset[]> {
    const response = await api.get('/address-presets');
    return response.data;
  }
  
  async applyPreset(presetId: number): Promise<AddressConfig> {
    const response = await api.post(`/address-config/preset/${presetId}`);
    return response.data;
  }
  
  async updateConfig(config: Partial<AddressConfig>): Promise<AddressConfig> {
    const response = await api.put('/address-config', config);
    return response.data;
  }
}

export default new AddressConfigService();
```

#### New Hook: `useAddressConfig.ts`
```typescript
// frontend/src/features/settings/hooks/useAddressConfig.ts

import { useState, useEffect } from 'react';
import addressConfigService, { AddressConfig } from '../services/addressConfigService';

export function useAddressConfig() {
  const [config, setConfig] = useState<AddressConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    loadConfig();
  }, []);
  
  const loadConfig = async () => {
    try {
      setLoading(true);
      const data = await addressConfigService.getConfig();
      setConfig(data);
    } catch (err) {
      setError('Failed to load address configuration');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  return { config, loading, error, reload: loadConfig };
}
```

#### Updated: `AddressSection.tsx` (Dynamic)
```typescript
// frontend/src/features/patients/components/AddPatientModal/sections/AddressSection.tsx

import { useAddressConfig } from '@/features/settings/hooks/useAddressConfig';

export default function AddressSection({ formData, onChange, errors }) {
  const { config, loading } = useAddressConfig();
  
  if (loading || !config) {
    return <div>Loading address configuration...</div>;
  }
  
  return (
    <div className="address-section">
      <h3>Address Information</h3>
      
      {/* Level 1 (usually Country) */}
      {config.level_1.label && (
        <FormField 
          label={config.level_1.label} 
          required={config.level_1.required}
        >
          <input
            className="fm-input"
            value={formData.address_level_1 || ''}
            onChange={(e) => onChange('address_level_1', e.target.value)}
          />
        </FormField>
      )}
      
      {/* Level 2 (Province/State) */}
      {config.level_2.label && (
        <FormField 
          label={config.level_2.label} 
          required={config.level_2.required}
        >
          {config.geocoding_api_provider === 'psgc' ? (
            <select
              className="fm-select"
              value={formData.address_level_2 || ''}
              onChange={(e) => onChange('address_level_2', e.target.value)}
            >
              <option value="">— Select —</option>
              {/* Dynamic options based on API */}
            </select>
          ) : (
            <input
              className="fm-input"
              value={formData.address_level_2 || ''}
              onChange={(e) => onChange('address_level_2', e.target.value)}
            />
          )}
        </FormField>
      )}
      
      {/* Level 3 (Municipality/City) */}
      {config.level_3.label && (
        <FormField 
          label={config.level_3.label} 
          required={config.level_3.required}
        >
          <input
            className="fm-input"
            value={formData.address_level_3 || ''}
            onChange={(e) => onChange('address_level_3', e.target.value)}
          />
        </FormField>
      )}
      
      {/* Level 4 (Barangay/District) */}
      {config.level_4.label && (
        <FormField 
          label={config.level_4.label} 
          required={config.level_4.required}
        >
          <input
            className="fm-input"
            value={formData.address_level_4 || ''}
            onChange={(e) => onChange('address_level_4', e.target.value)}
          />
        </FormField>
      )}
      
      {/* Level 5 (Purok/Zone) */}
      {config.level_5.label && (
        <FormField 
          label={config.level_5.label} 
          required={config.level_5.required}
        >
          <input
            className="fm-input"
            value={formData.address_level_5 || ''}
            onChange={(e) => onChange('address_level_5', e.target.value)}
          />
        </FormField>
      )}
      
      {/* Level 6 (Street) */}
      {config.level_6.label && (
        <FormField 
          label={config.level_6.label} 
          required={config.level_6.required}
        >
          <input
            className="fm-input"
            value={formData.address_level_6 || ''}
            onChange={(e) => onChange('address_level_6', e.target.value)}
            placeholder="e.g. 123 Main Street"
          />
        </FormField>
      )}
    </div>
  );
}
```

#### New Page: `AddressConfigurationPage.tsx`
```typescript
// frontend/src/features/settings/pages/AddressConfigurationPage.tsx

import { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, Button, Select, MenuItem } from '@mui/material';
import addressConfigService from '../services/addressConfigService';
import type { AddressPreset, AddressConfig } from '../services/addressConfigService';

export default function AddressConfigurationPage() {
  const [presets, setPresets] = useState<AddressPreset[]>([]);
  const [config, setConfig] = useState<AddressConfig | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    const [presetsData, configData] = await Promise.all([
      addressConfigService.getPresets(),
      addressConfigService.getConfig()
    ]);
    setPresets(presetsData);
    setConfig(configData);
  };
  
  const handleApplyPreset = async () => {
    if (!selectedPreset) return;
    
    const newConfig = await addressConfigService.applyPreset(selectedPreset);
    setConfig(newConfig);
    alert('Address configuration updated!');
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Address Configuration
      </Typography>
      
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Select Country Preset
          </Typography>
          
          <Select
            value={selectedPreset || ''}
            onChange={(e) => setSelectedPreset(Number(e.target.value))}
            fullWidth
            sx={{ mb: 2 }}
          >
            {presets.map((preset) => (
              <MenuItem key={preset.id} value={preset.id}>
                {preset.country_name} ({preset.country_code})
              </MenuItem>
            ))}
          </Select>
          
          <Button 
            variant="contained" 
            onClick={handleApplyPreset}
            disabled={!selectedPreset}
          >
            Apply Preset
          </Button>
        </CardContent>
      </Card>
      
      {config && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Current Configuration
            </Typography>
            
            <Typography><strong>Country:</strong> {config.country_code}</Typography>
            <Typography><strong>Level 1:</strong> {config.level_1.label}</Typography>
            <Typography><strong>Level 2:</strong> {config.level_2.label}</Typography>
            <Typography><strong>Level 3:</strong> {config.level_3.label}</Typography>
            <Typography><strong>Level 4:</strong> {config.level_4.label}</Typography>
            <Typography><strong>Geocoding API:</strong> {config.geocoding_api_provider}</Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
```

---

## 🚀 Implementation Plan

### Phase 1: Database & Backend (Week 1)
1. ✅ Create migrations for new tables
2. ✅ Create AddressConfiguration model
3. ✅ Create AddressPreset model
4. ✅ Create seeder with country presets
5. ✅ Create AddressConfigurationController
6. ✅ Add API routes
7. ✅ Migrate existing Philippine data to new structure

### Phase 2: Frontend Core (Week 2)
1. ✅ Create addressConfigService
2. ✅ Create useAddressConfig hook
3. ✅ Update AddressSection to be dynamic
4. ✅ Create AddressConfigurationPage
5. ✅ Add route to settings

### Phase 3: Integration (Week 3)
1. ✅ Update all forms to use dynamic address
2. ✅ Update reports to format addresses dynamically
3. ✅ Update bite map to use new address fields
4. ✅ Test with multiple country configurations

### Phase 4: Geocoding APIs (Week 4)
1. ✅ Implement Google Maps Geocoding adapter
2. ✅ Implement Nominatim (OSM) adapter
3. ✅ Keep PSGC for Philippines
4. ✅ Add manual coordinate entry fallback

---

## 📊 Benefits

### For Clinics
✅ **Works Anywhere** - Deploy in any country  
✅ **Easy Setup** - Select country, done  
✅ **Familiar Labels** - Uses local terminology  
✅ **Flexible** - Can customize if needed  

### For Development
✅ **Single Codebase** - Works for all markets  
✅ **Easy Expansion** - Just add country presets  
✅ **Maintainable** - Centralized configuration  
✅ **Testable** - Can simulate any country  

### For Sales
✅ **Global Market** - Sell to any country  
✅ **Quick Demo** - Switch between countries  
✅ **Professional** - Shows flexibility  
✅ **Competitive Edge** - Most competitors are country-locked  

---

## 🌍 Supported Countries (Out of the Box)

1. 🇵🇭 **Philippines** - Barangay/Municipality/Province (PSGC API)
2. 🇺🇸 **United States** - Street/City/State/ZIP (Google Maps)
3. 🇮🇳 **India** - Village/Tehsil/District/State (Nominatim)
4. 🇮🇩 **Indonesia** - Desa/Kecamatan/Kabupaten/Province
5. 🇲🇾 **Malaysia** - Kampung/Mukim/District/State
6. 🇹🇭 **Thailand** - Tambon/Amphoe/Province
7. 🇻🇳 **Vietnam** - Ward/District/Province
8. 🇧🇷 **Brazil** - Bairro/Municipality/State
9. 🇲🇽 **Mexico** - Colonia/Municipality/State
10. 🇿🇦 **South Africa** - Suburb/City/Province

**Adding more countries**: Just add preset, no code changes needed!

---

## 🎯 Next Steps

1. **Review this design** - Confirm approach
2. **Start Phase 1** - Database migrations
3. **Test with Philippine data** - Ensure backward compatibility
4. **Implement Phase 2** - Frontend
5. **Add more country presets** - Based on target markets

---

## ✅ Backward Compatibility

**Existing Philippine clinics**: Will automatically work with new system
- Default config = Philippine address structure
- Old columns mapped to new structure
- No data loss
- Seamless migration

**New clinics**: Choose country during setup wizard

---

**Status**: Design Complete, Ready for Implementation  
**Complexity**: Medium (2-4 weeks)  
**Impact**: HIGH - Enables global deployment  
**Priority**: HIGH - Required for international sales

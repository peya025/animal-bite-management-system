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

export interface MapCenter {
  latitude: number;
  longitude: number;
}

export interface ClinicInfo {
  name: string;
  municipality: string;
  province: string;
}

export interface BiteMapData {
  cases: BiteMapCase[];
  statistics: MapStatistics;
  map_center?: MapCenter | null;
  map_zoom?: number;
  clinic?: ClinicInfo;
}

export interface MapFilters {
  date_from?: string;
  date_to?: string;
  municipality?: string;
  severity?: 'minor' | 'moderate' | 'severe';
}

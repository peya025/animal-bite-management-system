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

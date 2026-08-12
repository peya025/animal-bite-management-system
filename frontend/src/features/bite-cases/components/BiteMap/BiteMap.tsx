import { useEffect } from 'react';
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

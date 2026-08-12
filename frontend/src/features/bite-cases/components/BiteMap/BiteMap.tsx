import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { Icon, LatLngBounds, divIcon, point } from 'leaflet';
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
    case 'severe': return '#ef4444'; // red - Category III
    case 'moderate': return '#f59e0b'; // orange - Category II
    case 'minor': return '#10b981'; // green - Category I
    default: return '#6b7280'; // gray
  }
}

// Create custom colored marker icon
function createCustomIcon(severity: string) {
  const color = getSeverityColor(severity);
  
  return divIcon({
    className: 'custom-marker-icon',
    html: `
      <div style="
        position: relative;
        width: 25px;
        height: 25px;
      ">
        <div style="
          background-color: ${color};
          width: 25px;
          height: 25px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 3px solid white;
          box-shadow: 0 3px 6px rgba(0,0,0,0.3);
        "></div>
        <div style="
          position: absolute;
          top: 4px;
          left: 7px;
          width: 11px;
          height: 11px;
          background-color: white;
          border-radius: 50%;
          transform: rotate(45deg);
        "></div>
      </div>
    `,
    iconSize: [25, 25],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  });
}

// Custom cluster icon
const createClusterCustomIcon = (cluster: any) => {
  const count = cluster.getChildCount();
  let size = 'small';
  let color = '#10b981'; // green
  
  if (count > 20) {
    size = 'large';
    color = '#ef4444'; // red
  } else if (count > 10) {
    size = 'medium';
    color = '#f59e0b'; // orange
  }
  
  return divIcon({
    html: `
      <div style="
        background-color: ${color};
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 14px;
        border: 3px solid white;
        box-shadow: 0 3px 10px rgba(0,0,0,0.3);
      ">${count}</div>
    `,
    className: 'custom-cluster-icon',
    iconSize: point(40, 40, true),
  });
};

export default function BiteMap({ cases, onMarkerClick }: Props) {
  // Default center: Philippines (will be replaced with clinic config)
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

        {/* Marker Clustering */}
        <MarkerClusterGroup
          chunkedLoading
          iconCreateFunction={createClusterCustomIcon}
        >
          {cases.map((caseData) => (
            <Marker
              key={caseData.bite_id}
              position={[caseData.latitude, caseData.longitude]}
              icon={createCustomIcon(caseData.severity)}
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
                      <strong>Category:</strong>{' '}
                      <span style={{ 
                        color: getSeverityColor(caseData.severity),
                        fontWeight: 600,
                        textTransform: 'capitalize'
                      }}>
                        {caseData.severity === 'severe' ? 'III (Severe)' : 
                         caseData.severity === 'moderate' ? 'II (Moderate)' : 
                         'I (Minor)'}
                      </span>
                    </p>
                    <p><strong>Status:</strong> <span style={{ textTransform: 'capitalize' }}>{caseData.status}</span></p>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </BiteMapRoot>
  );
}

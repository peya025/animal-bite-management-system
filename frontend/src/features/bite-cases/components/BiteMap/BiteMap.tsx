import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
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
  mapCenter?: { latitude: number; longitude: number } | null;
  mapZoom?: number;
  viewMode?: 'pins' | 'heatmap';
  onMarkerClick?: (caseData: BiteMapCase) => void;
}

// Component to handle map center and zoom
function MapViewController({ cases, mapCenter, mapZoom }: { cases: BiteMapCase[]; mapCenter?: { latitude: number; longitude: number} | null; mapZoom?: number }) {
  const map = useMap();

  useEffect(() => {
    // If clinic center is provided, use it
    if (mapCenter) {
      map.setView([mapCenter.latitude, mapCenter.longitude], mapZoom || 13);
    } else if (cases.length > 0) {
      // Otherwise, fit bounds to show all cases
      const bounds = new LatLngBounds(
        cases.map(c => [c.latitude, c.longitude])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [cases, mapCenter, mapZoom, map]);

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
  let color = '#10b981'; // green
  
  if (count > 20) {
    color = '#ef4444'; // red
  } else if (count > 10) {
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

export default function BiteMap({ cases, mapCenter, mapZoom, viewMode = 'pins', onMarkerClick }: Props) {
  const defaultCenter: [number, number] = mapCenter 
    ? [mapCenter.latitude, mapCenter.longitude]
    : [14.5995, 120.9842];
  const defaultZoomLevel = mapZoom || 12;

  return (
    <BiteMapRoot>
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoomLevel}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        
        <MapViewController cases={cases} mapCenter={mapCenter} mapZoom={mapZoom} />

        {viewMode === 'heatmap' ? (
          /* ── Heatmap Overlay Mode: Density Hotspots ── */
          <>
            {cases.map((c) => {
              const color = getSeverityColor(c.severity);
              return (
                <g key={`heat-${c.bite_id}`}>
                  {/* Outer density halo */}
                  <CircleMarker
                    center={[c.latitude, c.longitude]}
                    radius={35}
                    pathOptions={{
                      color: 'transparent',
                      fillColor: color,
                      fillOpacity: 0.25,
                    }}
                  />
                  {/* Mid density core */}
                  <CircleMarker
                    center={[c.latitude, c.longitude]}
                    radius={20}
                    pathOptions={{
                      color: 'transparent',
                      fillColor: color,
                      fillOpacity: 0.45,
                    }}
                  />
                  {/* High intensity hotspot center */}
                  <CircleMarker
                    center={[c.latitude, c.longitude]}
                    radius={8}
                    pathOptions={{
                      color: '#ffffff',
                      weight: 1.5,
                      fillColor: color,
                      fillOpacity: 0.9,
                    }}
                  >
                    <Popup>
                      <div style={{ minWidth: 200 }}>
                        <h4 style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block', flexShrink: 0 }} />
                          <span>Exposure Hotspot: {c.barangay}, {c.municipality}</span>
                        </h4>
                        <p style={{ margin: 0, fontSize: 12, color: '#4b5563', lineHeight: 1.5 }}>
                          <strong>Patient:</strong> {c.patient_name}<br />
                          <strong>Place of Exposure:</strong> {c.barangay ? `${c.barangay}, ` : ''}{c.municipality}<br />
                          {c.patient_residence && (
                            <><strong>Patient Residence:</strong> {c.patient_residence}<br /></>
                          )}
                          <strong>Severity:</strong> <span style={{ color, fontWeight: 600 }}>{c.severity.toUpperCase()}</span><br />
                          <strong>Status:</strong> <span style={{ textTransform: 'capitalize', fontWeight: 600, color: c.status === 'active' ? '#f59e0b' : '#10b981' }}>{c.status}</span>
                        </p>
                      </div>
                    </Popup>
                  </CircleMarker>
                </g>
              );
            })}
          </>
        ) : (
          /* ── Pins & Clusters Mode ── */
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
                  <div style={{ minWidth: 220 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
                        {caseData.case_number}
                      </h4>
                      <span style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 10,
                        textTransform: 'capitalize',
                        backgroundColor: caseData.status === 'active' ? '#fef3c7' : '#d1fae5',
                        color: caseData.status === 'active' ? '#b45309' : '#047857',
                        border: `1px solid ${caseData.status === 'active' ? '#fde68a' : '#a7f3d0'}`
                      }}>
                        {caseData.status === 'active' ? '● Active PEP' : '✓ Completed'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#4b5563', lineHeight: 1.5 }}>
                      <p style={{ margin: '3px 0' }}><strong>Patient:</strong> {caseData.patient_name}</p>
                      <p style={{ margin: '3px 0' }}><strong>Date of Exposure:</strong> {new Date(caseData.bite_date).toLocaleDateString()}</p>
                      <p style={{ margin: '3px 0' }}>
                        <strong>Place of Exposure:</strong>{' '}
                        <span style={{ color: '#1e40af', fontWeight: 600 }}>
                          {caseData.barangay ? `${caseData.barangay}, ` : ''}{caseData.municipality}
                        </span>
                      </p>
                      {caseData.patient_residence && (
                        <p style={{ margin: '3px 0', color: '#6b7280' }}>
                          <strong>Patient Residence:</strong> {caseData.patient_residence}
                        </p>
                      )}
                      <p style={{ margin: '3px 0' }}><strong>Animal:</strong> {caseData.animal_type}</p>
                      <p style={{ margin: '3px 0' }}>
                        <strong>WHO Category:</strong>{' '}
                        <span style={{ 
                          color: getSeverityColor(caseData.severity),
                          fontWeight: 600,
                          textTransform: 'capitalize'
                        }}>
                          {caseData.severity === 'severe' ? 'Category III (Severe)' : 
                           caseData.severity === 'moderate' ? 'Category II (Moderate)' : 
                           caseData.severity === 'minor' ? 'Category I (Minor)' :
                           'Pending Assessment'}
                        </span>
                      </p>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        )}
      </MapContainer>
    </BiteMapRoot>
  );
}

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

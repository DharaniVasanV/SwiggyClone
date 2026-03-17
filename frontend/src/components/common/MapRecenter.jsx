import { useEffect } from 'react'
import { useMap } from 'react-leaflet'

/**
 * Utility component to recenter a Leaflet map when coordinates change.
 * Should be placed inside a <MapContainer>.
 */
export default function MapRecenter({ lat, lng }) {
  const map = useMap()
  
  useEffect(() => {
    if (lat && lng) {
      map.setView([lat, lng], map.getZoom())
    }
  }, [lat, lng, map])

  return null
}

import { useEffect, useRef } from 'react'
import type { GlobeMethods } from 'react-globe.gl'
import { useAppState, useAppDispatch } from '@/components/atlas/context/AppContext'
import { REGIONS } from '@/components/atlas/data'

interface Props {
  globeRef: React.MutableRefObject<GlobeMethods | undefined>
}

function zoomToAltitude(zoom: number): number {
  return Math.max(0.3, 3.5 - zoom * 0.3)
}

export function GlobeController({ globeRef }: Props) {
  const dispatch = useAppDispatch()
  const { selectedRegions, searchFlyTarget } = useAppState()
  const prevLength = useRef(selectedRegions.length)

  // Fly to region when a new region is toggled on
  useEffect(() => {
    if (selectedRegions.length > prevLength.current && globeRef.current) {
      const lastRegionId = selectedRegions[selectedRegions.length - 1]
      const region = REGIONS.find((r) => r.id === lastRegionId)

      if (region) {
        const [lat, lng] = region.center
        globeRef.current.pointOfView(
          { lat, lng, altitude: region.altitude },
          1500,
        )
      }
    }
    prevLength.current = selectedRegions.length
  }, [selectedRegions, globeRef])

  // Fly to search target
  useEffect(() => {
    if (searchFlyTarget && globeRef.current) {
      globeRef.current.pointOfView(
        {
          lat: searchFlyTarget.lat,
          lng: searchFlyTarget.lng,
          altitude: zoomToAltitude(searchFlyTarget.zoom),
        },
        1500,
      )
      dispatch({ type: 'CLEAR_FLY_TARGET' })
    }
  }, [searchFlyTarget, globeRef, dispatch])

  return null
}

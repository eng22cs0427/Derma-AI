"use client"

import { useEffect, useRef, useState } from "react"

interface AddressMapProps {
  selectedPosition: { lat: number; lng: number } | null
  onPositionChange: (position: { lat: number; lng: number }) => void
}

const defaultPosition = { lat: 19.076, lng: 72.8777 }

export default function AddressMap({ selectedPosition, onPositionChange }: AddressMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const [isClient, setIsClient] = useState(false)

  // Confirm we're on the client
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Initialize the Leaflet map imperatively (no react-leaflet) — runs once after client confirmed
  useEffect(() => {
    if (!isClient || !containerRef.current) return
    // If already initialized, skip
    if (mapRef.current) return

    let L: any
    try {
      L = require("leaflet")
      require("leaflet/dist/leaflet.css")
    } catch {
      return
    }

    // Fix default icon URLs
    delete L.Icon.Default.prototype._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    })

    const initialCenter = selectedPosition || defaultPosition

    const map = L.map(containerRef.current, {
      center: [initialCenter.lat, initialCenter.lng],
      zoom: 13,
      scrollWheelZoom: false,
    })

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)

    map.on("click", (e: any) => {
      const { lat, lng } = e.latlng
      onPositionChange({ lat, lng })
    })

    mapRef.current = map

    // Proper cleanup — remove the map on unmount to free the DOM node
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        markerRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient])

  // Sync selectedPosition → marker on the map
  useEffect(() => {
    if (!mapRef.current || !isClient) return

    let L: any
    try {
      L = require("leaflet")
    } catch {
      return
    }

    if (selectedPosition) {
      if (markerRef.current) {
        markerRef.current.setLatLng([selectedPosition.lat, selectedPosition.lng])
      } else {
        markerRef.current = L.marker([selectedPosition.lat, selectedPosition.lng]).addTo(mapRef.current)
      }
      mapRef.current.setView([selectedPosition.lat, selectedPosition.lng], mapRef.current.getZoom())
    } else {
      if (markerRef.current) {
        markerRef.current.remove()
        markerRef.current = null
      }
    }
  }, [selectedPosition, isClient])

  if (!isClient) {
    return (
      <div className="h-full w-full bg-gray-100 animate-pulse rounded-md flex items-center justify-center">
        <p className="text-gray-500">Loading map...</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      style={{ height: "100%", width: "100%", minHeight: "300px" }}
    />
  )
}

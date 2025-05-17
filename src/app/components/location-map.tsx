"use client"

import { useRef, useEffect } from "react"

interface Location {
    lat: number
    lng: number
}

interface LocationMapProps {
    location: Location
}

export default function LocationMap({ location }: LocationMapProps) {
    const mapRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!mapRef.current) return

        // In a real application, you would use a mapping library like Leaflet or Google Maps
        // For this example, we'll just display a static map image
        const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${location.lat},${location.lng}&zoom=14&size=600x200&markers=color:red%7C${location.lat},${location.lng}&key=YOUR_API_KEY`

        // For demo purposes, we'll use a placeholder image
        const placeholderUrl = `/placeholder.svg?height=200&width=600&text=Map+Location+(${location.lat.toFixed(4)},${location.lng.toFixed(4)})`

        mapRef.current.style.backgroundImage = `url('${placeholderUrl}')`
        mapRef.current.style.backgroundSize = "cover"
        mapRef.current.style.backgroundPosition = "center"
    }, [location])

    return <div ref={mapRef} className="w-full h-full rounded-md"></div>
}

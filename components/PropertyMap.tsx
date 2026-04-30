"use client";

import { useEffect } from "react";
import { divIcon, LatLngBoundsExpression, type LatLngExpression } from "leaflet";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polygon,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { PropertyListing } from "@/lib/real-estate/types";

type MapPoint = {
  lat: number;
  lng: number;
};

type PropertyMapProps = {
  properties: PropertyListing[];
  selectedPropertyId: null | string;
  onSelectProperty: (propertyId: string) => void;
  isDrawingArea: boolean;
  draftPolygon: MapPoint[];
  appliedPolygon: MapPoint[];
  onAddPolygonPoint: (point: MapPoint) => void;
};

const portugalBounds: LatLngBoundsExpression = [
  [36.55, -10.95],
  [42.55, -5.65],
];

const defaultMarkerIcon = divIcon({
  className: "",
  html: '<span class="property-map-marker"></span>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const selectedMarkerIcon = divIcon({
  className: "",
  html: '<span class="property-map-marker property-map-marker--selected"></span>',
  iconSize: [24, 32],
  iconAnchor: [12, 32],
});

function MapClickHandler({
  isDrawingArea,
  onAddPolygonPoint,
}: {
  isDrawingArea: boolean;
  onAddPolygonPoint: (point: MapPoint) => void;
}) {
  useMapEvents({
    click(event) {
      if (!isDrawingArea) {
        return;
      }

      onAddPolygonPoint({
        lat: event.latlng.lat,
        lng: event.latlng.lng,
      });
    },
  });

  return null;
}

function MapInteractionController({ isDrawingArea }: { isDrawingArea: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (isDrawingArea) {
      map.dragging.disable();
      map.scrollWheelZoom.disable();
      map.doubleClickZoom.disable();
      map.boxZoom.disable();
      map.keyboard.disable();
      map.touchZoom.disable();
    } else {
      map.dragging.enable();
      map.scrollWheelZoom.enable();
      map.doubleClickZoom.enable();
      map.boxZoom.enable();
      map.keyboard.enable();
      map.touchZoom.enable();
    }

    return () => {
      map.dragging.enable();
      map.scrollWheelZoom.enable();
      map.doubleClickZoom.enable();
      map.boxZoom.enable();
      map.keyboard.enable();
      map.touchZoom.enable();
    };
  }, [isDrawingArea, map]);

  return null;
}

export function PropertyMap({
  properties,
  selectedPropertyId,
  onSelectProperty,
  isDrawingArea,
  draftPolygon,
  appliedPolygon,
  onAddPolygonPoint,
}: PropertyMapProps) {
  const polygonToRender = draftPolygon.length > 0 ? draftPolygon : appliedPolygon;

  return (
    <MapContainer
      bounds={portugalBounds}
      scrollWheelZoom
      dragging={!isDrawingArea}
      doubleClickZoom={!isDrawingArea}
      boxZoom={!isDrawingArea}
      keyboard={!isDrawingArea}
      touchZoom={!isDrawingArea}
      zoomControl={!isDrawingArea}
      className={`h-full w-full ${isDrawingArea ? "property-map--drawing" : ""}`}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapInteractionController isDrawingArea={isDrawingArea} />

      <MapClickHandler
        isDrawingArea={isDrawingArea}
        onAddPolygonPoint={onAddPolygonPoint}
      />

      {polygonToRender.length >= 2 && (
        <Polyline
          positions={polygonToRender.map(
            (point): LatLngExpression => [point.lat, point.lng]
          )}
          pathOptions={{
            color: "#059669",
            weight: 3,
          }}
        />
      )}

      {polygonToRender.length >= 3 && (
        <Polygon
          positions={polygonToRender.map(
            (point): LatLngExpression => [point.lat, point.lng]
          )}
          pathOptions={{
            color: "#059669",
            fillColor: "#10b981",
            fillOpacity: 0.18,
            weight: 3,
          }}
        />
      )}

      {polygonToRender.map((point, index) => (
        <CircleMarker
          key={`${point.lat}-${point.lng}-${index}`}
          center={[point.lat, point.lng]}
          radius={6}
          pathOptions={{
            color: "#ffffff",
            weight: 2,
            fillColor: "#059669",
            fillOpacity: 1,
          }}
        />
      ))}

      {properties.map((property) => {
        const isSelected = property.id === selectedPropertyId;

        return (
          <Marker
            key={property.id}
            position={[property.location.latitude, property.location.longitude]}
            icon={isSelected ? selectedMarkerIcon : defaultMarkerIcon}
            eventHandlers={{
              click: () => {
                if (!isDrawingArea) {
                  onSelectProperty(property.id);
                }
              },
            }}
            interactive={!isDrawingArea}
          >
            <Tooltip direction="top" offset={[0, -16]}>
              {property.title}
            </Tooltip>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

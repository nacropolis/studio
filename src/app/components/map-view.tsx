'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import L from 'leaflet';
require('dotenv').config();

// --- ESTILOS ---
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet-measure/dist/leaflet-measure.css';

// --- TIPOS ---
type LeafletMap = L.Map;
type MarkerClusterGroup = L.MarkerClusterGroup;
type FeatureGroup = L.FeatureGroup;
type MeasureControl = any;

type HospitalData = {
  id: string; lat: number; lng: number; name: string; source: string;
};

type SuggestionResult = {
  name: string;
  score: number;
  center: L.LatLng;
  type: 'nivel1' | 'nivel2';
  details: any;
};

type StateGeometry = {
  type: "Polygon" | "MultiPolygon";
  coordinates: number[][][] | number[][][][];
};

type StateFeature = {
  type: "Feature";
  properties: {
    CVEGEO: string;
    CVE_ENT: string;
    CVE_MUN: string;
    NOMGEO: string;
    NOM_ENT: string;
    COV_: number;
    COV_ID: number;
    AREA: number;
    PERIMETER: number;
  };
  geometry: StateGeometry;
};

type StateGeoJSON = {
  type: "FeatureCollection";
  name: string;
  crs: any;
  features: StateFeature[];
};

type LocalidadData = {
  LAT_DECIMAL: string;
  LON_DECIMAL: string;
  POB_TOTAL: string;
  NOM_LOC: string;
  NOM_ENT: string;
  CVE_ENT: string;
  CVE_MUN: string;
};


async function getCoverageArea(hospitalPoints: L.LatLng[], travelTimeMinutes: number): Promise<any> {
  if (hospitalPoints.length === 0) {
    return null;
  }
  const locations = hospitalPoints.map(p => [p.lng, p.lat]);
  try {
    const response = await fetch('https://api.openrouteservice.org/v2/isochrones/driving-car', {
      method: 'POST',
      headers: {
        'Authorization': process.env.ORS_API_KEY,
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8',
      },
      body: JSON.stringify({
        locations: locations,
        range: [travelTimeMinutes * 60],
        range_type: 'time',
        options: { "union_polygons": true }
      }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error API OpenRouteService:", errorData);
      throw new Error(`API Error: ${errorData.error.message}`);
    }
    const geojsonData = await response.json();
    return geojsonData.features[0];
  } catch (error) {
    console.error("Falló la llamada a getCoverageArea:", error);
    return null;
  }
}

const getDensityColor = (count: number): string => {
  if (count < 1000) return '#28a745';
  if (count < 3000) return '#ffc107';
  return '#dc3545';
};

const MEXICAN_STATES = [
  "Aguascalientes",
  "Baja California",
  "Baja California Sur",
  "Campeche",
  "Chiapas",
  "Chihuahua",
  "Ciudad de Mexico",
  "Coahuila de Zaragoza",
  "Colima",
  "Durango",
  "Guanajuato",
  "Guerrero",
  "Hidalgo",
  "Jalisco",
  "Mexico",
  "Michoacan de Ocampo",
  "Morelos",
  "Nayarit",
  "Nuevo Leon",
  "Oaxaca",
  "Puebla",
  "Queretaro",
  "Quintana Roo",
  "San Luis Potosi",
  "Sinaloa",
  "Sonora",
  "Tabasco",
  "Tamaulipas",
  "Tlaxcala",
  "Veracruz de Ignacio de la Llave",
  "Yucatan",
  "Zacatecas"
];

// Función para verificar si un punto está dentro de un polígono
const isPointInPolygon = (point: L.LatLng, polygon: L.Polygon): boolean => {
  return polygon.getBounds().contains(point);
};

// Función para verificar si un punto está dentro de un MultiPolygon
const isPointInMultiPolygon = (point: L.LatLng, multiPolygon: L.MultiPolygon): boolean => {
  const polygons = multiPolygon.getLayers() as L.Polygon[];
  return polygons.some(polygon => isPointInPolygon(point, polygon));
};

// Función para verificar si un punto está dentro de cualquier geometría del estado
const isPointInState = (point: L.LatLng, stateLayer: L.GeoJSON): boolean => {
  let inside = false;

  stateLayer.eachLayer((layer: any) => {
    if (layer instanceof L.Polygon) {
      if (isPointInPolygon(point, layer)) {
        inside = true;
      }
    } else if (layer instanceof L.MultiPolygon) {
      if (isPointInMultiPolygon(point, layer)) {
        inside = true;
      }
    } else if (layer instanceof L.LayerGroup) {
      layer.eachLayer((sublayer: any) => {
        if (sublayer instanceof L.Polygon && isPointInPolygon(point, sublayer)) {
          inside = true;
        } else if (sublayer instanceof L.MultiPolygon && isPointInMultiPolygon(point, sublayer)) {
          inside = true;
        }
      });
    }
  });

  return inside;
};

export function MapPlaceholder() {
  const mapRef = useRef<LeafletMap | null>(null);
  const markersClusterRef = useRef<MarkerClusterGroup | null>(null);
  const hospitalHeatmapLayerRef = useRef<any | null>(null);
  const measureControlRef = useRef<MeasureControl | null>(null);
  const suggestionsLayerRef = useRef<FeatureGroup | null>(null);
  const populationHeatmapLayerRef = useRef<any | null>(null);
  const stateBoundaryLayerRef = useRef<L.GeoJSON | null>(null);
  const currentStateLayerRef = useRef<L.GeoJSON | null>(null);
  const pobrezaDataRef = useRef<any[]>([]);
  const povertyHeatmapLayerRef = useRef<any | null>(null);

  const hospitalesNivel1Ref = useRef<HospitalData[]>([]);
  const hospitalesNivel2Ref = useRef<HospitalData[]>([]);
  const localidadesDataRef = useRef<LocalidadData[]>([]);
  const currentStateGeometryRef = useRef<StateGeometry | null>(null);

  const [isAddingMode, setIsAddingMode] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isHospitalHeatmapVisible, setIsHospitalHeatmapVisible] = useState(false);
  const [isPopulationHeatmapVisible, setIsPopulationHeatmapVisible] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestionResults, setSuggestionResults] = useState<SuggestionResult[]>([]);
  const [numSuggestions, setNumSuggestions] = useState(5);
  const [loadingMessage, setLoadingMessage] = useState("Cargando mapa...");
  const [selectedState, setSelectedState] = useState<string>("all");
  const [isStateDataLoaded, setIsStateDataLoaded] = useState(false);
  const [isPovertyHeatmapVisible, setIsPovertyHeatmapVisible] = useState(false);
  const [suggestionType, setSuggestionType] = useState<'nivel1' | 'nivel2'>('nivel1');

  useEffect(() => {
    if (mapRef.current) return;

    const initMap = async () => {
      const L = (await import('leaflet')).default;
      await import('leaflet.markercluster');
      await import('leaflet.heat');
      await import('leaflet-measure');

      const mapContainer = document.getElementById('map');
      if (mapContainer && !(mapContainer as any)._leaflet_id) {
        const map = L.map('map').setView([23.6345, -102.5528], 5);
        mapRef.current = map;
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

        markersClusterRef.current = L.markerClusterGroup({
          iconCreateFunction: (cluster) => {
            const count = cluster.getChildCount();
            const color = getDensityColor(count);
            return L.divIcon({
              html: `<div class="cluster-icon" style="background-color: ${color};">${count}</div>`,
              className: 'custom-cluster',
              iconSize: L.point(40, 40)
            });
          }
        });

        suggestionsLayerRef.current = L.featureGroup().addTo(map);
        stateBoundaryLayerRef.current = L.geoJSON().addTo(map);

        measureControlRef.current = new (L.Control as any).Measure({
          primaryLengthUnit: 'meters',
          secondaryLengthUnit: 'kilometers',
          primaryAreaUnit: 'sqmeters',
          secondaryAreaUnit: undefined,
          localization: 'es',
          activeColor: '#FF6B6B',
          completedColor: '#C92A2A'
        });

        // Cargar datos
        const fetchAllData = async () => {
          setLoadingMessage("Cargando datos geoespaciales...");

          try {
            const nivel1Promise = fetch('/datos_primerNivel.json')
              .then(res => res.json())
              .then(data => {
                if (!Array.isArray(data)) return [];
                return data
                  .filter((h: any) => h.LATITUD != null && h.LONGITUD != null)
                  .map((h: any, i: number) => ({
                    id: `nivel1-${i}`,
                    lat: Number(h.LATITUD),
                    lng: Number(h.LONGITUD),
                    name: h["NOMBRE DE LA UNIDAD"] || 'Hospital (Nivel 1)',
                    source: 'level1'
                  } as HospitalData));
              });

            const nivel2Promise = fetch('/datos_segundoNivel.json')
              .then(res => res.json())
              .then(data => {
                if (!Array.isArray(data)) return [];
                return data
                  .filter((h: any) => h.LATITUD != null && h.LONGITUD != null)
                  .map((h: any, i: number) => ({
                    id: `nivel2-${i}`,
                    lat: Number(h.LATITUD),
                    lng: Number(h.LONGITUD),
                    name: h["NOMBRE DE LA UNIDAD"] || 'Hospital (Nivel 2)',
                    source: 'level2'
                  } as HospitalData));
              });

            const populationPromise = fetch('/localidades.json')
              .then(res => res.json())
              .then(data => Array.isArray(data) ? data : []);

            const pobrezaPromise = fetch('/datos_pobreza.json')
              .then(res => res.json())
              .then(data => Array.isArray(data) ? data : []);

            const [hospitalesNivel1, hospitalesNivel2, populationData, pobrezaData] = await Promise.all([
              nivel1Promise,
              nivel2Promise,
              populationPromise,
              pobrezaPromise
            ]);

            hospitalesNivel1Ref.current = hospitalesNivel1;
            hospitalesNivel2Ref.current = hospitalesNivel2;
            localidadesDataRef.current = populationData;
            pobrezaDataRef.current = pobrezaData;

            // Crear heatmap poblacional
            setLoadingMessage("Generando visualización de población...");
            if (Array.isArray(populationData) && populationData.length > 0) {
              const validData = populationData
                .map((loc: any) => {
                  const lat = parseFloat(loc.LAT_DECIMAL);
                  const lng = parseFloat(loc.LON_DECIMAL);
                  const pop = parseInt(String(loc.POB_TOTAL).replace(/,/g, ''), 10);
                  return { lat, lng, pop };
                })
                .filter(d => !isNaN(d.lat) && !isNaN(d.lng) && d.pop > 0);

              if (validData.length > 0) {
                const populations = validData.map(d => d.pop).sort((a, b) => a - b);
                const logMin = Math.log10(populations[0] || 1);
                const logMax = Math.log10(populations[populations.length - 1]);

                const heatData = validData.map(data => {
                  const normalized = logMax > logMin ?
                    (Math.log10(data.pop) - logMin) / (logMax - logMin) : 0;
                  return [data.lat, data.lng, Math.min(normalized, 1)];
                });

                populationHeatmapLayerRef.current = L.heatLayer(heatData, {
                  radius: 30,
                  blur: 20,
                  maxZoom: 15,
                  max: 1.0,
                  gradient: {
                    0.0: 'rgba(0, 0, 255, 0)',
                    0.1: 'blue',
                    0.3: 'cyan',
                    0.5: 'lime',
                    0.7: 'yellow',
                    0.9: 'orange',
                    1.0: 'red'
                  }
                });
              }
            }

            // Crear heatmap de pobreza
            setLoadingMessage("Generando visualización de pobreza...");
            if (Array.isArray(pobrezaData) && pobrezaData.length > 0 &&
              Array.isArray(populationData) && populationData.length > 0) {

              const pobrezaLookup = new Map(
                pobrezaData.map((m: any) => [m["Clave municipal"], m])
              );

              const povertyHeatData = populationData
                .map((loc: any) => {
                  const claveMun = parseInt(
                    String(loc.CVE_ENT).padStart(2, '0') +
                    String(loc.CVE_MUN).padStart(3, '0'),
                    10
                  );
                  const datosPobreza = pobrezaLookup.get(claveMun);
                  if (!datosPobreza) return null;

                  return [
                    parseFloat(loc.LAT_DECIMAL),
                    parseFloat(loc.LON_DECIMAL),
                    datosPobreza["Pobreza"]
                  ];
                })
                .filter(Boolean);

              if (povertyHeatData.length > 0) {
                const maxPoverty = povertyHeatData.reduce((max: number, p: any) =>
                  p[2] > max ? p[2] : max, 0
                );

                const normalizedHeatData = povertyHeatData.map((p: any) => [
                  p[0],
                  p[1],
                  maxPoverty > 0 ? p[2] / maxPoverty : 0
                ]);

                povertyHeatmapLayerRef.current = L.heatLayer(normalizedHeatData, {
                  radius: 20,
                  blur: 25,
                  maxZoom: 11,
                  max: 1.0,
                  gradient: {
                    0.1: 'lime',
                    0.3: 'yellow',
                    0.6: 'orange',
                    1.0: 'red'
                  }
                });
              }
            }

            setLoadingMessage("");
            setIsMapReady(true);

          } catch (error) {
            console.error("Error cargando datos:", error);
            setLoadingMessage("Error cargando datos");
          }
        };

        await fetchAllData();
      }
    };

    initMap();
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Cargar geometría del estado seleccionado
  useEffect(() => {
    if (selectedState === "all") {
      if (markersClusterRef.current) {
        markersClusterRef.current.clearLayers();
      }
      if (stateBoundaryLayerRef.current) {
        stateBoundaryLayerRef.current.clearLayers();
      }
      if (suggestionsLayerRef.current) {
        suggestionsLayerRef.current.clearLayers();
      }
      setIsStateDataLoaded(false);
      currentStateGeometryRef.current = null;
      currentStateLayerRef.current = null;

      if (mapRef.current) {
        mapRef.current.setView([23.6345, -102.5528], 5);
      }
      return;
    }

    const loadStateData = async () => {
      setIsStateDataLoaded(false);
      setLoadingMessage(`Cargando datos de ${selectedState}...`);

      try {
        const response = await fetch(`/states/${encodeURIComponent(selectedState)}.json`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const stateGeoJSON: StateGeoJSON = await response.json();

        if (stateBoundaryLayerRef.current && mapRef.current) {
          stateBoundaryLayerRef.current.clearLayers();
          stateBoundaryLayerRef.current.addData(stateGeoJSON);

          currentStateLayerRef.current = L.geoJSON(stateGeoJSON);

          const bounds = stateBoundaryLayerRef.current.getBounds();
          if (bounds.isValid()) {
            mapRef.current.fitBounds(bounds, { padding: [20, 20] });
          }

          currentStateGeometryRef.current = stateGeoJSON.features[0]?.geometry || null;
        }

        if (markersClusterRef.current && mapRef.current && currentStateLayerRef.current) {
          markersClusterRef.current.clearLayers();
          const L = (window as any).L;

          // Iconos diferentes para nivel 1 y nivel 2
          const hospitalIconLevel1 = L.icon({
            iconUrl: '/hospital1.png',
            iconSize: [35, 35],
            iconAnchor: [17, 35],
            popupAnchor: [0, -35]
          });

          const hospitalIconLevel2 = L.icon({
            iconUrl: '/hospital2.png',
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32]
          });

          // Filtrar hospitales por estado
          const hospitalsInStateNivel1 = hospitalesNivel1Ref.current.filter(hospital => {
            const hospitalPoint = L.latLng(hospital.lat, hospital.lng);
            return isPointInState(hospitalPoint, currentStateLayerRef.current!);
          });

          const hospitalsInStateNivel2 = hospitalesNivel2Ref.current.filter(hospital => {
            const hospitalPoint = L.latLng(hospital.lat, hospital.lng);
            return isPointInState(hospitalPoint, currentStateLayerRef.current!);
          });

          console.log(`Hospitales Nivel 1 en ${selectedState}:`, hospitalsInStateNivel1.length);
          console.log(`Hospitales Nivel 2 en ${selectedState}:`, hospitalsInStateNivel2.length);

          // Agregar marcadores de nivel 1
          const markersNivel1 = hospitalsInStateNivel1.map(hospital =>
            L.marker([hospital.lat, hospital.lng], { icon: hospitalIconLevel1 })
              .bindPopup(`<b>${hospital.name}</b><br/>Nivel 1<br/>${selectedState}`)
          );

          // Agregar marcadores de nivel 2
          const markersNivel2 = hospitalsInStateNivel2.map(hospital =>
            L.marker([hospital.lat, hospital.lng], { icon: hospitalIconLevel2 })
              .bindPopup(`<b>${hospital.name}</b><br/>Nivel 2<br/>${selectedState}`)
          );

          markersClusterRef.current.addLayers([...markersNivel1, ...markersNivel2]);

          if (!mapRef.current.hasLayer(markersClusterRef.current)) {
            mapRef.current.addLayer(markersClusterRef.current);
          }

          // Crear heatmap combinado
          if (hospitalHeatmapLayerRef.current && mapRef.current.hasLayer(hospitalHeatmapLayerRef.current)) {
            mapRef.current.removeLayer(hospitalHeatmapLayerRef.current);
          }

          const heatData = [
            ...hospitalsInStateNivel1.map(h => [h.lat, h.lng, 1.0]),
            ...hospitalsInStateNivel2.map(h => [h.lat, h.lng, 0.7]) // Peso menor para nivel 2
          ];

          if (heatData.length > 0) {
            hospitalHeatmapLayerRef.current = (L as any).heatLayer(heatData, {
              radius: 25,
              blur: 15,
              maxZoom: 17,
              gradient: {
                0.4: 'blue',
                0.65: 'lime',
                1: 'red'
              }
            });
          }

          if (isHospitalHeatmapVisible && hospitalHeatmapLayerRef.current) {
            if (mapRef.current.hasLayer(markersClusterRef.current)) {
              mapRef.current.removeLayer(markersClusterRef.current);
            }
            mapRef.current.addLayer(hospitalHeatmapLayerRef.current);
          } else {
            if (hospitalHeatmapLayerRef.current && mapRef.current.hasLayer(hospitalHeatmapLayerRef.current)) {
              mapRef.current.removeLayer(hospitalHeatmapLayerRef.current);
            }
            if (!mapRef.current.hasLayer(markersClusterRef.current)) {
              mapRef.current.addLayer(markersClusterRef.current);
            }
          }
        }

        setIsStateDataLoaded(true);
        setLoadingMessage("");

      } catch (error) {
        console.error(`Error loading state data for ${selectedState}:`, error);
        setLoadingMessage(`Error cargando datos de ${selectedState}`);
        alert(`No se pudieron cargar los datos para ${selectedState}. Verifica que el archivo exista.`);
      }
    };

    loadStateData();
  }, [selectedState]);

  // Efectos para manejar visibilidad de heatmaps
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !markersClusterRef.current || !hospitalHeatmapLayerRef.current || !isStateDataLoaded) return;

    if (isHospitalHeatmapVisible) {
      if (map.hasLayer(markersClusterRef.current)) {
        map.removeLayer(markersClusterRef.current);
      }
      if (!map.hasLayer(hospitalHeatmapLayerRef.current)) {
        map.addLayer(hospitalHeatmapLayerRef.current);
      }
    } else {
      if (map.hasLayer(hospitalHeatmapLayerRef.current)) {
        map.removeLayer(hospitalHeatmapLayerRef.current);
      }
      if (!map.hasLayer(markersClusterRef.current)) {
        map.addLayer(markersClusterRef.current);
      }
    }
  }, [isHospitalHeatmapVisible, isStateDataLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !povertyHeatmapLayerRef.current) return;

    if (isPovertyHeatmapVisible) {
      if (!map.hasLayer(povertyHeatmapLayerRef.current)) {
        map.addLayer(povertyHeatmapLayerRef.current);
      }
    } else {
      if (map.hasLayer(povertyHeatmapLayerRef.current)) {
        map.removeLayer(povertyHeatmapLayerRef.current);
      }
    }
  }, [isPovertyHeatmapVisible]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !populationHeatmapLayerRef.current) return;

    if (isPopulationHeatmapVisible) {
      if (!map.hasLayer(populationHeatmapLayerRef.current)) {
        map.addLayer(populationHeatmapLayerRef.current);
      }
    } else {
      if (map.hasLayer(populationHeatmapLayerRef.current)) {
        map.removeLayer(populationHeatmapLayerRef.current);
      }
    }
  }, [isPopulationHeatmapVisible]);

  // Efecto para actualizar heatmap poblacional por estado
  useEffect(() => {
    const updatePopulationHeatmap = async () => {
      if (!mapRef.current || !localidadesDataRef.current.length) return;

      const L = typeof window !== 'undefined' ? (window as any).L : null;
      if (!L) return;

      const filteredPopulationData = selectedState !== "all" && selectedState
        ? localidadesDataRef.current.filter((loc: any) => loc.NOM_ENT === selectedState)
        : localidadesDataRef.current;

      console.log(`Actualizando heatmap poblacional para ${selectedState}: ${filteredPopulationData.length} localidades`);

      const validData = filteredPopulationData
        .map((loc: any) => {
          const lat = parseFloat(loc.LAT_DECIMAL);
          const lng = parseFloat(loc.LON_DECIMAL);
          const pop = parseInt(String(loc.POB_TOTAL).replace(/,/g, ''), 10);
          return { lat, lng, pop };
        })
        .filter(d => !isNaN(d.lat) && !isNaN(d.lng) && d.pop > 0);

      if (validData.length === 0) {
        console.log("No hay datos válidos para el heatmap");
        if (populationHeatmapLayerRef.current && mapRef.current.hasLayer(populationHeatmapLayerRef.current)) {
          mapRef.current.removeLayer(populationHeatmapLayerRef.current);
        }
        populationHeatmapLayerRef.current = null;
        return;
      }

      const populations = validData.map(d => d.pop).sort((a, b) => a - b);
      const minPop = populations[0];
      const maxPop = populations[populations.length - 1];

      const logMin = Math.log10(minPop || 1);
      const logMax = Math.log10(maxPop);

      const heatData = validData
        .filter(data => data.pop > 900) // Filtra solo poblaciones significativas
        .map(data => {
          const logValue = Math.log10(data.pop);
          const normalized = (logValue - logMin) / (logMax - logMin);
          return [data.lat, data.lng, Math.min(normalized, 1)] as [number, number, number];
        });

      if (populationHeatmapLayerRef.current && mapRef.current.hasLayer(populationHeatmapLayerRef.current)) {
        mapRef.current.removeLayer(populationHeatmapLayerRef.current);
      }

      populationHeatmapLayerRef.current = L.heatLayer(heatData, {
        radius: 30,
        blur: 20,
        maxZoom: 15,
        max: 1.0,
        minOpacity: 0.3,
        gradient: {
          0.0: 'rgba(0, 0, 255, 0)',
          0.1: 'blue',
          0.15: 'cyan',
          0.3: 'lime',
          0.7: 'yellow',
          0.9: 'orange',
          1.0: 'red'
        }
      });

      if (isPopulationHeatmapVisible) {
        mapRef.current.addLayer(populationHeatmapLayerRef.current);
      }
    };

    updatePopulationHeatmap();
  }, [selectedState, isPopulationHeatmapVisible]);

  const findOptimalLocations = async () => {
    const L = (window as any).L;
    if (!mapRef.current || !isStateDataLoaded || !localidadesDataRef.current.length) {
      alert("El mapa o los datos necesarios no están completamente cargados.");
      return;
    }

    setIsAnalyzing(true);
    setLoadingMessage("Calculando áreas de cobertura por carretera...");
    suggestionsLayerRef.current?.clearLayers();

    try {
      // Obtener hospitales base según el tipo de sugerencia
      let hospitalesBase: HospitalData[] = [];
      let tiempoViajeMinutos = 20;
      let minDistanceKm = 10;

      if (suggestionType === 'nivel1') {
        hospitalesBase = hospitalesNivel1Ref.current;
      } else {
        hospitalesBase = hospitalesNivel2Ref.current;
        // Para nivel 2, podemos usar una distancia menor ya que son para zonas de crecimiento
        minDistanceKm = 5;
      }

      const hospitalesEnEstado = hospitalesBase.filter(hospital => {
        const point = L.latLng(hospital.lat, hospital.lng);
        return isPointInState(point, currentStateLayerRef.current!);
      });

      const allHospitalPoints = hospitalesEnEstado.map(h => L.latLng(h.lat, h.lng));

      const hospitalCoveragePolygon = await getCoverageArea(allHospitalPoints, tiempoViajeMinutos);

      setLoadingMessage("Analizando zonas sin cobertura...");

      const localidadesEnEstado = localidadesDataRef.current.filter((loc: any) => loc.NOM_ENT === selectedState);

      // Cargar turf.js dinámicamente
      const turf = await import('@turf/turf');

      const scoredLocalidades = localidadesEnEstado
        .map((loc: any) => {
          const lat = parseFloat(loc.LAT_DECIMAL);
          const lng = parseFloat(loc.LON_DECIMAL);
          const population = parseInt(String(loc.POB_TOTAL).replace(/,/g, ''), 10);
          if (isNaN(lat) || isNaN(lng) || isNaN(population) || population === 0) return null;

          const locPoint = turf.point([lng, lat]);

          if (hospitalCoveragePolygon && turf.booleanPointInPolygon(locPoint, hospitalCoveragePolygon)) {
            return null;
          }

          let score = 0;
          let details = { population };

          if (suggestionType === 'nivel1') {
            // Para nivel 1: usar pobreza y carencia de salud (como originalmente)
            const pobrezaLookup = new Map(pobrezaDataRef.current.map((m: any) => [m["Clave municipal"], m]));
            const claveMunicipalCompleta = parseInt(
              String(loc.CVE_ENT).padStart(2, '0') +
              String(loc.CVE_MUN).padStart(3, '0'),
              10
            );
            const datosPobreza = pobrezaLookup.get(claveMunicipalCompleta);
            if (!datosPobreza) return null;

            const factorPoblacion = Math.log10(population + 1);
            const factorCarenciaSalud = datosPobreza["Carencia por acceso a los servicios de salud"] || 0;
            const factorPobrezaGeneral = datosPobreza["Pobreza"] || 0;
            score = factorPoblacion * factorCarenciaSalud * (1 + factorPobrezaGeneral / 100);

            details = {
              ...details,
              poverty: factorPobrezaGeneral,
              healthAccessDeficiency: factorCarenciaSalud
            };
          } else {
            // Para nivel 2: solo densidad poblacional ALTA (para zonas de crecimiento)
            const UMBRAL_POBLACION_MINIMA = 5000;
            const POBLACION_OBJETIVO = 20000; // Población ideal para un hospital nivel 2

            if (population < UMBRAL_POBLACION_MINIMA) {
              return null; // Excluir localidades muy pequeñas
            }

            // Score que favorece localidades cercanas a la población objetivo
            score = population * Math.exp(-Math.abs(population - POBLACION_OBJETIVO) / POBLACION_OBJETIVO);
          }

          return {
            name: loc.NOM_LOC || 'N/A',
            score: score,
            center: L.latLng(lat, lng),
            type: suggestionType,
            details: details
          };
        })
        .filter(Boolean);

      setLoadingMessage("Seleccionando ubicaciones óptimas...");

      if (scoredLocalidades.length === 0) {
        alert(`No se encontraron localidades sin cobertura que requieran un nuevo hospital de ${suggestionType === 'nivel1' ? 'nivel 1' : 'nivel 2'}.`);
        setIsAnalyzing(false);
        setLoadingMessage("");
        return;
      }

      scoredLocalidades.sort((a: any, b: any) => b.score - a.score);
      const topSuggestions = [];
      const existingAndNewPoints = [...allHospitalPoints];

      for (const candidate of scoredLocalidades) {
        const c = candidate as any;
        const isFarEnough = existingAndNewPoints.every(p =>
          c.center.distanceTo(p) > minDistanceKm * 1000
        );
        if (isFarEnough) {
          topSuggestions.push(c);
          existingAndNewPoints.push(c.center);
          if (topSuggestions.length >= numSuggestions) break;
        }
      }

      if (topSuggestions.length === 0) {
        alert(`No se encontraron ubicaciones que cumplan con la distancia mínima de ${minDistanceKm}km.`);
      } else {
        topSuggestions.forEach((suggestion: any, index: number) => {
          // Iconos diferentes para cada tipo de sugerencia
          const iconHtml = suggestion.type === 'nivel1'
            ? '🏥<div style="font-size: 10px; text-align: center; color: blue; font-weight: bold;">N1</div>'
            : '🏨<div style="font-size: 10px; text-align: center; color: green; font-weight: bold;">N2</div>';

          L.marker(suggestion.center, {
            icon: L.divIcon({
              html: `${iconHtml}<div style="font-size: 8px; text-align: center; color: black; font-weight: bold;">${index + 1}</div>`,
              className: 'suggestion-icon',
              iconSize: [30, 30]
            })
          })
            .bindPopup(`
  <b>${index + 1}. ${suggestion.name}</b><br/>
  <b>Tipo: ${suggestion.type === 'nivel1' ?
                (suggestion.details.population < 2000 ? 'Centro de Salud' : 'Hospital Nivel 1') :
                'Hospital Nivel 2'}</b><br/>
  <b>Índice de Necesidad: ${suggestion.score.toFixed(2)}</b><br/>
  <hr>
  Población: ${suggestion.details.population.toLocaleString()}<br/>
  ${suggestion.type === 'nivel1' ? `
  Pobreza: ${suggestion.details.poverty?.toFixed(2)}%<br/>
  Carencia Acceso a Salud: ${suggestion.details.healthAccessDeficiency?.toFixed(2)}%
  ` : 'Criterio: Alta Densidad Poblacional (Zona de Crecimiento)'}
`)
            .addTo(suggestionsLayerRef.current!);
        });

        const suggestionBounds = L.latLngBounds(topSuggestions.map((s: any) => s.center));
        if (suggestionBounds.isValid()) {
          mapRef.current.fitBounds(suggestionBounds, { padding: [50, 50] });
        }
      }

      setSuggestionResults(topSuggestions as any);

    } catch (error) {
      console.error("Error en el análisis principal:", error);
      alert(`Ocurrió un error en el análisis: ${error}`);
    } finally {
      setIsAnalyzing(false);
      setLoadingMessage("");
    }
  };

  const handleAddHospital = () => {
    setIsAddingMode(!isAddingMode);
  };

  const toggleMeasureTool = () => {
    if (measureControlRef.current && mapRef.current) {
      if (mapRef.current.hasControl(measureControlRef.current)) {
        mapRef.current.removeControl(measureControlRef.current);
      } else {
        measureControlRef.current.addTo(mapRef.current);
      }
    }
  };

  return (
    <Card className="w-full h-[100vh]">
      <CardContent className="p-0 h-full w-full relative">
        <div id="map" className="w-full h-full bg-gray-200" />

        <div className="absolute top-4 right-4 z-[1000] bg-white p-4 rounded shadow-lg space-y-4 max-h-[95vh] overflow-y-auto min-w-[300px]">
          <div>
            <h3 className="font-bold mb-2">Seleccionar Estado</h3>
            <select
              value={selectedState}
              onChange={e => setSelectedState(e.target.value)}
              style={{ width: '100%', padding: 8, borderRadius: 4 }}
            >
              <option value="all">Todos los estados</option>
              {MEXICAN_STATES.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>

          {selectedState && selectedState !== "all" && (
            <>
              <div>
                <h3 className="font-bold mb-2">Vistas</h3>
                <div className="flex flex-col space-y-2">
                  <Button
                    onClick={() => setIsHospitalHeatmapVisible(!isHospitalHeatmapVisible)}
                    variant="outline"
                    className="w-full"
                    disabled={!isStateDataLoaded}
                  >
                    {isHospitalHeatmapVisible ? "Ver como Puntos" : "Ver Calor de Hospitales"}
                  </Button>
                  <Button
                    onClick={() => setIsPopulationHeatmapVisible(!isPopulationHeatmapVisible)}
                    variant="outline"
                    className="w-full"
                  >
                    {isPopulationHeatmapVisible ? "Ocultar Calor Poblacional" : "Ver Calor Poblacional"}
                  </Button>
                  <Button
                    onClick={() => setIsPovertyHeatmapVisible(!isPovertyHeatmapVisible)}
                    variant="outline"
                    className="w-full"
                  >
                    {isPovertyHeatmapVisible ? "Ocultar Calor de Pobreza" : "Ver Calor de Pobreza"}
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="font-bold mb-2">Análisis de Ubicaciones</h3>
                <div className="p-2 border rounded-md space-y-3">
                  <div className="space-y-2">
                    <label className="font-semibold text-sm">Tipo de Hospital Sugerido:</label>
                    <select
                      value={suggestionType}
                      onChange={e => setSuggestionType(e.target.value as 'nivel1' | 'nivel2')}
                      style={{ width: '100%', padding: 8, borderRadius: 4 }}
                    >
                      <option value="nivel1">Hospital Nivel 1 (Pobreza + Carencia Salud)</option>
                      <option value="nivel2">Hospital Nivel 2 (Alta Densidad Poblacional)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="font-semibold text-sm">No. de Sugerencias:</label>
                    <Input
                      type="number"
                      value={numSuggestions}
                      onChange={(e) => setNumSuggestions(parseInt(e.target.value, 10))}
                      min="1"
                      max="20"
                    />
                  </div>

                  <Button
                    onClick={findOptimalLocations}
                    disabled={isAnalyzing || !isStateDataLoaded}
                    className="w-full"
                  >
                    {isAnalyzing ? "Analizando..." : `Encontrar Ubicaciones ${suggestionType === 'nivel1' ? 'Nivel 1' : 'Nivel 2'}`}
                  </Button>
                </div>

                {suggestionResults.length > 0 && (
                  <div className="p-2 border rounded-md mt-4">
                    <h4 className="font-bold mb-2">
                      Ubicaciones Sugeridas en {selectedState} ({suggestionType === 'nivel1' ? 'Nivel 1' : 'Nivel 2'}):
                    </h4>
                    <ul className="list-decimal list-inside text-sm space-y-1">
                      {suggestionResults.map((r, index) => (
                        <li key={r.name}>
                          <strong>{r.name}</strong> - Puntaje: {r.score.toFixed(2)} (Ranking: {index + 1})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex flex-col space-y-2 mt-4">
                  <Button
                    onClick={toggleMeasureTool}
                    variant="outline"
                    disabled={isAnalyzing}
                  >
                    Medir Distancia
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        {!isMapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-[1001]">
            <p className="text-xl font-semibold">{loadingMessage}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 
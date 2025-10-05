'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import L from 'leaflet';

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
};

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
  "Ciudad de México",
  "Coahuila de Zaragoza",
  "Colima",
  "Durango",
  "Guanajuato",
  "Guerrero",
  "Hidalgo",
  "Jalisco",
  "México",
  "Michoacán de Ocampo",
  "Morelos",
  "Nayarit",
  "Nuevo León",
  "Oaxaca",
  "Puebla",
  "Querétaro",
  "Quintana Roo",
  "San Luis Potosí",
  "Sinaloa",
  "Sonora",
  "Tabasco",
  "Tamaulipas",
  "Tlaxcala",
  "Veracruz de Ignacio de la Llave",
  "Yucatán",
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
              className: 'custom-cluster', iconSize: L.point(40, 40)
            });
          }
        });

        suggestionsLayerRef.current = L.featureGroup().addTo(map);
        stateBoundaryLayerRef.current = L.geoJSON().addTo(map);

        measureControlRef.current = new (L.Control as any).Measure({
          primaryLengthUnit: 'meters', secondaryLengthUnit: 'kilometers',
          primaryAreaUnit: 'sqmeters', secondaryAreaUnit: undefined,
          localization: 'es', activeColor: '#FF6B6B', completedColor: '#C92A2A'
        });

        // Cargar solo hospitales de nivel 2 y datos de localidades
        const fetchAllData = async () => {
          setLoadingMessage("Cargando datos...");

          const nivel2Promise = fetch('/datos_segundoNivel.json').then(res => res.json())
            .then(data => data.filter((h: any) => h.LATITUD != null && h.LONGITUD != null).map((h: any, i: number) => ({
              id: `nivel2-${i}`,
              lat: Number(h.LATITUD),
              lng: Number(h.LONGITUD),
              name: h["NOMBRE DE LA UNIDAD"] || 'Hospital (Nivel 2)',
              source: 'level2'
            } as HospitalData)));

          const populationPromise = fetch('/localidades.json').then(res => res.json());

          const [hospitalesNivel2, populationData] = await Promise.all([nivel2Promise, populationPromise]);

          hospitalesNivel2Ref.current = hospitalesNivel2;
          localidadesDataRef.current = populationData || [];

          // CREAR HEATMAP POBLACIONAL INICIAL (sin filtrar por estado)
          // En fetchAllData, reemplaza la parte del heatmap poblacional:
          // CREAR HEATMAP POBLACIONAL INICIAL (sin filtrar por estado)
          if (populationData && Array.isArray(populationData)) {
            const L = typeof window !== 'undefined' ? (window as any).L : null;
            if (L) {
              // Calcular estadísticas para escala
              const populations = populationData
                .map((loc: any) => parseInt(String(loc.POB_TOTAL).replace(/,/g, ''), 10))
                .filter(pop => !isNaN(pop) && pop > 0)
                .sort((a, b) => a - b);

              // En fetchAllData, reemplaza solo la parte del heatmap:
              // CREAR HEATMAP POBLACIONAL INICIAL (sin filtrar por estado)
              // En fetchAllData, reemplaza SOLO la parte del heatmap poblacional con esto:
              if (populationData && Array.isArray(populationData)) {
                const L = typeof window !== 'undefined' ? (window as any).L : null;
                if (L) {
                  // Procesar datos de población
                  const validData = populationData
                    .map((loc: any) => {
                      const lat = parseFloat(loc.LAT_DECIMAL);
                      const lng = parseFloat(loc.LON_DECIMAL);
                      const pop = parseInt(String(loc.POB_TOTAL).replace(/,/g, ''), 10);

                      if (!isNaN(lat) && !isNaN(lng) && !isNaN(pop) && pop > 0) {
                        return { lat, lng, pop };
                      }
                      return null;
                    })
                    .filter(Boolean) as { lat: number; lng: number; pop: number }[];

                  if (validData.length > 0) {
                    // Calcular estadísticas para escala logarítmica
                    const populations = validData.map(d => d.pop).sort((a, b) => a - b);
                    const minPop = populations[0];
                    const maxPop = populations[populations.length - 1];
                    const logMin = Math.log10(minPop || 1);
                    const logMax = Math.log10(maxPop);

                    const heatData = validData.map(data => {
                      const logValue = Math.log10(data.pop);
                      const normalized = (logValue - logMin) / (logMax - logMin);
                      return [data.lat, data.lng, Math.min(normalized, 1)] as [number, number, number];
                    });

                    populationHeatmapLayerRef.current = L.heatLayer(heatData, {
                      radius: 30,
                      blur: 20,
                      maxZoom: 15,
                      max: 1.0,
                      minOpacity: 0.3,
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
              }
            }
          }

          setLoadingMessage("");
          setIsMapReady(true);
        };

        await fetchAllData();
      }
    };
    initMap();
    return () => { mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  // Cargar geometría del estado seleccionado
  useEffect(() => {
    if (selectedState === "all") {
      // Limpiar mapa cuando se selecciona "todos los estados"
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

      // Resetear vista a México completo
      if (mapRef.current) {
        mapRef.current.setView([23.6345, -102.5528], 5);
      }
      return;
    }

    const loadStateData = async () => {
      setIsStateDataLoaded(false);
      setLoadingMessage(`Cargando datos de ${selectedState}...`);

      try {
        // Cargar geometría del estado
        const response = await fetch(`/states/${encodeURIComponent(selectedState)}.json`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const stateGeoJSON: StateGeoJSON = await response.json();

        if (stateBoundaryLayerRef.current && mapRef.current) {
          stateBoundaryLayerRef.current.clearLayers();
          stateBoundaryLayerRef.current.addData(stateGeoJSON);

          // Crear una capa separada para las verificaciones de geometría
          currentStateLayerRef.current = L.geoJSON(stateGeoJSON);

          // Ajustar vista al estado
          const bounds = stateBoundaryLayerRef.current.getBounds();
          if (bounds.isValid()) {
            mapRef.current.fitBounds(bounds, { padding: [20, 20] });
          }

          // Guardar geometría para análisis
          currentStateGeometryRef.current = stateGeoJSON.features[0]?.geometry || null;
        }

        // Filtrar hospitales de nivel 2 que están dentro del estado usando la geometría real
        if (markersClusterRef.current && mapRef.current && currentStateLayerRef.current) {
          markersClusterRef.current.clearLayers();
          const L = (window as any).L;

          const hospitalIconLevel2 = L.icon({ iconUrl: '/hotlinking3.png', iconSize: [40, 40] });

          const hospitalsInState = hospitalesNivel2Ref.current.filter(hospital => {
            const hospitalPoint = L.latLng(hospital.lat, hospital.lng);
            return isPointInState(hospitalPoint, currentStateLayerRef.current!);
          });

          console.log(`Hospitales encontrados en ${selectedState}:`, hospitalsInState.length);

          const markers = hospitalsInState.map(hospital =>
            L.marker([hospital.lat, hospital.lng], { icon: hospitalIconLevel2 })
              .bindPopup(`<b>${hospital.name}</b><br/>${selectedState}`)
          );

          markersClusterRef.current.addLayers(markers);

          // Asegurarse de que el cluster se añade al mapa
          if (!mapRef.current.hasLayer(markersClusterRef.current)) {
            mapRef.current.addLayer(markersClusterRef.current);
          }

          // Actualizar heatmap de hospitales
          if (hospitalHeatmapLayerRef.current && mapRef.current.hasLayer(hospitalHeatmapLayerRef.current)) {
            mapRef.current.removeLayer(hospitalHeatmapLayerRef.current);
          }

          const heatData = hospitalsInState.map(h => [h.lat, h.lng, 1.0]);
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

          // Aplicar la visibilidad actual del heatmap
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

  // Efecto separado para manejar cambios en la visibilidad del heatmap de hospitales
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !markersClusterRef.current || !hospitalHeatmapLayerRef.current || !isStateDataLoaded) return;

    if (isHospitalHeatmapVisible) {
      // Mostrar heatmap, ocultar markers
      if (map.hasLayer(markersClusterRef.current)) {
        map.removeLayer(markersClusterRef.current);
      }
      if (!map.hasLayer(hospitalHeatmapLayerRef.current)) {
        map.addLayer(hospitalHeatmapLayerRef.current);
      }
    } else {
      // Mostrar markers, ocultar heatmap
      if (map.hasLayer(hospitalHeatmapLayerRef.current)) {
        map.removeLayer(hospitalHeatmapLayerRef.current);
      }
      if (!map.hasLayer(markersClusterRef.current)) {
        map.addLayer(markersClusterRef.current);
      }
    }
  }, [isHospitalHeatmapVisible, isStateDataLoaded]);

  // Efecto separado para manejar cambios en la visibilidad del heatmap poblacional
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

  // Efecto para actualizar el heatmap poblacional cuando cambia el estado
  // Efecto para actualizar el heatmap poblacional cuando cambia el estado
  // Efecto para actualizar el heatmap poblacional cuando cambia el estado
  useEffect(() => {
    const updatePopulationHeatmap = async () => {
      if (!mapRef.current || !localidadesDataRef.current.length) return;

      const L = typeof window !== 'undefined' ? (window as any).L : null;
      if (!L) return;

      // Filtrar por estado usando NOM_ENT
      const filteredPopulationData = selectedState !== "all" && selectedState
        ? localidadesDataRef.current.filter((loc: any) => loc.NOM_ENT === selectedState)
        : localidadesDataRef.current;

      console.log(`Actualizando heatmap poblacional para ${selectedState}: ${filteredPopulationData.length} localidades`);

      // Procesar datos de población
      const validData = filteredPopulationData
        .map((loc: any) => {
          const lat = parseFloat(loc.LAT_DECIMAL);
          const lng = parseFloat(loc.LON_DECIMAL);
          const pop = parseInt(String(loc.POB_TOTAL).replace(/,/g, ''), 10);

          if (!isNaN(lat) && !isNaN(lng) && !isNaN(pop) && pop > 0) {
            return { lat, lng, pop };
          }
          return null;
        })
        .filter(Boolean) as { lat: number; lng: number; pop: number }[];

      if (validData.length === 0) {
        console.log("No hay datos válidos para el heatmap");
        if (populationHeatmapLayerRef.current && mapRef.current.hasLayer(populationHeatmapLayerRef.current)) {
          mapRef.current.removeLayer(populationHeatmapLayerRef.current);
        }
        populationHeatmapLayerRef.current = null;
        return;
      }

      // Calcular estadísticas
      const populations = validData.map(d => d.pop).sort((a, b) => a - b);
      const minPop = populations[0];
      const maxPop = populations[populations.length - 1];

      // Usar escala logarítmica para mejor distribución
      const logMin = Math.log10(minPop || 1);
      const logMax = Math.log10(maxPop);

      // Crear heat data con valores normalizados (0-1)
      const heatData = validData.map(data => {
        const logValue = Math.log10(data.pop);
        const normalized = (logValue - logMin) / (logMax - logMin);
        return [data.lat, data.lng, Math.min(normalized, 1)] as [number, number, number];
      });

      // Actualizar heatmap
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
          0.3: 'cyan',
          0.5: 'lime',
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

  const findOptimalLocations = () => {
    const L = (window as any).L;

    if (!mapRef.current) {
      alert("El mapa no está listo.");
      return;
    }

    if (selectedState !== "all" && (!currentStateLayerRef.current || !isStateDataLoaded)) {
      alert("Los datos del estado no están cargados.");
      return;
    }

    if (localidadesDataRef.current.length === 0) {
      alert("Los datos de población no están cargados.");
      return;
    }

    setIsAnalyzing(true);
    suggestionsLayerRef.current?.clearLayers();

    setTimeout(() => {
      try {
        const map = mapRef.current!;

        // Filtrar hospitales según si es "all" o estado específico usando la geometría real
        let hospitalsToAnalyze = hospitalesNivel2Ref.current;

        if (selectedState !== "all") {
          hospitalsToAnalyze = hospitalesNivel2Ref.current.filter(hospital => {
            const hospitalPoint = L.latLng(hospital.lat, hospital.lng);
            return isPointInState(hospitalPoint, currentStateLayerRef.current!);
          });
        }

        const allHospitals = hospitalsToAnalyze.map(h => L.latLng(h.lat, h.lng));
        const accessibilityRadius = 5000; // 5km en metros

        let scoredLocalidades = [];

        // PRIMERO: Filtrar localidades por estado usando NOM_ENT
        const filteredLocalidades = selectedState !== "all"
          ? localidadesDataRef.current.filter((loc: any) => loc.NOM_ENT === selectedState)
          : localidadesDataRef.current;

        console.log(`Analizando ${filteredLocalidades.length} localidades para ${selectedState}`);

        for (const loc of filteredLocalidades) {
          const lat = parseFloat(loc.LAT_DECIMAL);
          const lng = parseFloat(loc.LON_DECIMAL);
          const population = parseInt(String(loc.POB_TOTAL).replace(/,/g, ''), 10);

          if (isNaN(lat) || isNaN(lng) || isNaN(population)) continue;

          const locPoint = L.latLng(lat, lng);

          // Calcular hospitales accesibles
          const accessibleHospitals = allHospitals.filter(h => locPoint.distanceTo(h) <= accessibilityRadius).length;
          const populationDensityFactor = population / 1000;
          const nhiScore = (populationDensityFactor * populationDensityFactor) - accessibleHospitals;

          scoredLocalidades.push({
            name: loc.NOM_LOC || 'N/A',
            score: nhiScore,
            center: locPoint,
            population: population,
            accessibleHospitals: accessibleHospitals
          });
        }

        console.log(`Localidades procesadas: ${scoredLocalidades.length}`);

        // Filtrar solo las que cumplen la condición NH_i > 50
        const candidates = scoredLocalidades.filter(s => s.score > 50);

        console.log(`Candidatos con NH_i > 50: ${candidates.length}`);

        if (candidates.length === 0) {
          alert("No se encontraron localidades con un Índice de Necesidad Hospitalaria (NH_i) mayor a 50 con los criterios actuales.");
          setIsAnalyzing(false);
          return;
        }

        // SEGUNDO: Aplicar distancia mínima de 20km entre sugerencias y hospitales existentes
        const MIN_DISTANCE_KM = 2;
        const selectedSuggestions = [];

        // Ordenar candidatos por puntaje (más alto primero)
        candidates.sort((a, b) => b.score - a.score);

        for (const candidate of candidates) {
          // Verificar distancia con hospitales existentes
          const isFarFromExistingHospitals = allHospitals.every(hospital =>
            candidate.center.distanceTo(hospital) >= MIN_DISTANCE_KM * 1000 // Convertir a metros
          );

          // Verificar distancia con sugerencias ya seleccionadas
          const isFarFromOtherSuggestions = selectedSuggestions.every(selected =>
            candidate.center.distanceTo(selected.center) >= MIN_DISTANCE_KM * 1000
          );

          if (isFarFromExistingHospitals && isFarFromOtherSuggestions) {
            selectedSuggestions.push(candidate);

            // Si ya tenemos suficientes sugerencias, salir del loop
            if (selectedSuggestions.length >= numSuggestions) {
              break;
            }
          }
        }

        console.log(`Sugerencias finales después de aplicar distancia mínima: ${selectedSuggestions.length}`);

        if (selectedSuggestions.length === 0) {
          alert(`No se encontraron ubicaciones que cumplan con la distancia mínima de ${MIN_DISTANCE_KM}km de los hospitales existentes.`);
          setIsAnalyzing(false);
          return;
        }

        const topSuggestions = selectedSuggestions;

        const suggestionBounds = L.latLngBounds(topSuggestions.map(s => s.center));

        topSuggestions.forEach((suggestion, index) => {
          L.marker(suggestion.center, {
            icon: L.divIcon({
              html: `⭐<div style="font-size: 10px; text-align: center; color: black; font-weight: bold;">${index + 1}</div>`,
              className: 'suggestion-icon',
              iconSize: [30, 30]
            })
          })
            .bindPopup(`
            <b>${suggestion.name}</b><br/>
            Índice NH_i: ${suggestion.score.toFixed(2)}<br/>
            Población: ${suggestion.population}<br/>
            Hospitales accesibles: ${suggestion.accessibleHospitals}<br/>
            Ranking: ${index + 1}
          `)
            .addTo(suggestionsLayerRef.current!);
        });

        if (suggestionBounds.isValid()) {
          map.fitBounds(suggestionBounds, { padding: [50, 50] });
        }

        setSuggestionResults(topSuggestions);
        setIsAnalyzing(false);

      } catch (error) {
        console.error("Error in analysis:", error);
        setIsAnalyzing(false);
        alert("Error en el análisis. Por favor intenta de nuevo.");
      }
    }, 100);
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

        {/* Panel de control */}
        <div className="absolute top-4 right-4 z-[1000] bg-white p-4 rounded shadow-lg space-y-4 max-h-[95vh] overflow-y-auto min-w-[300px]">
          {/* Selector de Estado */}
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
                </div>
              </div>

              <div>
                <h3 className="font-bold mb-2">Análisis de Ubicaciones</h3>
                <div className="p-2 border rounded-md space-y-3">
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
                    {isAnalyzing ? "Analizando..." : "Encontrar Ubicaciones Óptimas"}
                  </Button>
                </div>

                {suggestionResults.length > 0 && (
                  <div className="p-2 border rounded-md mt-4">
                    <h4 className="font-bold mb-2">Ubicaciones Sugeridas en {selectedState}:</h4>
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
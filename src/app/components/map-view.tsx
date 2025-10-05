'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// --- ESTILOS ---
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet-measure/dist/leaflet-measure.css';

// --- TIPOS ---
// Usamos 'import type' para que TypeScript sepa los tipos, pero no se incluye en el código final
type LeafletMap = import('leaflet').Map;
type MarkerClusterGroup = import('leaflet').MarkerClusterGroup;
type DivIcon = import('leaflet').DivIcon;
type FeatureGroup = import('leaflet').FeatureGroup;
type MeasureControl = any;

type HospitalData = {
  id: string; lat: number; lng: number; name: string; source: string;
};

// --- Función de Ayuda para los Colores de Densidad de Clústers ---
const getDensityColor = (count: number): string => {
  if (count < 50) return '#28a745';
  if (count < 100) return '#ffc107';
  return '#dc3545';
};

export function MapPlaceholder() {
  const mapRef = useRef<LeafletMap | null>(null);
  const markersClusterRef = useRef<MarkerClusterGroup | null>(null);
  const heatmapLayerRef = useRef<any | null>(null);
  const measureControlRef = useRef<MeasureControl | null>(null);
  const suggestionsLayerRef = useRef<FeatureGroup | null>(null);

  const [isAddingMode, setIsAddingMode] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isHeatmapVisible, setIsHeatmapVisible] = useState(false);
  const [areHospitalsVisible, setAreHospitalsVisible] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [numSuggestions, setNumSuggestions] = useState(5);
  const [loadingMessage, setLoadingMessage] = useState("Cargando mapa...");

  useEffect(() => {
    if (mapRef.current) return;

    const initMap = async () => {
      // 'L' se importa aquí, solo en el lado del cliente
      const L = (await import('leaflet')).default;
      await import('leaflet.markercluster');
      await import('leaflet.heat');
      await import('leaflet-measure');
      
      const mapContainer = document.getElementById('map');
      if (mapContainer && !(mapContainer as any)._leaflet_id) {
        
        const map = L.map('map').setView([20.669455, -103.372421], 13);
        mapRef.current = map;
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

        markersClusterRef.current = L.markerClusterGroup({
          showCoverageOnHover: true,
          iconCreateFunction: (cluster) => {
            const count = cluster.getChildCount();
            const color = getDensityColor(count);
            cluster.options.polygonOptions = { color, fillColor: color };
            return L.divIcon({
              html: `<div class="cluster-icon" style="background-color: ${color};">${count}</div>`,
              className: 'custom-cluster', iconSize: L.point(40, 40)
            });
          }
        });
        map.addLayer(markersClusterRef.current);
        
        suggestionsLayerRef.current = L.featureGroup().addTo(map);
        
        measureControlRef.current = new (L.Control as any).Measure({
          primaryLengthUnit: 'meters', secondaryLengthUnit: 'kilometers',
          primaryAreaUnit: 'sqmeters', secondaryAreaUnit: undefined,
          localization: 'es', activeColor: '#FF6B6B', completedColor: '#C92A2A'
        });

        const fetchHospitals = async () => {
          setLoadingMessage("Cargando hospitales...");
          const hospitalIconFinales = L.icon({ iconUrl: '/hotlinking.png', iconSize: [35, 35], iconAnchor: [17, 35] });
          const hospitalIconLimpios = L.icon({ iconUrl: '/hotlinking2.png', iconSize: [35, 35], iconAnchor: [17, 35] });
          const createMarker = (hospital: HospitalData) => {
              const icon = hospital.source === 'finales' ? hospitalIconFinales : hospitalIconLimpios;
              return L.marker([hospital.lat, hospital.lng], { icon }).bindPopup(`<b>${hospital.name}</b>`);
          };
          
          const finalesPromise = fetch('/datos_finales.json').then(res => res.json())
              .then(data => data.filter((h: any) => h.LATITUD != null && h.LONGITUD != null).map((h: any, i: number) => ({ id: `finales-${i}`, lat: Number(h.LATITUD), lng: Number(h.LONGITUD), name: h["NOMBRE DE LA UNIDAD"] || 'Hospital (Finales)', source: 'finales' } as HospitalData)));
          
          const limpiosPromise = fetch('/datos_limpios.json').then(res => res.json())
              .then(data => data.filter((h: any) => h.LATITUD != null && h.LONGITUD != null).map((h: any, i: number) => ({ id: `limpios-${i}`, lat: Number(h.LATITUD), lng: Number(h.LONGITUD), name: h["NOMBRE DE LA UNIDAD"] || 'Hospital (Limpios)', source: 'limpios' } as HospitalData)));

          const [hospitalesFinales, hospitalesLimpios] = await Promise.all([finalesPromise, limpiosPromise]);
          const allHospitals = [...hospitalesFinales, ...hospitalesLimpios];

          markersClusterRef.current?.addLayers(allHospitals.map(createMarker));
          const heatData = allHospitals.map(h => [h.lat, h.lng, 1.0]);
          heatmapLayerRef.current = (L as any).heatLayer(heatData, {
              radius: 25, blur: 15, maxZoom: 17, gradient: {0.4: 'blue', 0.65: 'lime', 1: 'red'}
          });
        };

        await fetchHospitals();
        setLoadingMessage("");
        setIsMapReady(true);
      }
    };
    initMap();
    return () => { mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;
    
    // Accedemos a L a través del objeto window, ya que sabemos que está cargado
    const L = (window as any).L;
    if (!L) return;

    const createDynamicHospitalIcon = (color: string): DivIcon => L.divIcon({
        html: `<div class="hospital-div-icon" style="background-color: ${color};"></div>`,
        className: 'custom-div-icon-container', iconSize: [35, 35], iconAnchor: [17, 35],
    });

    if (isAddingMode) {
      map.getContainer().style.cursor = 'crosshair';
      map.once('click', (e) => {
        const { lat, lng } = e.latlng;
        const hospitalName = prompt("Nombre del nuevo hospital:", "Nuevo Hospital");
        if (hospitalName) { 
            const currentMarkerCount = markersClusterRef.current?.getLayers().length || 0;
            const newIconColor = getDensityColor(currentMarkerCount);
            const dynamicIcon = createDynamicHospitalIcon(newIconColor);
            const newHospital: HospitalData = { id: `user-${Date.now()}`, lat, lng, name: hospitalName, source: 'user' };
            const marker = L.marker([lat, lng], { icon: dynamicIcon }).bindPopup(`<b>${newHospital.name}</b>`);
            markersClusterRef.current?.addLayer(marker);
        }
        setIsAddingMode(false); 
      });
    } else {
      map.getContainer().style.cursor = '';
      map.off('click');
    }
    return () => { if (map) { map.getContainer().style.cursor = ''; map.off('click'); } };
  }, [isAddingMode, isMapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !markersClusterRef.current || !heatmapLayerRef.current) return;
    if (!areHospitalsVisible) {
      if (map.hasLayer(markersClusterRef.current)) map.removeLayer(markersClusterRef.current);
      if (map.hasLayer(heatmapLayerRef.current)) map.removeLayer(heatmapLayerRef.current);
      return;
    }
    if (isHeatmapVisible) {
      if (map.hasLayer(markersClusterRef.current)) map.removeLayer(markersClusterRef.current);
      if (!map.hasLayer(heatmapLayerRef.current)) map.addLayer(heatmapLayerRef.current);
    } else {
      if (map.hasLayer(heatmapLayerRef.current)) map.removeLayer(heatmapLayerRef.current);
      if (!map.hasLayer(markersClusterRef.current)) map.addLayer(markersClusterRef.current);
    }
  }, [areHospitalsVisible, isHeatmapVisible, isMapReady]);
  
  const toggleMeasureTool = () => {
    const map = mapRef.current;
    const measureControl = measureControlRef.current;
    if (!map || !measureControl) return;
    if (measureControl._map) {
      measureControl.remove();
    } else {
      measureControl.addTo(map);
    }
  };

  const findOptimalLocations = () => {
    const L = (window as any).L;
    if (!mapRef.current || !markersClusterRef.current || !L) return;
    setIsAnalyzing(true);
    suggestionsLayerRef.current?.clearLayers();

    setTimeout(() => {
        const map = mapRef.current!;
        const allHospitals = markersClusterRef.current!.getLayers() as import('leaflet').Marker[];
        const hospitalLatLngs = allHospitals.map(marker => marker.getLatLng());

        if (hospitalLatLngs.length === 0) {
            alert("No hay hospitales cargados para realizar el análisis.");
            setIsAnalyzing(false);
            return;
        }

        const avgLat = hospitalLatLngs.reduce((sum, p) => sum + p.lat, 0) / hospitalLatLngs.length;
        const avgLng = hospitalLatLngs.reduce((sum, p) => sum + p.lng, 0) / hospitalLatLngs.length;
        const cityCenter = L.latLng(avgLat, avgLng);
        const maxDistanceFromCenter = 10000; // 10 km de radio

        const bounds = map.getBounds();
        const gridSize = 70;
        const stepLat = (bounds.getNorth() - bounds.getSouth()) / gridSize;
        const stepLng = (bounds.getEast() - bounds.getWest()) / gridSize;
        let candidatePoints = [];

        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                const point = L.latLng(bounds.getSouth() + stepLat * (i + 0.5), bounds.getWest() + stepLng * (j + 0.5));
                if (point.distanceTo(cityCenter) > maxDistanceFromCenter) continue;
                let minDistance = Infinity;
                hospitalLatLngs.forEach(h => {
                    const distance = point.distanceTo(h);
                    if (distance < minDistance) minDistance = distance;
                });
                candidatePoints.push({ point, score: minDistance });
            }
        }
        
        const topSuggestions = [];
        const exclusionRadius = 2500; // 2.5 km

        for (let i = 0; i < numSuggestions; i++) {
            if (candidatePoints.length === 0) break;
            candidatePoints.sort((a, b) => b.score - a.score);
            const bestCandidate = candidatePoints[0];
            topSuggestions.push(bestCandidate);
            candidatePoints = candidatePoints.filter(p => p.point.distanceTo(bestCandidate.point) > exclusionRadius);
        }
        
        if (topSuggestions.length === 0) {
            alert("No se encontraron ubicaciones adecuadas en esta vista. Prueba haciendo zoom out.");
            setIsAnalyzing(false);
            return;
        }

        const suggestionIcon = L.divIcon({ html: `⭐`, className: 'suggestion-icon' });
        const suggestionBounds = L.latLngBounds(topSuggestions.map(s => s.point));

        topSuggestions.forEach(suggestion => {
            L.marker(suggestion.point, { icon: suggestionIcon })
              .bindPopup(`<b>Ubicación Sugerida</b><br/>Distancia al hospital más cercano: ${(suggestion.score / 1000).toFixed(2)} km`)
              .addTo(suggestionsLayerRef.current!);
        });

        map.fitBounds(suggestionBounds, { padding: [50, 50] });
        setIsAnalyzing(false);
    }, 100);
  };

  return (
    <Card className="w-full h-[100vh]">
      <CardContent className="p-0 h-full w-full relative">
        <div id="map" className="w-full h-full bg-gray-200" />
        <div className="absolute top-4 right-4 z-[1000] bg-white p-4 rounded shadow-lg space-y-4 max-h-[95vh] overflow-y-auto">
          <div>
            <h3 className="font-bold mb-2">Vistas</h3>
            <div className="flex flex-col space-y-2">
                <Button onClick={() => setAreHospitalsVisible(!areHospitalsVisible)} variant="outline" className="w-full">
                  {areHospitalsVisible ? "Ocultar Hospitales" : "Mostrar Hospitales"}
                </Button>
                <Button onClick={() => setIsHeatmapVisible(!isHeatmapVisible)} variant="outline" className="w-full" disabled={!areHospitalsVisible}>
                  {isHeatmapVisible ? "Ver como Puntos" : "Ver como Calor"}
                </Button>
            </div>
          </div>
          <div>
            <h3 className="font-bold mb-2">Análisis y Herramientas</h3>
            <div className="p-2 border rounded-md space-y-3">
                <div className="space-y-2">
                  <label className="font-semibold text-sm">No. de Sugerencias:</label>
                  <Input type="number" value={numSuggestions} onChange={(e) => setNumSuggestions(parseInt(e.target.value, 10))} min="1" max="20" />
                </div>
                <Button onClick={findOptimalLocations} disabled={isAnalyzing || !areHospitalsVisible} className="w-full">
                  {isAnalyzing ? "Analizando..." : "Sugerir Ubicaciones"}
                </Button>
            </div>
            <div className="flex flex-col space-y-2 mt-4">
              <Button onClick={() => setIsAddingMode(!isAddingMode)} disabled={isAnalyzing || !areHospitalsVisible || isHeatmapVisible}>
                {isAddingMode ? "Cancelar" : "Añadir Hospital"}
              </Button>
              <Button onClick={toggleMeasureTool} variant="outline" disabled={isAnalyzing || !isMapReady}>
                Medir Distancia
              </Button>
            </div>
          </div>
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
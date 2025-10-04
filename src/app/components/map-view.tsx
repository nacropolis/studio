'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';

export function MapPlaceholder() {
  const [selectedOption, setSelectedOption] = useState("option1");

  const handleRadioChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedOption(event.target.value);
  };

  useEffect(() => {
    // Evitar inicializar el mapa dos veces
    const existingMap = L.DomUtil.get('map');
    if (existingMap && existingMap._leaflet_id) {
      existingMap._leaflet_id = null;
    }

    const map = L.map('map').setView([20.669455, -103.372421], 13);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    // Círculo inicial
    

    // Marcador y círculo dinámico
    const marker = L.marker();
    const radius = L.circle();

    function circlesTouch(circle1: any, circle2: any) {
      const latlng1 = circle1.getLatLng();
      const latlng2 = circle2.getLatLng();
      const distance = map.distance(latlng1, latlng2);
      const sumRadii = circle1.getRadius() + circle2.getRadius();
      return distance <= sumRadii;
    }

    function onMapClick(e: any) {
      marker
        .setLatLng(e.latlng)
        .addTo(map)
        .bindPopup(`Click en: ${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`)
        .openPopup();

      radius.setLatLng(e.latlng).setRadius(500).addTo(map);

      if (circlesTouch(radius, circle)) {
        radius.setStyle({ fillColor: 'red' });
      } else {
        radius.setStyle({ fillColor: '#3388ff' });
      }
    }

    map.on('click', onMapClick);

    // ---- ICONOS HOSPITAL ----
    const hospitalIcon = L.icon({
      iconUrl: '/hotlinking.png', // tu icono para Overpass
      iconSize: [50, 50],
      iconAnchor: [25, 50],
      popupAnchor: [0, -50],
    });

    const hospitalIcon2 = L.icon({
      iconUrl: '/hotlinking2.png', // tu icono para JSON
      iconSize: [50, 50],
      iconAnchor: [25, 50],
      popupAnchor: [0, -50],
    });

    // ---- MARKER CLUSTER ----
    const markersCluster = L.markerClusterGroup({
      disableClusteringAtZoom: 15,
      chunkedLoading: true,
    });

    // ---- FUNCION PARA OBTENER HOSPITALES DE OVERPASS ----
    const fetchHospitals = async () => {
      try {
        const query = `
          [out:json];
          area["name"="Guadalajara"]->.a;
          node["amenity"="hospital"](area.a);
          out;
        `;
        const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
        const res = await fetch(url);
        const data = await res.json();

        data.elements.forEach((el: any) => {
          const name = el.tags?.name || 'Hospital';
          const lat = el.lat;
          const lng = el.lon;
          if (lat != null && lng != null) {
            const m = L.marker([lat, lng], { icon: hospitalIcon }).bindPopup(`<b>${name}</b>`);
            markersCluster.addLayer(m);
          }
        });

        map.addLayer(markersCluster);
      } catch (error) {
        console.error('Error cargando hospitales:', error);
      }
    };

    fetchHospitals();

    // ---- FUNCION PARA OBTENER HOSPITALES DESDE JSON ----
    const jsonHospitals = async () => {
      try {
        const res = await fetch('/datos_finales.json');
        if (!res.ok) throw new Error('No se pudo cargar el archivo JSON');
        const data = await res.json();

        data.forEach((hospital: any) => {
          const lat = hospital.lat;
          const lng = hospital.lon;
          const name = hospital.name || 'Hospital';

          if (lat != null && lng != null) {
            const m = L.marker([lat, lng], { icon: hospitalIcon2 }).bindPopup(`<b>${name}</b>`);
            markersCluster.addLayer(m);
          } else {
            console.warn('Hospital sin coordenadas:', hospital);
          }
        });

        map.addLayer(markersCluster);
      } catch (error) {
        console.error('Error cargando hospitales desde JSON:', error);
      }
    };

    jsonHospitals();

    // Limpieza al desmontar
    return () => {
      map.off();
      map.remove();
    };
  }, []);

  return (
    <Card className="w-full h-[100vh] relative">
      <CardContent className="p-0 h-full w-full">
        <div id="map" className="w-full h-full z-0" />

        <div className="absolute top-0 right-0 w-[300px] h-1/2 bg-white shadow-lg p-4 z-[1000] overflow-y-auto">
          <h1 className="text-xl font-bold mb-2">Opciones</h1>
          <input
            type="radio"
            name="option"
            value="option1"
            checked={selectedOption === "option1"}
            onChange={handleRadioChange}
          />
          <label className="ml-3">Opción 1</label><br />
          <input
            type="radio"
            name="option"
            value="option2"
            checked={selectedOption === "option2"}
            onChange={handleRadioChange}
          />
          <label className="ml-3">Opción 2</label>
        </div>
      </CardContent>
    </Card>
  );
}

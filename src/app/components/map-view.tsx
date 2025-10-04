'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export function MapPlaceholder() {
  const [selectedOption, setSelectedOption] = useState("option1");

  const handleRadioChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedOption(event.target.value);
  };
  useEffect(() => {
    // Asegúrate de que el mapa no se inicialice dos veces
    const existingMap = L.DomUtil.get('map');
    if (existingMap && existingMap._leaflet_id) {
      existingMap._leaflet_id = null;
    }

    // Crear mapa centrado en Guadalajara
    const map = L.map('map').setView([20.669455, -103.372421], 13);

    // Capa base (OpenStreetMap)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    // Círculo inicial
    const circle = L.circle([20.669455, -103.372421], {
      color: 'red',
      fillColor: '#f03',
      fillOpacity: 0.5,
      radius: 500,
    }).addTo(map);

    // Marcador y círculo dinámico
    const marker = L.marker();
    const radius = L.circle();

    // Función para detectar si dos círculos se tocan
    function circlesTouch(circle1: { getLatLng: () => any; getRadius: () => any; }, circle2: { getLatLng: () => any; getRadius: () => any; }) {
      const latlng1 = circle1.getLatLng();
      const latlng2 = circle2.getLatLng();
      const distance = map.distance(latlng1, latlng2);
      const sumRadii = circle1.getRadius() + circle2.getRadius();
      return distance <= sumRadii;
    }

    // Evento click en el mapa
    function onMapClick(e: { latlng: { lat: number; lng: number; }; }) {
      marker
        .setLatLng(e.latlng)
        .addTo(map)
        .bindPopup(`Click en: ${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`)
        .openPopup();

      radius.setLatLng(e.latlng).setRadius(500).addTo(map);

      // Verificar si se tocan
      if (circlesTouch(radius, circle)) {
        radius.setStyle({ fillColor: 'red' });
      } else {
        radius.setStyle({ fillColor: '#3388ff' });
      }
    }

    map.on('click', onMapClick);

    // Limpieza al desmontar el componente
    return () => {
      map.off();
      map.remove();
    };
  }, []);

  return (
    <Card className="w-full h-[100vh] relative">
      <CardContent className="p-0 h-full w-full">
        {/* Contenedor del mapa */}
        <div id="map" className="w-full h-full z-0" />

        {/* Sidebar flotante */}
        <div className="absolute top-0 right-0 w-[300px] h-50% bg-white shadow-lg p-4 z-[1000] overflow-y-auto">
          <h1 className="text-xl font-bold mb-2">Opciones</h1>
          <input
            type="radio"
            name="option"
            value="option1"
            checked={selectedOption === "option1"}
            onChange={handleRadioChange}
          />
          <label className="ml-3">Opción 1</label>
          <input
            type="radio"
            name="option"
            value="option2"
            checked={selectedOption === "option2"}
            onChange={handleRadioChange}
          />
          <label className="ml-3">Opción 2</label>
          {/* Puedes agregar más opciones si lo deseas */}
        </div>
      </CardContent>
    </Card>
  );
}

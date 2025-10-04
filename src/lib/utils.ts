import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Coordinates } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function haversineDistance(coords1: Coordinates, coords2: Coordinates): number {
  const toRad = (x: number) => (x * Math.PI) / 180;

  const R = 6371; // Earth radius in kilometers

  const dLat = toRad(coords2.lat - coords1.lat);
  const dLon = toRad(coords2.lng - coords1.lng);
  const lat1 = toRad(coords1.lat);
  const lat2 = toRad(coords2.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c; // Distance in kilometers
}

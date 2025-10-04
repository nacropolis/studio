import UrbanBeeClient from './components/urban-bee-client';
import { processData } from '@/lib/data';

export default async function Home() {
  const { zones, hospitals } = await processData();
  
  return <UrbanBeeClient initialZones={zones} initialHospitals={hospitals} />;
}

import UrbanBeeClient from './components/urban-bee-client';
import { processData } from '@/lib/data';
import dynamic from 'next/dynamic';

const DynamicUrbanBeeClient = dynamic(() => import('./components/urban-bee-client'), { ssr: false });

export default async function Home() {
  const { zones, hospitals } = await processData();
  
  return <DynamicUrbanBeeClient initialZones={zones} initialHospitals={hospitals} />;
}

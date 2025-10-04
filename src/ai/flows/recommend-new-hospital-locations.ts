'use server';

/**
 * @fileOverview An AI agent that recommends new hospital locations based on demographic data.
 *
 * - recommendNewHospitalLocations - A function that handles the recommendation process.
 * - RecommendNewHospitalLocationsInput - The input type for the recommendNewHospitalLocations function.
 * - RecommendNewHospitalLocationsOutput - The return type for the recommendNewHospitalLocations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RecommendNewHospitalLocationsInputSchema = z.object({
  urbanZoneData: z.string().describe('JSON string of urban zone data containing population, deprivation index, and hospital distance.'),
  priorityThreshold: z.number().describe('The minimum priority score for recommending a new hospital location (e.g., 0.6).'),
});
export type RecommendNewHospitalLocationsInput = z.infer<typeof RecommendNewHospitalLocationsInputSchema>;

const RecommendationSchema = z.object({
  location: z.string().describe('The recommended location for a new hospital.'),
  reason: z.string().describe('The reason for recommending this location.'),
});

const RecommendNewHospitalLocationsOutputSchema = z.array(RecommendationSchema);
export type RecommendNewHospitalLocationsOutput = z.infer<typeof RecommendNewHospitalLocationsOutputSchema>;

export async function recommendNewHospitalLocations(
  input: RecommendNewHospitalLocationsInput
): Promise<RecommendNewHospitalLocationsOutput> {
  return recommendNewHospitalLocationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'recommendNewHospitalLocationsPrompt',
  input: {schema: RecommendNewHospitalLocationsInputSchema},
  output: {schema: RecommendNewHospitalLocationsOutputSchema},
  prompt: `You are an urban planning expert tasked with recommending locations for new hospitals.

Analyze the following urban zone data, considering population, deprivation index, and hospital distance, to identify optimal locations for new hospitals. Only recommend locations where the priority score exceeds the given threshold. The priority score is (population / max_population) * marginacion_index * (hospital_distance / max_distance).

Urban Zone Data: {{{urbanZoneData}}}
Priority Threshold: {{{priorityThreshold}}}

Format your output as a JSON array of recommendations, including the location and a brief explanation for each recommendation.
`,
});

const recommendNewHospitalLocationsFlow = ai.defineFlow(
  {
    name: 'recommendNewHospitalLocationsFlow',
    inputSchema: RecommendNewHospitalLocationsInputSchema,
    outputSchema: RecommendNewHospitalLocationsOutputSchema,
  },
  async input => {
    try {
      const {output} = await prompt(input);
      return output!;
    } catch (error) {
      console.error('Error in recommendNewHospitalLocationsFlow:', error);
      return [];
    }
  }
);

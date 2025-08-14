'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting search queries based on vehicle information.
 *
 * - suggestSearchQueries - A function that takes vehicle information (make, model, year) and returns suggested search queries.
 * - SuggestSearchQueriesInput - The input type for the suggestSearchQueries function.
 * - SuggestSearchQueriesOutput - The return type for the suggestSearchQueries function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestSearchQueriesInputSchema = z.object({
  make: z.string().describe('The make of the vehicle.'),
  model: z.string().describe('The model of the vehicle.'),
  year: z.string().describe('The year of the vehicle.'),
});
export type SuggestSearchQueriesInput = z.infer<typeof SuggestSearchQueriesInputSchema>;

const SuggestSearchQueriesOutputSchema = z.object({
  suggestions: z.array(z.string()).describe('An array of suggested search queries.'),
});
export type SuggestSearchQueriesOutput = z.infer<typeof SuggestSearchQueriesOutputSchema>;

export async function suggestSearchQueries(input: SuggestSearchQueriesInput): Promise<SuggestSearchQueriesOutput> {
  return suggestSearchQueriesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestSearchQueriesPrompt',
  input: {schema: SuggestSearchQueriesInputSchema},
  output: {schema: SuggestSearchQueriesOutputSchema},
  prompt: `You are an AI assistant that suggests search queries based on vehicle information.

  Given the following vehicle information, suggest three relevant search queries that a user might want to use to find more information about the vehicle.

  Make: {{{make}}}
  Model: {{{model}}}
  Year: {{{year}}}

  Suggestions:`,
});

const suggestSearchQueriesFlow = ai.defineFlow(
  {
    name: 'suggestSearchQueriesFlow',
    inputSchema: SuggestSearchQueriesInputSchema,
    outputSchema: SuggestSearchQueriesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

import { genkit } from 'genkit';
import { openAI } from '@genkit/openai';

export const ai = genkit({
  plugins: [
    openAI(),
  ],
  // Assicurati che la variabile d'ambiente OPENAI_API_KEY sia impostata!
});

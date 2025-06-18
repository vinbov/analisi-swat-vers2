
import Link from 'next/link';

export function AppHeader() {
  return (
    <header className="mb-8 text-center flex flex-col items-center">
      <h1 className="text-4xl md:text-5xl font-bold" style={{ color: 'hsl(var(--sky-700))' }}>
        ANALISI S.W.A.T. (Strengths, Weaknesses, Approaches, Tactics) Punti di forza, debolezze, approcci, tattiche
      </h1>
    </header>
  );
}

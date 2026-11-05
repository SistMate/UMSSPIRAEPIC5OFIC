import type { Metadata } from 'next';
import { Suspense } from 'react';
import AffinityResultsClient from './AffinityResultsClient';

export const metadata: Metadata = {
  title: 'Resultados de afinidad | UMSSPIRA',
};

export default function AffinityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main
          role="status"
          aria-busy="true"
          className="min-h-[calc(100vh-84px)] bg-[#f5f2ec] px-5 py-8 text-sm text-[#617184] sm:px-8"
        >
          Cargando resultados de afinidad…
        </main>
      }
    >
      <AffinityResultsPage params={params} />
    </Suspense>
  );
}

async function AffinityResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AffinityResultsClient id={id} />;
}

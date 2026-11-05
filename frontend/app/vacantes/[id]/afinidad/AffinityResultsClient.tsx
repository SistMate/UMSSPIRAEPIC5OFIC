'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BriefcaseBusiness, CheckCircle2, CircleAlert } from 'lucide-react';
import { readProfileSkills } from '../../comparison-data';
import { AffinityScore } from '../../components/AffinityScore';
import {
  calculateLocalAffinity,
  type LocalAffinityResult,
} from '../../../../lib/vacancies/local-affinity';
import {
  getVacancy,
  isVacancyAvailable,
  type Vacancy,
} from '../../../../lib/api/vacantes';
import PortalFooter from '../../../components/PortalFooter';
import { findVacancy as findLocalVacancy } from '../../vacancy-data';
import { mapLocalVacancy } from '../../vacancy-adapter';

type ResultState =
  | { id: string; status: 'loading' }
  | { id: string; status: 'error'; message: string }
  | { id: string; status: 'unavailable'; vacancy: Vacancy }
  | {
      id: string;
      status: 'ready';
      vacancy: Vacancy;
      skillCount: number;
      affinity: LocalAffinityResult;
    };

export default function AffinityResultsClient({ id }: { id: string }) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<ResultState>({
    id,
    status: 'loading',
  });
  const detailHref = `/vacantes/${encodeURIComponent(id)}`;

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const skills = readProfileSkills();
        const localVacancy = findLocalVacancy(id);
        const vacancy = localVacancy
          ? mapLocalVacancy(localVacancy)
          : await getVacancy(id);
        if (vacancy.id !== id) {
          throw new Error('El backend devolvió una vacante distinta a la solicitada.');
        }

        if (!isVacancyAvailable(vacancy.estado)) {
          if (active) setResult({ id, status: 'unavailable', vacancy });
          return;
        }

        const affinity = calculateLocalAffinity(
          vacancy.requisitos.map((requirement) => requirement.nombre),
          skills,
        );

        if (active) {
          setResult({
            id,
            status: 'ready',
            vacancy,
            skillCount: skills.length,
            affinity,
          });
        }
      } catch (error: unknown) {
        if (active) {
          setResult({
            id,
            status: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'No se pudo calcular el porcentaje de afinidad.',
          });
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [attempt, id]);

  const currentResult = result.id === id ? result : { id, status: 'loading' as const };

  return (
    <div className="flex min-h-[calc(100vh-84px)] flex-col bg-[#f5f2ec]">
      <main className="w-full flex-1 px-5 py-8 text-[#142237] sm:px-8">
      <div className="mx-auto max-w-[1120px]">
        <Link
          href={detailHref}
          className="mb-6 inline-flex min-h-10 items-center gap-2 rounded-md border border-[#d9d0c3] bg-white px-4 text-xs font-semibold hover:bg-[#fcfaf6]"
        >
          <ArrowLeft size={15} aria-hidden="true" />
          Volver al detalle
        </Link>

        <h1 className="font-serif text-3xl font-bold">Resultados de afinidad</h1>
        <p className="mt-2 text-sm text-[#617184]">
          Revisa cómo coinciden tus habilidades guardadas con los requisitos de
          esta oportunidad.
        </p>

        {currentResult.status === 'loading' ? (
          <section
            role="status"
            aria-busy="true"
            className="mt-6 animate-pulse rounded-lg border border-[#d9d0c3] bg-white p-8 text-sm text-[#617184]"
          >
            Cargando vacante y calculando el porcentaje de afinidad…
          </section>
        ) : currentResult.status === 'error' ? (
          <section
            role="alert"
            className="mt-6 rounded-lg border border-[#e6c6ba] bg-white p-8"
          >
            <h2 className="text-lg font-bold">No se pudo obtener el resultado</h2>
            <p className="mt-2 text-sm text-[#617184]">{currentResult.message}</p>
            <button
              type="button"
              onClick={() => {
                setResult({ id, status: 'loading' });
                setAttempt((value) => value + 1);
              }}
              className="mt-5 min-h-10 rounded-md bg-[#ffb162] px-4 text-xs font-semibold hover:bg-[#f6a34f]"
            >
              Reintentar
            </button>
          </section>
        ) : currentResult.status === 'unavailable' ? (
          <section
            role="alert"
            className="mt-6 rounded-lg border border-[#e6c6ba] bg-white p-8"
          >
            <h2 className="text-lg font-bold">Vacante no disponible</h2>
            <p className="mt-2 text-sm text-[#617184]">
              {currentResult.vacancy.titulo} ya no está disponible para esta
              consulta.
            </p>
          </section>
        ) : (
          <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)]">
            <div>
              <section className="rounded-lg bg-[#192b37] p-5 text-white sm:p-7">
                <p className="flex items-center gap-2 text-xs font-semibold text-[#d9e0e4]">
                  <BriefcaseBusiness size={15} aria-hidden="true" />
                  {currentResult.vacancy.empresa} · {currentResult.vacancy.ubicacion}
                </p>
                <h2 className="mt-3 text-xl font-bold sm:text-2xl">
                  {currentResult.vacancy.titulo}
                </h2>
                <p className="mt-2 text-xs text-[#d9e0e4]">
                  {currentResult.vacancy.area} · {currentResult.vacancy.modalidad}
                </p>
              </section>

              <section className="mt-5 rounded-lg border border-[#d9d0c3] bg-white p-5 sm:p-6">
                <h2 className="text-base font-bold">Tu perfil frente a los requisitos</h2>
                {currentResult.skillCount === 0 && (
                  <p
                    role="status"
                    className="mt-4 rounded-md bg-[#fff0e1] p-4 text-sm text-[#8a4b27]"
                  >
                    No hay habilidades guardadas en este navegador. Agrega
                    habilidades antes de consultar el porcentaje.
                  </p>
                )}
                {currentResult.affinity.total === 0 && (
                  <p
                    role="status"
                    className="mt-4 rounded-md bg-[#fff0e1] p-4 text-sm text-[#8a4b27]"
                  >
                    Esta vacante no tiene requisitos registrados; no se puede
                    calcular un porcentaje.
                  </p>
                )}
                {currentResult.skillCount > 0 &&
                  currentResult.affinity.total > 0 && (
                    <ul className="mt-4 divide-y divide-[#e7dfd3]">
                      {currentResult.affinity.requirements.map((requirement, index) => (
                        <li
                          key={`${index}-${requirement.requirement}`}
                          className="flex flex-wrap items-start justify-between gap-3 py-3"
                        >
                          <div>
                            <p className="text-sm font-semibold">
                              {requirement.requirement}
                            </p>
                            <p className="mt-1 text-xs text-[#617184]">
                              {requirement.matched
                                ? `Habilidad coincidente: ${requirement.matchingSkills.join(', ')}`
                                : 'No se encontró una palabra coincidente en las habilidades guardadas.'}
                            </p>
                          </div>
                          {requirement.matched ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#e9f5ee] px-2.5 py-1 text-[11px] font-medium text-[#2f7a5d]">
                              <CheckCircle2 size={13} aria-hidden="true" />
                              Coincide
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#fff0e1] px-2.5 py-1 text-[11px] font-medium text-[#a8602d]">
                              <CircleAlert size={13} aria-hidden="true" />
                              No encontrada
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
              </section>
            </div>

            <aside className="space-y-4">
              <AffinityScore
                percentage={
                  currentResult.skillCount > 0
                    ? currentResult.affinity.percentage
                    : null
                }
                matched={currentResult.affinity.matched}
                total={currentResult.affinity.total}
                emptyMessage={
                  currentResult.affinity.total === 0
                    ? 'No existen requisitos para comparar.'
                    : 'Completa tus habilidades guardadas para obtener el porcentaje.'
                }
              />
              <section className="rounded-lg border border-[#e8d8c4] bg-[#fff9f0] p-5 text-xs leading-5 text-[#55565a]">
                <h2 className="font-semibold text-[#142237]">
                  Cómo se calcula
                </h2>
                <p className="mt-2">
                  Se cuenta un requisito como cumplido cuando al menos una
                  palabra coincide con alguna habilidad de tu perfil. El porcentaje es
                  100 × cumplidos / requisitos totales.
                </p>
                <p className="mt-2">
                  Se utilizan las habilidades guardadas en este navegador y los
                  requisitos registrados para esta vacante.
                </p>
              </section>
              <Link
                href={detailHref}
                className="inline-flex min-h-10 w-full items-center justify-center rounded-md border border-[#d9d0c3] bg-white px-4 text-xs font-semibold hover:bg-[#fcfaf6]"
              >
                Volver al detalle de la vacante
              </Link>
            </aside>
          </div>
        )}
      </div>
      </main>
      <PortalFooter />
    </div>
  );
}

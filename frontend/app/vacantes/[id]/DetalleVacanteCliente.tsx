'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  Clock3,
  MapPin,
  ArrowRight,
  Send,
} from 'lucide-react';
import PortalFooter from '../../components/PortalFooter';
import { AffinityScore } from '../components/AffinityScore';
import {
  getVacancy,
  getVacancyIdentifier,
  isVacancyAvailable,
  type Vacancy,
} from '../../../lib/api/vacantes';
import { calculateLocalAffinity } from '../../../lib/vacancies/local-affinity';
import type { Skill } from '../../skills/data';
import { readProfileSkills } from '../comparison-data';
import { findVacancy as findLocalVacancy } from '../vacancy-data';
import { mapLocalVacancy } from '../vacancy-adapter';

type Props = { id: string };

type VacancyLoadState =
  | { id: string; retryCount: number; status: 'loading' }
  | { id: string; retryCount: number; status: 'error'; message: string }
  | {
      id: string;
      retryCount: number;
      status: 'ready';
      vacancy: Vacancy;
    };

function getPublicationDate(createdAt: string | null) {
  if (!createdAt) return 'No especificada';
  const date = new Date(createdAt);
  return Number.isNaN(date.getTime())
    ? 'No especificada'
    : date.toLocaleDateString('es-BO', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
}

export default function DetalleVacanteCliente({ id }: Props) {
  const [retryCount, setRetryCount] = useState(0);
  const [vacancyLoadState, setVacancyLoadState] = useState<VacancyLoadState>({
    id,
    retryCount: 0,
    status: 'loading',
  });
  const [profileSkills, setProfileSkills] = useState<Skill[]>([]);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileError, setProfileError] = useState('');
  const currentLoadState =
    vacancyLoadState.id === id && vacancyLoadState.retryCount === retryCount
      ? vacancyLoadState
      : { id, retryCount, status: 'loading' as const };
  const loading = currentLoadState.status === 'loading';
  const error =
    currentLoadState.status === 'error' ? currentLoadState.message : '';
  const vacancy =
    currentLoadState.status === 'ready' ? currentLoadState.vacancy : null;

  useEffect(() => {
    let active = true;

    const loadVacancy = async () => {
      try {
        const localVacancy = findLocalVacancy(id);
        if (localVacancy) {
          if (active) {
            setVacancyLoadState({
              id,
              retryCount,
              status: 'ready',
              vacancy: mapLocalVacancy(localVacancy),
            });
          }
          return;
        }
      } catch {
        if (active) {
          setVacancyLoadState({
            id,
            retryCount,
            status: 'error',
            message: 'No se pudieron leer las vacantes guardadas en este navegador.',
          });
        }
        return;
      }

      try {
        const result = await getVacancy(id);
        if (active) {
          setVacancyLoadState({
            id,
            retryCount,
            status: 'ready',
            vacancy: result,
          });
        }
      } catch (requestError: unknown) {
        if (!active) return;
        setVacancyLoadState({
          id,
          retryCount,
          status: 'error',
          message:
            requestError instanceof Error
              ? requestError.message
              : 'No se pudo cargar la vacante.',
        });
      }
    };

    void loadVacancy();

    return () => {
      active = false;
    };
  }, [id, retryCount]);

  useEffect(() => {
    let active = true;
    void Promise.resolve()
      .then(() => readProfileSkills())
      .then((skills) => {
        if (!active) return;
        setProfileSkills(skills);
        setProfileError('');
        setProfileLoaded(true);
      })
      .catch(() => {
        if (!active) return;
        setProfileSkills([]);
        setProfileError(
          'No se pudieron leer las habilidades guardadas en este navegador.',
        );
        setProfileLoaded(true);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-84px)] flex-col bg-[#f5f2ec]">
        <main
          aria-busy="true"
          aria-label="Cargando detalle de la vacante"
          className="mx-auto w-full max-w-[1280px] flex-1 animate-pulse px-5 py-7 sm:px-8 lg:px-10"
        >
          <Link
            href="/vacantes"
            className="mb-5 inline-flex items-center gap-2 text-xs text-[#35556b]"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Volver a vacantes
          </Link>
          <div className="h-48 rounded-xl bg-[#192b37]" />
          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(260px,0.9fr)]">
            <div className="h-80 rounded-lg bg-white" />
            <div className="h-64 rounded-lg bg-white" />
          </div>
        </main>
        <PortalFooter />
      </div>
    );
  }

  if (error || !vacancy) {
    return (
      <div className="flex min-h-[calc(100vh-84px)] flex-col bg-[#f5f2ec]">
        <main className="mx-auto flex w-full max-w-[1280px] flex-1 items-start justify-center px-5 py-12 sm:px-8">
          <section
            role="alert"
            className="w-full max-w-3xl rounded-lg border border-[#d9d0c3] bg-white p-8 text-center"
          >
            <h1 className="text-2xl font-bold text-[#142237]">
              No se pudo cargar la vacante
            </h1>
            <p className="mt-2 text-sm text-[#617184]">
              {error || 'La vacante no existe o ya no está disponible.'}
            </p>
            <button
              type="button"
              onClick={() => setRetryCount((count) => count + 1)}
              className="mt-5 min-h-10 rounded-md bg-[#ffb162] px-4 text-sm font-semibold text-[#142237] hover:bg-[#f6a34f]"
            >
              Reintentar
            </button>
            <Link
              href="/vacantes"
              className="mt-5 ml-3 inline-flex items-center gap-2 rounded-md border border-[#d9d0c3] bg-white px-4 py-3 text-sm font-semibold text-[#142237] hover:bg-[#fcfaf6]"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Volver a vacantes
            </Link>
          </section>
        </main>
        <PortalFooter />
      </div>
    );
  }

  const identifier = getVacancyIdentifier(vacancy);
  const available = isVacancyAvailable(vacancy.estado);
  const affinity = calculateLocalAffinity(
    vacancy.requisitos.map((requirement) => requirement.nombre),
    profileSkills,
  );

  return (
    <div className="flex min-h-[calc(100vh-84px)] flex-col bg-[#f5f2ec]">
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-5 pb-8 pt-5 sm:px-8 lg:px-10">
        <nav
          aria-label="Ruta de navegación"
          className="mb-5 flex flex-wrap items-center gap-2 text-xs text-[#617184]"
        >
          <Link href="/vacantes" className="hover:text-[#142237]">
            Vacantes disponibles
          </Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="font-medium text-[#142237]">
            {vacancy.titulo}
          </span>
        </nav>

        {!available && (
          <p
            role="status"
            className="mb-4 rounded-md border border-[#e6c6ba] bg-white px-4 py-3 text-xs text-[#8a4b27]"
          >
            Esta vacante ya no está disponible para postular ni consultar su
            afinidad.
          </p>
        )}

        <section className="relative mb-5 overflow-hidden rounded-xl bg-[#192b37] px-5 py-6 text-white sm:px-8 sm:py-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-r from-[#0f172a] via-[#263b49] to-[#60717a] opacity-90"
          />
          <div className="relative z-10">
            <p className="flex items-center gap-2 text-xs font-semibold text-[#f5f2ec]">
              <Building2 size={14} aria-hidden="true" />
              {vacancy.empresa}
            </p>
            <h1 className="mt-3 max-w-3xl text-2xl font-bold leading-tight sm:text-3xl">
              {vacancy.titulo}
            </h1>
            <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#d9e0e4]">
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={14} aria-hidden="true" />
                {vacancy.ubicacion}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BriefcaseBusiness size={14} aria-hidden="true" />
                {vacancy.modalidad}
              </span>
            </p>
            <p className="mt-3 text-[11px] text-[#cbd5e1]">
              Código {identifier} · {vacancy.area}
            </p>
          </div>
        </section>

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(260px,0.9fr)]">
          <div className="space-y-4">
            <section className="rounded-lg border border-[#d9d0c3] bg-white p-5 sm:p-6">
              <h2 className="text-base font-bold text-[#142237]">
                Acerca del puesto
              </h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#617184]">
                {vacancy.descripcion || 'No se registró una descripción para esta vacante.'}
              </p>
            </section>

            <section className="rounded-lg border border-[#d9d0c3] bg-white p-5 sm:p-6">
              <h2 className="text-base font-bold text-[#142237]">
                Requisitos principales
              </h2>
              {vacancy.requisitos.length > 0 ? (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {vacancy.requisitos.map((requirement) => (
                    <li
                      key={requirement.id}
                      className="rounded-full bg-[#eaf0f7] px-3 py-1.5 text-xs font-semibold text-[#2c3b4d]"
                    >
                      {requirement.nombre}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-[#617184]">
                  No hay requisitos registrados para esta vacante.
                </p>
              )}
            </section>

            {vacancy.condiciones && (
              <section className="rounded-lg border border-[#d9d0c3] bg-white p-5 sm:p-6">
                <h2 className="text-base font-bold text-[#142237]">
                  Condiciones
                </h2>
                <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#617184]">
                  {vacancy.condiciones}
                </p>
              </section>
            )}
          </div>

          <aside className="space-y-4">
            <section className="rounded-lg border border-[#d9d0c3] bg-white p-5 sm:p-6">
                {profileLoaded ? (
                  profileError ? (
                    <p role="alert" className="text-sm text-[#a33f31]">
                      {profileError}
                    </p>
                  ) : (
                    <AffinityScore
                      percentage={
                        profileSkills.length > 0
                          ? affinity.percentage
                          : null
                      }
                      matched={affinity.matched}
                      total={affinity.total}
                      emptyMessage={
                        profileSkills.length === 0
                          ? 'No hay habilidades guardadas en este navegador.'
                          : 'Esta vacante no tiene requisitos registrados.'
                      }
                    />
                  )
                ) : (
                  <p role="status" className="text-sm text-[#617184]">
                    Cargando habilidades guardadas…
                  </p>
                )}
                {available && (
                  <Link
                    href={`/vacantes/${encodeURIComponent(vacancy.id)}/afinidad`}
                    className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-[#ffb162] px-4 text-xs font-semibold text-[#142237] hover:bg-[#f6a34f]"
                  >
                    Consultar resultado de afinidad
                    <ArrowRight size={13} aria-hidden="true" />
                  </Link>
                )}
            </section>
            <section className="rounded-lg border border-[#d9d0c3] bg-white p-5 sm:p-6">
              <h2 className="text-base font-bold text-[#142237]">
                Información de la oferta
              </h2>
              <dl className="mt-4 space-y-3">
                <div>
                  <dt className="text-[11px] text-[#8793a0]">Estado</dt>
                  <dd
                    className={`mt-1 text-xs font-semibold ${
                      available ? 'text-[#2f7a5d]' : 'text-[#a8602d]'
                    }`}
                  >
                    {vacancy.estado}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-[#8793a0]">Publicación</dt>
                  <dd className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-[#142237]">
                    <Clock3 size={13} aria-hidden="true" />
                    {getPublicationDate(vacancy.fechaCreacion)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-[#8793a0]">Empresa</dt>
                  <dd className="mt-1 text-xs font-semibold text-[#142237]">
                    {vacancy.empresa}
                  </dd>
                </div>
              </dl>
              <div className="mt-4 space-y-2 border-t border-[#e7dfd3] pt-4">
                {available && vacancy.idEmpresa !== 'local' && (
                  <Link
                    href={`/vacantes/${encodeURIComponent(vacancy.id)}/postular`}
                    className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-[#ffb162] px-4 text-xs font-semibold text-[#142237] hover:bg-[#f6a34f]"
                  >
                    <Send size={14} aria-hidden="true" />
                    Postular a la oferta
                  </Link>
                )}
                <Link
                  href="/vacantes"
                  className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-[#d9d0c3] bg-white px-4 text-xs font-medium text-[#142237] hover:bg-[#fcfaf6]"
                >
                  <ArrowLeft size={14} aria-hidden="true" />
                  Volver a vacantes
                </Link>
              </div>
            </section>
            <p className="rounded-md bg-[#fff0e1] px-4 py-3 text-[11px] leading-4 text-[#35556b]">
              Revisa los requisitos y condiciones de la oferta antes de
              postularte.
            </p>
          </aside>
        </div>
      </main>
      <PortalFooter />
    </div>
  );
}

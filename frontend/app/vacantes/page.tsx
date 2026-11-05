'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  MapPin,
  RefreshCw,
  Search,
  UserRound,
} from 'lucide-react';
import PortalFooter from '../components/PortalFooter';
import {
  configuredCompanyId,
  listVacancies,
  isVacancyAvailable,
  searchIndexedVacancies,
  type Vacancy,
} from '../../lib/api/vacantes';
import { readProfileSkills, SKILLS_STORAGE_KEY } from './comparison-data';
import {
  readSavedVacancies,
  VACANCIES_CHANGED_EVENT,
  VACANCIES_STORAGE_KEY,
} from './vacancy-data';
import { mapLocalVacancy } from './vacancy-adapter';
import { AffinityScore } from './components/AffinityScore';
import { calculateLocalAffinity } from '../../lib/vacancies/local-affinity';
import {
  filterVacanciesByAffinityCategory,
  sortVacanciesByAffinity,
} from '../../lib/vacancies/affinity-order';
import type { Skill } from '../skills/data';

const hasBackendCompany =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    configuredCompanyId,
  );

function getPublicationDate(vacancy: Vacancy) {
  if (!vacancy.fechaCreacion) return 'Sin fecha';
  const date = new Date(vacancy.fechaCreacion);
  return Number.isNaN(date.getTime())
    ? 'Sin fecha'
    : date.toLocaleDateString('es-BO', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
}

export default function VacantesPage() {
  const [remoteVacancies, setRemoteVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [profileRefreshCount, setProfileRefreshCount] = useState(0);
  const [profileSkills, setProfileSkills] = useState<Skill[]>([]);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [search, setSearch] = useState('');
  const [area, setArea] = useState('Todas');
  const [modality, setModality] = useState('Todas');
  const [location, setLocation] = useState('Todas');
  const [affinityView, setAffinityView] = useState<
    'desc' | 'asc' | 'recommended' | 'not-recommended'
  >('desc');

  const refreshProfile = useCallback(() => {
    setProfileLoaded(false);
    setProfileRefreshCount((count) => count + 1);
  }, []);
  const refreshVacancies = useCallback(() => {
    setLoading(true);
    setError('');
    setRemoteVacancies([]);
    setRetryCount((count) => count + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void Promise.allSettled([
      searchIndexedVacancies('', controller.signal),
      hasBackendCompany
        ? listVacancies(configuredCompanyId)
        : Promise.resolve([] as Vacancy[]),
    ]).then(([indexedResult, ownedResult]) => {
      if (controller.signal.aborted) return;

      const indexed =
        indexedResult.status === 'fulfilled' ? indexedResult.value : [];
      const owned =
        ownedResult.status === 'fulfilled' ? ownedResult.value : [];
      let local: Vacancy[] = [];

      try {
        local = readSavedVacancies().map(mapLocalVacancy);
      } catch {
        local = [];
      }

      const allRemoteSourcesFailed =
        indexedResult.status === 'rejected' &&
        (!hasBackendCompany || ownedResult.status === 'rejected');
      if (allRemoteSourcesFailed && local.length === 0) {
        const firstError =
          indexedResult.status === 'rejected'
            ? indexedResult.reason
            : ownedResult.status === 'rejected'
              ? ownedResult.reason
              : null;
        setError(
          firstError instanceof Error
            ? firstError.message
            : 'No se pudieron consultar las vacantes disponibles.',
        );
      } else {
        const uniqueVacancies = new Map<string, Vacancy>();
        [...indexed, ...owned, ...local].forEach((vacancy) => {
          if (isVacancyAvailable(vacancy.estado)) {
            uniqueVacancies.set(vacancy.id, vacancy);
          }
        });
        setRemoteVacancies(Array.from(uniqueVacancies.values()));
      }
      setLoading(false);
    });

    return () => controller.abort();
  }, [retryCount]);

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
  }, [profileRefreshCount]);

  const vacancies = remoteVacancies;

  const areas = useMemo(
    () => ['Todas', ...new Set(vacancies.map((vacancy) => vacancy.area))],
    [vacancies],
  );
  const modalities = useMemo(
    () => ['Todas', ...new Set(vacancies.map((vacancy) => vacancy.modalidad))],
    [vacancies],
  );
  const locations = useMemo(
    () => ['Todas', ...new Set(vacancies.map((vacancy) => vacancy.ubicacion))],
    [vacancies],
  );

  const affinities = useMemo(
    () =>
      new Map(
        vacancies.map((vacancy) => [
          vacancy.id,
          calculateLocalAffinity(
            vacancy.requisitos.map((requirement) => requirement.nombre),
            profileSkills,
          ),
        ]),
      ),
    [profileSkills, vacancies],
  );

  const getAffinityPercentage = useCallback(
    (vacancyId: string) => {
      if (!profileLoaded || profileError || profileSkills.length === 0) {
        return null;
      }
      return affinities.get(vacancyId)?.percentage ?? null;
    },
    [affinities, profileError, profileLoaded, profileSkills.length],
  );

  const filteredVacancies = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('es');

    const filtered = vacancies.filter((vacancy) => {
        const text = [
          vacancy.titulo,
          vacancy.empresa,
          vacancy.descripcion,
          vacancy.ubicacion,
          vacancy.area,
          vacancy.modalidad,
          ...vacancy.requisitos.map((requirement) => requirement.nombre),
        ]
          .join(' ')
          .toLocaleLowerCase('es');

        return (
          text.includes(normalizedSearch) &&
          (area === 'Todas' || vacancy.area === area) &&
          (modality === 'Todas' || vacancy.modalidad === modality) &&
          (location === 'Todas' || vacancy.ubicacion === location)
        );
      });

    const categorized =
      affinityView === 'recommended' || affinityView === 'not-recommended'
        ? filterVacanciesByAffinityCategory(
            filtered,
            getAffinityPercentage,
            affinityView,
          )
        : filtered;

    return sortVacanciesByAffinity(
      categorized,
      getAffinityPercentage,
      affinityView === 'asc' || affinityView === 'not-recommended'
        ? 'asc'
        : 'desc',
    );
  }, [
    area,
    affinityView,
    location,
    modality,
    search,
    vacancies,
    getAffinityPercentage,
  ]);

  const recommendedVacancyId = useMemo(() => {
    const [bestMatch] = sortVacanciesByAffinity(
      filteredVacancies,
      getAffinityPercentage,
      'desc',
    );
    if (!bestMatch) return null;
    const percentage = getAffinityPercentage(bestMatch.id);
    return percentage !== null && percentage > 50 ? bestMatch.id : null;
  }, [filteredVacancies, getAffinityPercentage]);

  const hasFilters =
    Boolean(search) ||
    area !== 'Todas' ||
    modality !== 'Todas' ||
    location !== 'Todas' ||
    affinityView !== 'desc';

  const clearFilters = () => {
    setSearch('');
    setArea('Todas');
    setModality('Todas');
    setLocation('Todas');
    setAffinityView('desc');
  };

  const retryLoadingVacancies = () => {
    refreshVacancies();
    refreshProfile();
  };

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === VACANCIES_STORAGE_KEY) {
        refreshVacancies();
      }
      if (event.key === null || event.key === SKILLS_STORAGE_KEY) {
        refreshProfile();
      }
    };
    const handleVacanciesChanged = () => {
      refreshVacancies();
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refreshProfile();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener(VACANCIES_CHANGED_EVENT, handleVacanciesChanged);
    window.addEventListener('focus', refreshProfile);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(VACANCIES_CHANGED_EVENT, handleVacanciesChanged);
      window.removeEventListener('focus', refreshProfile);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refreshProfile, refreshVacancies]);

  const showLoading = loading || !profileLoaded;
  return (
    <div className="flex min-h-[calc(100vh-84px)] flex-col bg-[#f5f2ec]">
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-5 pb-8 pt-5 sm:px-8 lg:px-10">
        <Link
          href="/"
          className="mb-5 inline-flex items-center gap-2 text-xs text-[#35556b] hover:underline"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Inicio
        </Link>

        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#fff0e1] text-[#a8602d]">
              <BriefcaseBusiness size={21} aria-hidden="true" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-[#142237] sm:text-3xl">
                Oportunidades para ti
              </h1>
              <p className="mt-1 text-xs text-[#617184] sm:text-sm">
                Prioriza las oportunidades según su afinidad con tu perfil.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/perfil/experiencia-laboral"
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[#d9d0c3] bg-white px-3 text-xs font-medium text-[#142237] hover:bg-[#fcfaf6]"
            >
              <UserRound size={14} aria-hidden="true" />
              Mi perfil
            </Link>
            <Link
              href="/vacantes/nueva"
              className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#ffb162] px-3 text-xs font-semibold text-[#142237] hover:bg-[#f6a34f]"
            >
              <BriefcaseBusiness size={14} aria-hidden="true" />
              Registrar vacante
            </Link>
          </div>
        </div>

        <section
          aria-label="Buscar y filtrar vacantes"
          className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,2fr)_repeat(3,minmax(130px,1fr))_auto]"
        >
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-[#142237]">
              Buscar vacantes
            </span>
            <span className="flex h-10 items-center gap-2 rounded-md border border-[#d9d0c3] bg-white px-3 focus-within:border-[#b87543]">
              <Search size={14} className="shrink-0 text-[#617184]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por cargo, empresa o ubicación"
                className="w-full bg-transparent text-xs text-[#142237] outline-none placeholder:text-[#8c98a5]"
                aria-label="Buscar por cargo, empresa o ubicación"
              />
            </span>
          </label>

          {[
            {
              label: 'Área laboral',
              value: area,
              options: areas,
              onChange: setArea,
              allLabel: 'Área: todas',
            },
            {
              label: 'Modalidad de trabajo',
              value: modality,
              options: modalities,
              onChange: setModality,
              allLabel: 'Modalidad: todas',
            },
            {
              label: 'Ubicación',
              value: location,
              options: locations,
              onChange: setLocation,
              allLabel: 'Ubicación: todas',
            },
          ].map((filter) => (
            <label key={filter.label} className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-[#142237]">
                {filter.label}
              </span>
              <span className="relative">
                <select
                  value={filter.value}
                  onChange={(event) => filter.onChange(event.target.value)}
                  className="h-10 w-full appearance-none rounded-md border border-[#d9d0c3] bg-white px-3 pr-9 text-xs text-[#617184] outline-none focus:border-[#b87543]"
                  aria-label={filter.label}
                >
                  {filter.options.map((option) => (
                    <option key={option} value={option}>
                      {option === 'Todas' ? filter.allLabel : option}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#617184]"
                />
              </span>
            </label>
          ))}
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-[#142237]">
              Ordenar por afinidad
            </span>
            <span className="relative">
              <select
                value={affinityView}
                onChange={(event) => {
                  const value = event.target.value;
                  if (
                    value === 'desc' ||
                    value === 'asc' ||
                    value === 'recommended' ||
                    value === 'not-recommended'
                  ) {
                    setAffinityView(value);
                  }
                }}
                className="h-10 w-full appearance-none rounded-md border border-[#d9d0c3] bg-white px-3 pr-9 text-xs text-[#617184] outline-none focus:border-[#b87543]"
                aria-label="Ordenar vacantes por afinidad"
              >
                <option value="desc">Mayor a menor</option>
                <option value="asc">Menor a mayor</option>
                <option value="recommended">Más recomendadas (&gt;50 %)</option>
                <option value="not-recommended">
                  No recomendadas (≤50 %)
                </option>
              </select>
              <ChevronDown
                size={14}
                aria-hidden="true"
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#617184]"
              />
            </span>
          </label>
        </section>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_230px]">
          <div className="min-w-0">
        {error ? (
          <section
            role="alert"
            className="rounded-lg border border-[#e6c6ba] bg-white px-5 py-10 text-center"
          >
            <h2 className="text-base font-semibold text-[#142237]">
              No se pudieron cargar las vacantes
            </h2>
            <p className="mt-2 text-sm text-[#617184]">{error}</p>
            <button
              type="button"
              onClick={retryLoadingVacancies}
              className="mt-5 inline-flex min-h-10 items-center justify-center rounded-md bg-[#ffb162] px-4 text-xs font-semibold text-[#142237] hover:bg-[#f6a34f]"
            >
              Reintentar
            </button>
          </section>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2
                className="text-xs font-semibold text-[#142237]"
                aria-live="polite"
              >
                {showLoading
                  ? 'Cargando vacantes...'
                  : `${filteredVacancies.length} ${
                      filteredVacancies.length === 1
                        ? 'vacante disponible'
                        : 'vacantes disponibles'
                    }`}
              </h2>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-medium text-[#a8602d] hover:underline"
                >
                  Limpiar filtros
                </button>
              )}
              <button
                type="button"
                onClick={retryLoadingVacancies}
                disabled={loading}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-[#d9d0c3] bg-white px-3 text-xs font-medium text-[#35556b] hover:bg-[#fcfaf6] disabled:cursor-wait disabled:opacity-60"
              >
                <RefreshCw
                  size={12}
                  aria-hidden="true"
                  className={loading ? 'animate-spin' : ''}
                />
                Actualizar
              </button>
            </div>

            <section
              aria-label="Listado de vacantes"
              aria-busy={showLoading}
              className="overflow-hidden rounded-lg border border-[#d9d0c3] bg-white"
            >
              {showLoading ? (
                <p role="status" className="px-5 py-12 text-center text-sm text-[#617184]">
                  Cargando vacantes disponibles...
                </p>
              ) : filteredVacancies.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <Search
                    size={24}
                    aria-hidden="true"
                    className="mx-auto mb-3 text-[#8c98a5]"
                  />
                  <h3 className="text-base font-semibold text-[#142237]">
                    {vacancies.length === 0
                      ? 'Por el momento no hay vacantes disponibles'
                      : affinityView === 'recommended'
                        ? 'No hay vacantes con afinidad superior al 50 %'
                        : affinityView === 'not-recommended'
                          ? 'No hay vacantes con afinidad de 50 % o menos'
                          : 'No encontramos vacantes compatibles con los filtros'}
                  </h3>
                  <p className="mt-2 text-sm text-[#617184]">
                    {vacancies.length === 0
                      ? 'Actualiza el listado para consultar las oportunidades más recientes.'
                      : 'Prueba con otra búsqueda o cambia los filtros seleccionados.'}
                  </p>
                  {vacancies.length === 0 && (
                    <button
                      type="button"
                      onClick={retryLoadingVacancies}
                      className="mt-4 inline-flex min-h-10 items-center justify-center rounded-md bg-[#ffb162] px-4 text-xs font-semibold text-[#142237] hover:bg-[#f6a34f]"
                    >
                      Actualizar listado
                    </button>
                  )}
                  {vacancies.length > 0 && hasFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="mt-4 inline-flex min-h-10 items-center justify-center rounded-md border border-[#d9d0c3] bg-white px-4 text-xs font-semibold text-[#142237] hover:bg-[#fcfaf6]"
                    >
                      Limpiar filtros
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="hidden grid-cols-[minmax(0,2.4fr)_0.8fr_0.6fr_0.7fr_0.8fr_auto] gap-4 bg-[#eee8dd] px-4 py-3 text-[11px] font-semibold text-[#142237] md:grid">
                    <span>Vacante y empresa</span>
                    <span>Área laboral</span>
                    <span>Modalidad</span>
                    <span>Publicación</span>
                    <span>Afinidad</span>
                    <span>Oferta</span>
                  </div>
                  {filteredVacancies.map((vacancy) => (
                    <article
                      key={vacancy.id}
                      className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-3 border-t border-[#e7dfd3] px-4 py-4 first:border-t-0 md:grid-cols-[minmax(0,2.4fr)_0.8fr_0.6fr_0.7fr_0.8fr_auto] md:items-center md:gap-4"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xs font-semibold text-[#142237]">
                            {vacancy.titulo}
                          </h3>
                          {vacancy.id === recommendedVacancyId && (
                            <span className="rounded-full bg-[#e9f5ee] px-2 py-0.5 text-[9px] font-semibold text-[#2f7a5d]">
                              Más recomendada
                            </span>
                          )}
                        </div>
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-[#35556b]">
                          <Building2 size={12} aria-hidden="true" />
                          {vacancy.empresa}
                        </p>
                        <p className="mt-1 text-[11px] leading-4 text-[#617184]">
                          {vacancy.descripcion}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-[10px] text-[#8793a0] md:hidden">
                          <MapPin size={11} aria-hidden="true" />
                          {vacancy.ubicacion}
                        </p>
                      </div>
                      <div className="text-[11px] text-[#142237]">
                        <span className="mr-1 text-[#8793a0] md:hidden">Área:</span>
                        {vacancy.area}
                        <p className="mt-1 hidden text-[10px] text-[#8793a0] md:block">
                          {vacancy.ubicacion}
                        </p>
                      </div>
                      <p className="text-[11px] text-[#35556b]">
                        <span className="mr-1 text-[#8793a0] md:hidden">
                          Modalidad:
                        </span>
                        {vacancy.modalidad}
                      </p>
                      <p className="text-[11px] text-[#617184]">
                        <span className="mr-1 text-[#8793a0] md:hidden">
                          Publicación:
                        </span>
                        {getPublicationDate(vacancy)}
                      </p>
                      <AffinityScore
                        compact
                        percentage={
                          getAffinityPercentage(vacancy.id)
                        }
                        matched={affinities.get(vacancy.id)?.matched ?? 0}
                        total={affinities.get(vacancy.id)?.total ?? 0}
                        emptyMessage=""
                      />
                      <Link
                        href={`/vacantes/${encodeURIComponent(vacancy.id)}`}
                        className="inline-flex min-h-9 items-center justify-center rounded-md border border-[#d9d0c3] bg-white px-3 text-[11px] font-semibold text-[#142237] transition hover:border-[#b87543] hover:bg-[#fcfaf6]"
                      >
                        Ver oferta
                      </Link>
                    </article>
                  ))}
                </>
              )}
            </section>
          </>
        )}
          </div>
          <aside className="rounded-lg border border-[#d9d0c3] bg-white p-5">
            <h2 className="text-sm font-bold text-[#142237]">Mis habilidades</h2>
            <p className="mt-2 text-xs text-[#617184]">
              {profileLoaded
                ? `${profileSkills.length} habilidades guardadas en este navegador.`
                : 'Habilidades del perfil'}
            </p>
            {profileLoaded && profileSkills.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {profileSkills.slice(0, 6).map((skill) => (
                  <li
                    key={skill.id}
                    className="rounded-full bg-[#f3efe5] px-2 py-1 text-[10px] text-[#35556b]"
                  >
                    {skill.name}
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/skills"
              className="mt-4 inline-flex min-h-9 w-full items-center justify-center rounded-md border border-[#d9d0c3] px-3 text-xs font-semibold text-[#142237] hover:bg-[#fcfaf6]"
            >
              Actualizar habilidades
            </Link>
          </aside>
        </div>
      </main>
      <PortalFooter />
    </div>
  );
}

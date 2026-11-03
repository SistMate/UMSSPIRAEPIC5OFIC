'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { ArrowDownWideNarrow, Search, X } from 'lucide-react';
import {
  calculateAffinityPercentage,
  parseProfileSkills,
} from '../vacantes/comparison-data';
import { parseSavedVacancies, type Vacancy } from '../vacantes/vacancy-data';
import {
  readComparisonSnapshot,
  SERVER_STORAGE_SNAPSHOT,
  STORAGE_READ_ERROR_SNAPSHOT,
  subscribeToLocalStorage,
} from '../vacantes/storage';

type OrderedVacanciesResponse = { ids: string[] };

function orderByAffinity(vacancies: Vacancy[]) {
  return vacancies
    .filter((vacancy) => vacancy.available !== false)
    .map((vacancy, index) => ({ vacancy, index }))
    .sort((left, right) => {
      const leftAffinity = left.vacancy.affinityPercentage ?? null;
      const rightAffinity = right.vacancy.affinityPercentage ?? null;

      if (leftAffinity === null && rightAffinity !== null) return 1;
      if (leftAffinity !== null && rightAffinity === null) return -1;
      if (leftAffinity !== null && rightAffinity !== null && leftAffinity !== rightAffinity) {
        return rightAffinity - leftAffinity;
      }

      const titleOrder = left.vacancy.title.localeCompare(right.vacancy.title, 'es');
      return titleOrder || String(left.vacancy.id).localeCompare(String(right.vacancy.id)) || left.index - right.index;
    })
    .map(({ vacancy }) => vacancy);
}

function formatPublicationDate(createdAt?: string) {
  if (!createdAt) return 'Hace 1 día';

  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';

  return new Intl.DateTimeFormat('es-BO', { dateStyle: 'medium' }).format(date);
}

export default function OfertasTrabajoPage() {
  const [search, setSearch] = useState('');
  const [area, setArea] = useState('Todas las áreas');
  const [modality, setModality] = useState('Todas');
  const [city, setCity] = useState('Todas las ciudades');
  const [apiOrder, setApiOrder] = useState<string[] | null>(null);
  const [apiUnavailable, setApiUnavailable] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sortVersion, setSortVersion] = useState(0);
  const snapshot = useSyncExternalStore(
    subscribeToLocalStorage,
    readComparisonSnapshot,
    () => SERVER_STORAGE_SNAPSHOT,
  );

  const { vacancies, skills, loaded, storageError } = useMemo(() => {
    if (snapshot === SERVER_STORAGE_SNAPSHOT) {
      return { vacancies: [], skills: [], loaded: false, storageError: false };
    }
    if (snapshot === STORAGE_READ_ERROR_SNAPSHOT) {
      return { vacancies: [], skills: [], loaded: true, storageError: true };
    }

    try {
      const parsedSnapshot: unknown = JSON.parse(snapshot);
      if (
        !Array.isArray(parsedSnapshot) ||
        parsedSnapshot.length !== 2 ||
        (parsedSnapshot[0] !== null && typeof parsedSnapshot[0] !== 'string') ||
        (parsedSnapshot[1] !== null && typeof parsedSnapshot[1] !== 'string')
      ) {
        throw new Error('El almacenamiento del perfil tiene un formato no válido.');
      }

      const savedVacancies = parseSavedVacancies(parsedSnapshot[0]);
      try {
        return {
          vacancies: savedVacancies,
          skills: parseProfileSkills(parsedSnapshot[1]),
          loaded: true,
          storageError: false,
        };
      } catch {
        return {
          vacancies: savedVacancies,
          skills: null,
          loaded: true,
          storageError: true,
        };
      }
    } catch {
      return { vacancies: [], skills: null, loaded: true, storageError: true };
    }
  }, [snapshot]);

  const vacanciesWithAffinity = useMemo(
    () =>
      vacancies.map((vacancy) => ({
        ...vacancy,
        affinityPercentage:
          skills === null
            ? null
            : calculateAffinityPercentage(vacancy, skills),
      })),
    [skills, vacancies],
  );
  const localOrder = useMemo(
    () => orderByAffinity(vacanciesWithAffinity),
    [vacanciesWithAffinity],
  );

  useEffect(() => {
    if (!loaded) return;

    const controller = new AbortController();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

    const updateOrder = async () => {
      setApiOrder(null);
      setRefreshing(true);
      try {
        const response = await fetch(`${apiUrl}/vacantes/ordenar-por-afinidad`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            vacancies: vacanciesWithAffinity.map(
              ({ id, title, affinityPercentage, available }) => ({
                id: String(id),
                title,
                affinityPercentage,
                available,
              }),
            ),
          }),
        });

        if (!response.ok) throw new Error('No se pudo ordenar en el servidor.');
        const result = (await response.json()) as OrderedVacanciesResponse;
        if (!Array.isArray(result.ids)) throw new Error('Respuesta de orden inválida.');

        setApiOrder(result.ids);
        setApiUnavailable(false);
      } catch {
        if (!controller.signal.aborted) {
          setApiOrder(null);
          setApiUnavailable(true);
        }
      } finally {
        if (!controller.signal.aborted) setRefreshing(false);
      }
    };

    void updateOrder();
    return () => controller.abort();
  }, [loaded, sortVersion, vacanciesWithAffinity]);

  const orderedVacancies = useMemo(() => {
    if (!apiOrder) return localOrder;

    const vacanciesById = new Map(
      vacanciesWithAffinity
        .filter((vacancy) => vacancy.available !== false)
        .map((vacancy) => [String(vacancy.id), vacancy]),
    );
    const ordered = apiOrder.flatMap((id) => {
      const vacancy = vacanciesById.get(id);
      return vacancy ? [vacancy] : [];
    });
    const included = new Set(ordered.map((vacancy) => String(vacancy.id)));

    return [...ordered, ...localOrder.filter((vacancy) => !included.has(String(vacancy.id)))];
  }, [apiOrder, localOrder, vacanciesWithAffinity]);

  const areas = useMemo(
    () => ['Todas las áreas', ...new Set(vacancies.map((vacancy) => vacancy.area))],
    [vacancies],
  );
  const modalities = useMemo(
    () => ['Todas', ...new Set(vacancies.map((vacancy) => vacancy.modality))],
    [vacancies],
  );
  const cities = useMemo(
    () => ['Todas las ciudades', ...new Set(vacancies.map((vacancy) => vacancy.location))],
    [vacancies],
  );

  const visibleVacancies = orderedVacancies.filter((vacancy) => {
    const searchableText = `${vacancy.title} ${vacancy.company} ${vacancy.description} ${vacancy.location}`.toLowerCase();
    return (
      searchableText.includes(search.trim().toLowerCase()) &&
      (area === 'Todas las áreas' || vacancy.area === area) &&
      (modality === 'Todas' || vacancy.modality === modality) &&
      (city === 'Todas las ciudades' || vacancy.location === city)
    );
  });

  const hasFilters = Boolean(search) || area !== 'Todas las áreas' || modality !== 'Todas' || city !== 'Todas las ciudades';
  const clearFilters = () => {
    setSearch('');
    setArea('Todas las áreas');
    setModality('Todas');
    setCity('Todas las ciudades');
  };

  return (
    <main className="min-h-screen bg-[#f3efe5] px-5 py-8 sm:px-8 lg:py-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-[#17384b]">Bolsa de trabajo</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
            Explora y encuentra oportunidades laborales adaptadas a tu perfil académico y profesional con cálculo automático de afinidad.
          </p>
        </div>

        <section className="mb-5 rounded-xl border border-[#e7e0d4] bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_repeat(3,minmax(130px,0.48fr))_auto]">
            <label className="flex min-h-11 items-center gap-2 rounded-md border border-gray-200 bg-[#fcfbf8] px-3 focus-within:border-[#ed9635]">
              <Search size={16} className="shrink-0 text-gray-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por cargo, palabra clave o empresa..."
                className="w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
                aria-label="Buscar ofertas de trabajo"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} aria-label="Limpiar búsqueda" className="text-gray-400 hover:text-gray-700">
                  <X size={16} />
                </button>
              )}
            </label>

            <select value={area} onChange={(event) => setArea(event.target.value)} className="min-h-11 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-[#ed9635]" aria-label="Filtrar por área">
              {areas.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={modality} onChange={(event) => setModality(event.target.value)} className="min-h-11 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-[#ed9635]" aria-label="Filtrar por modalidad">
              <option value="Todas">Modalidad: Todas</option>
              {modalities.filter((item) => item !== 'Todas').map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select value={city} onChange={(event) => setCity(event.target.value)} className="min-h-11 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-[#ed9635]" aria-label="Filtrar por ciudad">
              {cities.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <button
              type="button"
              onClick={() => setSortVersion((version) => version + 1)}
              disabled={refreshing}
              className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-[#ed9635] bg-[#fff9f1] px-3 text-sm font-semibold text-[#9a5c1e] transition hover:bg-[#fff0dc] disabled:opacity-60"
              title="Volver a ordenar según los porcentajes actuales"
            >
              <ArrowDownWideNarrow size={16} />
              {refreshing ? 'Ordenando...' : 'Ordenar: mayor afinidad'}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3 text-xs">
            <p className="text-gray-500">
              {loaded ? `${visibleVacancies.length} vacantes encontradas` : 'Cargando vacantes...'}
              {!apiUnavailable && loaded && <span className="ml-2 text-emerald-700">• Ordenadas por afinidad</span>}
              {apiUnavailable && loaded && <span className="ml-2 text-emerald-700">• Ordenadas localmente por afinidad</span>}
            </p>
            {hasFilters && (
              <button type="button" onClick={clearFilters} className="font-semibold text-[#a66320] hover:underline">
                Limpiar filtros
              </button>
            )}
          </div>
        </section>

        {storageError && (
          <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            No se pudieron leer las vacantes o habilidades guardadas en este navegador.
          </p>
        )}
        {!storageError && loaded && skills?.length === 0 && (
          <p className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
            Agrega tus habilidades en{' '}
            <Link href="/skills" className="font-semibold underline">
              tu perfil
            </Link>{' '}
            para calcular la afinidad de las ofertas.
          </p>
        )}

        <section className="overflow-hidden rounded-xl border border-[#e7e0d4] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] table-fixed border-collapse text-left text-xs">
              <thead className="bg-[#f8f9fa] text-gray-600">
                <tr>
                  <th className="w-[13%] px-3 py-3 font-semibold">Vacante</th>
                  <th className="w-[11%] px-3 py-3 font-semibold">Empresa</th>
                  <th className="w-[12%] bg-[#fffaf4] px-3 py-3 font-semibold text-[#8b531f]">Afinidad</th>
                  <th className="w-[22%] px-3 py-3 font-semibold">Descripción breve</th>
                  <th className="w-[13%] px-3 py-3 font-semibold">Área laboral</th>
                  <th className="w-[10%] px-3 py-3 font-semibold">Modalidad</th>
                  <th className="w-[10%] px-3 py-3 font-semibold">Publicación</th>
                  <th className="w-[9%] px-3 py-3 text-center font-semibold">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-600">
                {!loaded ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-500">Cargando ofertas...</td></tr>
                ) : visibleVacancies.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <p className="text-sm font-semibold text-[#17384b]">No encontramos ofertas de trabajo</p>
                      <p className="mt-1 text-xs text-gray-500">Prueba con otros filtros o limpia la búsqueda.</p>
                    </td>
                  </tr>
                ) : visibleVacancies.map((vacancy) => (
                  <tr key={`${vacancy.id}-${vacancy.title}`} className="align-middle hover:bg-[#fcfbf8]">
                    <td className="px-3 py-4 font-semibold text-[#263747]">
                      <p>{vacancy.title}</p>
                      <p className="mt-1 font-normal text-gray-400">Ref: {String(vacancy.id)}</p>
                    </td>
                    <td className="px-3 py-4">{vacancy.company}</td>
                    <td className="bg-[#fffdfa] px-3 py-4">
                      {vacancy.affinityPercentage == null ? (
                        <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 font-medium text-gray-500">Sin calcular</span>
                      ) : (
                        <span className={`inline-flex rounded-full border px-2.5 py-1 font-semibold ${vacancy.affinityPercentage >= 80 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : vacancy.affinityPercentage >= 60 ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                          {vacancy.affinityPercentage}% Afinidad
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-4 leading-5">{vacancy.description}</td>
                    <td className="px-3 py-4">{vacancy.area}</td>
                    <td className="px-3 py-4">{vacancy.modality}{vacancy.modality === 'Híbrido' ? ` (${vacancy.location})` : ''}</td>
                    <td className="px-3 py-4">{formatPublicationDate(vacancy.createdAt)}</td>
                    <td className="px-3 py-4 text-center">
                      <Link href={`/vacantes/${vacancy.id}`} className="inline-flex min-h-8 items-center justify-center whitespace-nowrap rounded-md border border-gray-200 px-2.5 font-semibold text-[#17384b] transition hover:border-[#ed9635] hover:bg-[#fff9f1]">
                        Ver oferta
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
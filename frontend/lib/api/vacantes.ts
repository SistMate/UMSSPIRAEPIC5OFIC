export type VacancyRequirement = {
  id: string;
  nombre: string;
};

export type Vacancy = {
  id: string;
  idEmpresa: string;
  empresa: string;
  titulo: string;
  modalidad: string;
  estado: string;
  fechaCreacion: string | null;
  descripcion: string;
  ubicacion: string;
  area: string;
  condiciones: string;
  requisitos: VacancyRequirement[];
};

export type CreateVacancyInput = {
  idEmpresa: string;
  titulo: string;
  modalidad: string;
  descripcion: string;
  ubicacion: string;
  area: string;
  condiciones: string;
  requisitos: string[];
};

type ApiErrorBody = {
  message?: string | string[];
};

export class VacancyApiError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'VacancyApiError';
    this.status = status;
  }
}

export const DEFAULT_API_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://backend-umsspira.vercel.app'
    : 'http://localhost:3001';

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL?.trim() || DEFAULT_API_URL
).replace(/\/$/, '');

export const configuredCompanyId =
  process.env.NEXT_PUBLIC_EMPRESA_ID?.trim() || 'demo-empresa-01';

export const configuredCompanyName =
  process.env.NEXT_PUBLIC_EMPRESA_NAME?.trim() || 'TecnoAndes S.R.L.';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
      cache: 'no-store',
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }

    throw new VacancyApiError(
      'No se pudo conectar con el servicio de vacantes. Inténtalo nuevamente.',
    );
  }

  if (!response.ok) {
    let body: ApiErrorBody | null = null;

    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      body = null;
    }

    const message = Array.isArray(body?.message)
      ? body.message.join(' ')
      : body?.message;

    throw new VacancyApiError(
      message || 'No se pudo completar la operación solicitada.',
      response.status,
    );
  }

  try {
    return (await response.json()) as T;
  } catch (error) {
    if (init?.signal?.aborted) throw error;
    throw new VacancyApiError('El servicio devolvió una respuesta no válida. Inténtalo nuevamente.');
  }
}

function isVacancy(value: unknown): value is Vacancy {
  if (typeof value !== 'object' || value === null) return false;
  const vacancy = value as Record<string, unknown>;
  return (
    ['id', 'idEmpresa', 'empresa', 'titulo', 'modalidad', 'estado', 'descripcion', 'ubicacion', 'area', 'condiciones']
      .every((field) => typeof vacancy[field] === 'string') &&
    (vacancy.fechaCreacion === null || typeof vacancy.fechaCreacion === 'string') &&
    Array.isArray(vacancy.requisitos) &&
    vacancy.requisitos.every((requirement: unknown) => {
      if (typeof requirement !== 'object' || requirement === null) return false;
      const item = requirement as Record<string, unknown>;
      return typeof item.id === 'string' && typeof item.nombre === 'string' && item.nombre.trim().length > 0;
    })
  );
}

export function createVacancy(input: CreateVacancyInput) {
  return request<Vacancy>('/vacantes', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getVacancy(id: string, signal?: AbortSignal): Promise<Vacancy> {
  const vacancy = await request<unknown>(`/vacantes/${encodeURIComponent(id)}`, { signal });
  if (!isVacancy(vacancy) || vacancy.id.toLowerCase() !== id.toLowerCase()) {
    throw new VacancyApiError('No se pudo verificar la información de esta vacante. Inténtalo nuevamente.');
  }
  return vacancy;
}

export async function searchIndexedVacancies(query: string, signal?: AbortSignal): Promise<Vacancy[]> {
  const search = new URLSearchParams({ q: query.trim() });
  const vacancies = await request<unknown>(`/vacantes/buscar?${search.toString()}`, {
    signal,
  });
  if (!Array.isArray(vacancies) || !vacancies.every(isVacancy)) {
    throw new VacancyApiError('No se pudo verificar el listado de vacantes. Inténtalo nuevamente.');
  }
  return vacancies;
}

export function listVacancies(idEmpresa: string) {
  const query = new URLSearchParams({ idEmpresa });
  return request<Vacancy[]>(`/vacantes?${query.toString()}`);
}

export function isVacancyAvailable(status: string) {
  // Mapeo provisional para HU3; Equipo 4 definirá el catálogo oficial.
  return status.trim().toLowerCase() === 'disponible';
}

export function getVacancyIdentifier(vacancy: Pick<Vacancy, 'id'>) {
  // HU1/HU2 sustituirán este adaptador cuando exista un código oficial.
  return vacancy.id;
}
export type TechnicalVacancyRequirement = {
  id: string;
  idVacante: string;
  competencia: string;
  nivel: 'Básico' | 'Intermedio' | 'Avanzado' | 'Experto';
  tipo: 'Obligatorio' | 'Deseable';
  descripcion?: string;
  fechaCreacion: string;
};

export async function getTechnicalVacancyRequirements(
  idVacante: string,
  signal?: AbortSignal,
): Promise<TechnicalVacancyRequirement[]> {
  const requisitos = await request<unknown>(
    `/vacantes/${encodeURIComponent(idVacante)}/requisitos`,
    { signal },
  );

  const niveles = ['Básico', 'Intermedio', 'Avanzado', 'Experto'];
  const tipos = ['Obligatorio', 'Deseable'];

  if (
    !Array.isArray(requisitos) ||
    !requisitos.every((item: unknown) => {
      if (typeof item !== 'object' || item === null) return false;

      const requisito = item as Record<string, unknown>;

      return (
        typeof requisito.id === 'string' &&
        typeof requisito.idVacante === 'string' &&
        requisito.idVacante.toLowerCase() === idVacante.toLowerCase() &&
        typeof requisito.competencia === 'string' &&
        requisito.competencia.trim().length > 0 &&
        niveles.includes(String(requisito.nivel)) &&
        tipos.includes(String(requisito.tipo)) &&
        (requisito.descripcion === undefined ||
          typeof requisito.descripcion === 'string') &&
        typeof requisito.fechaCreacion === 'string'
      );
    })
  ) {
    throw new VacancyApiError(
      'No se pudieron verificar los requisitos técnicos de esta vacante.',
    );
  }

  return requisitos as TechnicalVacancyRequirement[];
}
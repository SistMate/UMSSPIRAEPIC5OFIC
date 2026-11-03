export const VACANCIES_STORAGE_KEY = 'umsspira-vacantes';

export type Vacancy = {
  id: string | number;
  title: string;
  company: string;
  area: string;
  location: string;
  modality: string;
  description: string;
  requirements: string[];
  conditions?: string;
  createdAt?: string;
  affinityPercentage?: number | null;
  available?: boolean;
};

export const DEMO_VACANCIES: Vacancy[] = [
  {
    id: '1',
    title: 'Analista de Datos Junior',
    company: 'Empresa de Tecnología',
    area: 'Datos y Analítica',
    location: 'Cochabamba',
    modality: 'Híbrido',
    description:
      'Buscamos una persona interesada en analizar información, elaborar reportes y apoyar la toma de decisiones mediante el uso de datos.',
    requirements: ['SQL básico', 'Excel', 'Pensamiento analítico'],
    affinityPercentage: 88,
    conditions:
      'Jornada completa. Oportunidad de aprendizaje y crecimiento profesional.',
  },
  {
    id: '2',
    title: 'Desarrollador Frontend Junior',
    company: 'Empresa de Software',
    area: 'Desarrollo de Software',
    location: 'Bolivia',
    modality: 'Remoto',
    description:
      'Participarás en el desarrollo de interfaces web, trabajando junto al equipo de diseño y desarrollo para construir experiencias de usuario.',
    requirements: ['JavaScript', 'React', 'Git'],
    affinityPercentage: 86,
    conditions: 'Trabajo remoto y colaboración con un equipo de desarrollo.',
  },
  {
    id: '3',
    title: 'Asistente de Soporte TI',
    company: 'Servicios Informáticos',
    area: 'Infraestructura y Soporte',
    location: 'Cochabamba',
    modality: 'Presencial',
    description:
      'Apoyarás en la atención de incidentes técnicos, mantenimiento de equipos y asistencia a usuarios.',
    requirements: ['Windows', 'Redes básicas', 'Atención al usuario'],
    affinityPercentage: 0,
    conditions: 'Trabajo presencial. Capacitación inicial incluida.',
  },
];

function isVacancy(value: unknown): value is Vacancy {
  if (typeof value !== 'object' || value === null) return false;

  const vacancy = value as Record<string, unknown>;
  return (
    (typeof vacancy.id === 'string' || typeof vacancy.id === 'number') &&
    typeof vacancy.title === 'string' &&
    typeof vacancy.company === 'string' &&
    typeof vacancy.area === 'string' &&
    typeof vacancy.location === 'string' &&
    typeof vacancy.modality === 'string' &&
    typeof vacancy.description === 'string' &&
    Array.isArray(vacancy.requirements) &&
    vacancy.requirements.every((item) => typeof item === 'string') &&
    (vacancy.conditions === undefined ||
      typeof vacancy.conditions === 'string') &&
    (vacancy.createdAt === undefined ||
      typeof vacancy.createdAt === 'string') &&
    (vacancy.affinityPercentage === undefined ||
      vacancy.affinityPercentage === null ||
      (typeof vacancy.affinityPercentage === 'number' &&
        Number.isFinite(vacancy.affinityPercentage) &&
        vacancy.affinityPercentage >= 0 &&
        vacancy.affinityPercentage <= 100)) &&
    (vacancy.available === undefined || typeof vacancy.available === 'boolean')
  );
}

export function parseSavedVacancies(saved: string | null): Vacancy[] {
  if (!saved) return [];

  const parsed: unknown = JSON.parse(saved);
  if (!Array.isArray(parsed) || !parsed.every(isVacancy)) {
    throw new Error('Las vacantes guardadas tienen un formato no válido.');
  }

  return parsed;
}

export function readSavedVacancies(): Vacancy[] {
  return parseSavedVacancies(localStorage.getItem(VACANCIES_STORAGE_KEY));
}

export function readAllVacancies(): Vacancy[] {
  return [...DEMO_VACANCIES, ...readSavedVacancies()];
}

export function findVacancyIn(
  id: string,
  savedVacancies: Vacancy[],
): Vacancy | undefined {
  return [...DEMO_VACANCIES, ...savedVacancies].find(
    (vacancy) => String(vacancy.id) === id,
  );
}

export function findVacancy(id: string): Vacancy | undefined {
  return findVacancyIn(id, readSavedVacancies());
}

export function isDemoVacancy(id: string): boolean {
  return DEMO_VACANCIES.some((vacancy) => String(vacancy.id) === id);
}

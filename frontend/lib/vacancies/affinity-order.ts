export type VacancyAffinityEntry = {
  id: string;
  fechaCreacion: string | null;
};

export type AffinitySortDirection = 'desc' | 'asc';
export type AffinityCategory = 'recommended' | 'not-recommended';

export function filterVacanciesByAffinityCategory<
  T extends VacancyAffinityEntry,
>(
  vacancies: T[],
  getPercentage: (vacancyId: string) => number | null,
  category: AffinityCategory,
): T[] {
  return vacancies.filter((vacancy) => {
    const percentage = getPercentage(vacancy.id);
    if (percentage === null) return false;
    return category === 'recommended' ? percentage > 50 : percentage <= 50;
  });
}

function getPublicationTimestamp(value: string | null): number {
  if (!value) return Number.NEGATIVE_INFINITY;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

export function compareVacanciesByAffinity(
  first: VacancyAffinityEntry,
  second: VacancyAffinityEntry,
  getPercentage: (vacancyId: string) => number | null,
  direction: AffinitySortDirection = 'desc',
): number {
  const firstPercentage = getPercentage(first.id);
  const secondPercentage = getPercentage(second.id);
  const firstCalculated = firstPercentage !== null;
  const secondCalculated = secondPercentage !== null;

  if (firstCalculated !== secondCalculated) {
    return firstCalculated ? -1 : 1;
  }

  if (
    firstPercentage !== null &&
    secondPercentage !== null &&
    firstPercentage !== secondPercentage
  ) {
    return direction === 'asc'
      ? firstPercentage - secondPercentage
      : secondPercentage - firstPercentage;
  }

  const publicationDifference =
    getPublicationTimestamp(second.fechaCreacion) -
    getPublicationTimestamp(first.fechaCreacion);
  if (publicationDifference !== 0 && !Number.isNaN(publicationDifference)) {
    return publicationDifference;
  }

  if (first.id === second.id) return 0;
  return first.id < second.id ? -1 : 1;
}

export function sortVacanciesByAffinity<T extends VacancyAffinityEntry>(
  vacancies: T[],
  getPercentage: (vacancyId: string) => number | null,
  direction: AffinitySortDirection = 'desc',
): T[] {
  return [...vacancies].sort((first, second) =>
    compareVacanciesByAffinity(first, second, getPercentage, direction),
  );
}

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  filterVacanciesByAffinityCategory,
  sortVacanciesByAffinity,
  type AffinitySortDirection,
} from './affinity-order.ts';

type TestVacancy = {
  id: string;
  fechaCreacion: string | null;
};

function sort(
  vacancies: TestVacancy[],
  percentages: Record<string, number | null>,
  direction: AffinitySortDirection = 'desc',
) {
  return sortVacanciesByAffinity(
    vacancies,
    (id) => percentages[id] ?? null,
    direction,
  ).map(({ id }) => id);
}

describe('sortVacanciesByAffinity', () => {
  it('returns an empty list when there are no vacancies', () => {
    assert.deepEqual(sort([], {}), []);
  });

  it('orders valid scores descending and keeps zero above uncalculated entries', () => {
    const vacancies = [
      { id: 'zero', fechaCreacion: '2026-01-03T00:00:00Z' },
      { id: 'pending', fechaCreacion: '2026-01-01T00:00:00Z' },
      { id: 'high', fechaCreacion: '2026-01-02T00:00:00Z' },
      { id: 'middle', fechaCreacion: '2026-01-04T00:00:00Z' },
    ];

    assert.deepEqual(
      sort(vacancies, { zero: 0, pending: null, high: 93, middle: 54 }),
      ['high', 'middle', 'zero', 'pending'],
    );
  });

  it('breaks equal percentages by newest publication, then by identifier', () => {
    const vacancies = [
      { id: 'z', fechaCreacion: '2026-01-02T00:00:00Z' },
      { id: 'b', fechaCreacion: '2026-01-03T00:00:00Z' },
      { id: 'a', fechaCreacion: '2026-01-03T00:00:00Z' },
    ];

    assert.deepEqual(sort(vacancies, { z: 80, b: 80, a: 80 }), ['a', 'b', 'z']);
  });

  it('orders calculated scores ascending while keeping uncalculated entries last', () => {
    const vacancies = [
      { id: 'pending', fechaCreacion: '2026-01-05T00:00:00Z' },
      { id: 'high', fechaCreacion: '2026-01-01T00:00:00Z' },
      { id: 'zero', fechaCreacion: '2026-01-04T00:00:00Z' },
      { id: 'low', fechaCreacion: '2026-01-02T00:00:00Z' },
    ];

    assert.deepEqual(
      sort(
        vacancies,
        { pending: null, high: 100, zero: 0, low: 25 },
        'asc',
      ),
      ['zero', 'low', 'high', 'pending'],
    );
  });

  it('orders uncalculated vacancies by the same deterministic secondary key', () => {
    const vacancies = [
      { id: 'older', fechaCreacion: '2026-01-01T00:00:00Z' },
      { id: 'newer', fechaCreacion: '2026-01-02T00:00:00Z' },
      { id: 'no-date', fechaCreacion: null },
    ];

    assert.deepEqual(
      sort(vacancies, { older: null, newer: null, 'no-date': null }),
      ['newer', 'older', 'no-date'],
    );
  });

  it('does not mutate the source list or remove duplicate entries', () => {
    const vacancies = [
      { id: 'same', fechaCreacion: null },
      { id: 'same', fechaCreacion: null },
    ];

    const sorted = sortVacanciesByAffinity(vacancies, () => 0);

    assert.notEqual(sorted, vacancies);
    assert.equal(sorted.length, 2);
    assert.equal(vacancies.length, 2);
  });
});

describe('filterVacanciesByAffinityCategory', () => {
  const vacancies = [
    { id: 'high', fechaCreacion: null },
    { id: 'over-half', fechaCreacion: null },
    { id: 'half', fechaCreacion: null },
    { id: 'zero', fechaCreacion: null },
    { id: 'uncalculated', fechaCreacion: null },
  ];
  const percentages: Record<string, number | null> = {
    high: 85,
    'over-half': 51,
    half: 50,
    zero: 0,
    uncalculated: null,
  };
  const getPercentage = (id: string) => percentages[id] ?? null;

  it('includes only percentages above 50 in recommended vacancies', () => {
    assert.deepEqual(
      filterVacanciesByAffinityCategory(
        vacancies,
        getPercentage,
        'recommended',
      ).map(({ id }) => id),
      ['high', 'over-half'],
    );
  });

  it('includes 50 and below, but not uncalculated vacancies, in not recommended', () => {
    assert.deepEqual(
      filterVacanciesByAffinityCategory(
        vacancies,
        getPercentage,
        'not-recommended',
      ).map(({ id }) => id),
      ['half', 'zero'],
    );
  });
});

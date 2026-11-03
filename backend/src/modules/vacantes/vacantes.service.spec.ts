import { VacantesService } from './vacantes.service';

describe('VacantesService', () => {
  const service = new VacantesService();

  it('orders scores descending, preserves zero and puts uncalculated scores last', () => {
    expect(
      service.ordenarPorAfinidad([
        { id: 'zero', title: 'Cero', affinityPercentage: 0 },
        { id: 'missing', title: 'Sin cálculo' },
        { id: 'high', title: 'Alta', affinityPercentage: 94 },
      ]),
    ).toEqual(['high', 'zero', 'missing']);
  });

  it('uses title and id as deterministic tie breakers', () => {
    expect(
      service.ordenarPorAfinidad([
        { id: 'b', title: 'Desarrollo', affinityPercentage: 70 },
        { id: 'c', title: 'Analista', affinityPercentage: 70 },
        { id: 'a', title: 'Analista', affinityPercentage: 70 },
      ]),
    ).toEqual(['a', 'c', 'b']);
  });

  it('excludes unavailable vacancies and handles an empty list', () => {
    expect(
      service.ordenarPorAfinidad([
        { id: 'closed', title: 'Cerrada', affinityPercentage: 100, available: false },
      ]),
    ).toEqual([]);
    expect(service.ordenarPorAfinidad([])).toEqual([]);
  });
});
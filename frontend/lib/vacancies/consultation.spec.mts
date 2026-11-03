import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import {
  getVacancy,
  getTechnicalVacancyRequirements,
  searchIndexedVacancies,
  VacancyApiError,
} from '../api/vacantes.ts';
import { NO_TECHNICAL_REQUIREMENTS, uniqueVacancyRequirements } from './requirements.ts';
import { vacancyA, vacancyB, vacancyWithoutRequirements } from '../../tests/fixtures/hu8.ts';

afterEach(() => mock.restoreAll());

describe('Consulta de requisitos técnicos (HU8)', () => {
  it('deduplica mayúsculas, tildes y espacios conservando la primera etiqueta', () => {
    const requirements = [...vacancyA.requisitos, { id: 'a5', nombre: ' PÝTHON ' }];
    const before = structuredClone(requirements);
    assert.deepEqual(uniqueVacancyRequirements(requirements), [requirements[0], requirements[3]]);
    assert.deepEqual(requirements, before);
  });

  it('no agrupa competencias distintas como C++ y C# ni mezcla vacantes', () => {
    const requirements = [{ id: '1', nombre: 'C++' }, { id: '2', nombre: 'C#' }];
    assert.deepEqual(uniqueVacancyRequirements(requirements), requirements);
    uniqueVacancyRequirements(vacancyA.requisitos);
    assert.deepEqual(uniqueVacancyRequirements(vacancyB.requisitos), vacancyB.requisitos);
    assert.deepEqual(uniqueVacancyRequirements(vacancyWithoutRequirements.requisitos), []);
    assert.equal(NO_TECHNICAL_REQUIREMENTS, 'Esta vacante no requiere conocimientos técnicos específicos');
  });

  it('consulta el ID seleccionado sin caché y transmite la señal de cancelación', async () => {
    const controller = new AbortController();
    mock.method(globalThis, 'fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      assert.equal(new URL(String(input)).pathname, `/vacantes/${vacancyB.id}`);
      assert.equal(init?.cache, 'no-store');
      assert.equal(init?.signal, controller.signal);
      return Response.json(vacancyB);
    });
    assert.deepEqual(await getVacancy(vacancyB.id, controller.signal), vacancyB);
  });

  it('codifica el ID sin permitir que cambie la ruta de la consulta', async () => {
    mock.method(globalThis, 'fetch', async (input: RequestInfo | URL) => {
      assert.equal(new URL(String(input)).pathname, '/vacantes/invalido%2F%3F%23');
      return Response.json({ message: 'ID inválido' }, { status: 400 });
    });
    await assert.rejects(getVacancy('invalido/?#'), (error: unknown) =>
      error instanceof VacancyApiError && error.status === 400);
  });

  it('mantiene el 404 para distinguir la vacante inexistente', async () => {
    mock.method(globalThis, 'fetch', async () =>
      Response.json({ message: 'La vacante no existe.' }, { status: 404 }));
    await assert.rejects(getVacancy(vacancyA.id), (error: unknown) =>
      error instanceof VacancyApiError && error.status === 404);
  });

  it('rechaza datos de una vacante distinta', async () => {
    mock.method(globalThis, 'fetch', async () => Response.json(vacancyB));
    await assert.rejects(getVacancy(vacancyA.id), /No se pudo verificar/);
  });

  it('rechaza respuestas incompletas en vez de mostrar un falso estado vacío', async () => {
    mock.method(globalThis, 'fetch', async () => Response.json({ ...vacancyA, requisitos: null }));
    await assert.rejects(getVacancy(vacancyA.id), /No se pudo verificar/);
  });

  it('distingue una respuesta vacía válida de un fallo del servicio', async () => {
    mock.method(globalThis, 'fetch', async () => Response.json(vacancyWithoutRequirements));
    assert.deepEqual((await getVacancy(vacancyWithoutRequirements.id)).requisitos, []);
    mock.restoreAll();
    mock.method(globalThis, 'fetch', async () => new Response('Servicio no disponible', { status: 503 }));
    await assert.rejects(getVacancy(vacancyA.id), (error: unknown) =>
      error instanceof VacancyApiError && error.status === 503);
  });

  it('informa del error de red y permite una nueva consulta sin datos locales', async () => {
    let attempts = 0;
    mock.method(globalThis, 'fetch', async () => {
      if (++attempts === 1) throw new TypeError('Failed to fetch');
      return Response.json(vacancyA);
    });
    await assert.rejects(getVacancy(vacancyA.id), /No se pudo conectar/);
    assert.deepEqual(await getVacancy(vacancyA.id), vacancyA);
    assert.equal(attempts, 2);
  });

  it('propaga la cancelación sin convertirla en un error de red', async () => {
    const abort = new DOMException('Cancelado', 'AbortError');
    mock.method(globalThis, 'fetch', async () => { throw abort; });
    await assert.rejects(getVacancy(vacancyA.id), (error: unknown) => error === abort);
  });

  it('maneja JSON inválido como un error recuperable', async () => {
    mock.method(globalThis, 'fetch', async () => new Response('<html>Error</html>'));
    await assert.rejects(getVacancy(vacancyA.id), /respuesta no válida/);
  });

  it('vuelve a obtener los requisitos actualizados de la misma vacante', async () => {
    let calls = 0;
    mock.method(globalThis, 'fetch', async () => Response.json(++calls === 1 ? vacancyA : {
      ...vacancyA, requisitos: [{ id: 'new', nombre: 'TypeScript' }],
    }));
    assert.equal((await getVacancy(vacancyA.id)).requisitos[0].nombre, 'Python');
    assert.deepEqual((await getVacancy(vacancyA.id)).requisitos, [{ id: 'new', nombre: 'TypeScript' }]);
  });

  it('refresca el listado con el mismo filtro y sin caché', async () => {
    let calls = 0;
    mock.method(globalThis, 'fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      assert.equal(url.pathname, '/vacantes/buscar');
      assert.equal(url.searchParams.get('q'), 'Datos & SQL');
      assert.equal(init?.cache, 'no-store');
      return Response.json(++calls === 1 ? [vacancyA] : [vacancyB]);
    });
    assert.deepEqual(await searchIndexedVacancies(' Datos & SQL '), [vacancyA]);
    assert.deepEqual(await searchIndexedVacancies(' Datos & SQL '), [vacancyB]);
  });

  it('acepta un listado vacío y rechaza un contrato de listado inválido', async () => {
    mock.method(globalThis, 'fetch', async () => Response.json([]));
    assert.deepEqual(await searchIndexedVacancies(''), []);
    mock.restoreAll();
    mock.method(globalThis, 'fetch', async () => Response.json({ vacantes: [vacancyA] }));
    await assert.rejects(searchIndexedVacancies(''), /No se pudo verificar el listado/);
  });
});
describe('Consulta de requisitos estructurados de HU2 para HU8', () => {
  it('consulta los requisitos técnicos de la vacante seleccionada', async () => {
    const idVacante = 'vacante-123';

    const requisitosEsperados = [
      {
        id: 'requisito-1',
        idVacante,
        competencia: 'SQL',
        nivel: 'Avanzado',
        tipo: 'Obligatorio',
        descripcion: 'Consultas y bases de datos',
        fechaCreacion: '2026-01-15T10:00:00.000Z',
      },
    ];

    const fetchSimulado = mock.method(globalThis, 'fetch', async () => {
      return Response.json(requisitosEsperados);
    });

    const resultado = await getTechnicalVacancyRequirements(idVacante);

    assert.deepEqual(resultado, requisitosEsperados);
    assert.equal(fetchSimulado.mock.callCount(), 1);
    assert.match(
      String(fetchSimulado.mock.calls[0].arguments[0]),
      /\/vacantes\/vacante-123\/requisitos$/,
    );
  });
});
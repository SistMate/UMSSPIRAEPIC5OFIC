import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calculateLocalAffinity } from './local-affinity.ts';

describe('calculateLocalAffinity', () => {
  it('uses the confirmed matched-requirements over total formula', () => {
    const result = calculateLocalAffinity(
      ['React', 'TypeScript', 'PostgreSQL'],
      [{ name: 'React avanzado' }, { name: 'TypeScript' }],
    );

    assert.equal(result.matched, 2);
    assert.equal(result.total, 3);
    assert.equal(result.percentage, 67);
  });

  it('matches a requirement when at least one normalized word overlaps', () => {
    const result = calculateLocalAffinity(
      ['Integración de API REST'],
      [{ name: 'API' }],
    );

    assert.equal(result.requirements[0].matched, true);
    assert.deepEqual(result.requirements[0].matchingSkills, ['API']);
  });

  it('matches a shorter technology name with its longer name (Java / JavaScript)', () => {
    const result = calculateLocalAffinity(
      ['SQL', 'Java', 'Minecraft'],
      [{ name: 'JavaScript' }],
    );

    assert.equal(result.matched, 1);
    assert.equal(result.total, 3);
    assert.equal(result.percentage, 33);
    assert.equal(result.requirements[0].matched, false);
    assert.equal(result.requirements[1].matched, true);
    assert.deepEqual(result.requirements[1].matchingSkills, ['JavaScript']);
  });

  it('does not count the same requirement more than once', () => {
    const result = calculateLocalAffinity(
      ['React y TypeScript'],
      [{ name: 'React' }, { name: 'TypeScript' }],
    );

    assert.equal(result.matched, 1);
    assert.equal(result.percentage, 100);
    assert.deepEqual(result.requirements[0].matchingSkills, [
      'React',
      'TypeScript',
    ]);
  });

  it('does not produce a percentage when the vacancy has no requirements', () => {
    const result = calculateLocalAffinity([], [{ name: 'React' }]);

    assert.equal(result.total, 0);
    assert.equal(result.percentage, null);
  });

  it('always returns an integer percentage between zero and one hundred', () => {
    const result = calculateLocalAffinity(
      ['React', 'Python'],
      [{ name: 'TypeScript' }],
    );

    assert.equal(result.percentage, 0);
    assert.ok(result.percentage !== null && result.percentage >= 0);
    assert.ok(result.percentage !== null && result.percentage <= 100);
  });
});

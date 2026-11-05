import type { Skill } from '../skills/data';

export const SKILLS_STORAGE_KEY = 'umsspira-skills';

function isSkill(value: unknown): value is Skill {
  if (typeof value !== 'object' || value === null) return false;

  const skill = value as Record<string, unknown>;
  return (
    typeof skill.id === 'string' &&
    typeof skill.name === 'string' &&
    typeof skill.category === 'string' &&
    typeof skill.level === 'string' &&
    (typeof skill.years === 'number' || skill.years === null)
  );
}

export function parseProfileSkills(saved: string | null): Skill[] {
  if (!saved) return [];

  const parsed: unknown = JSON.parse(saved);
  if (!Array.isArray(parsed) || !parsed.every(isSkill)) {
    throw new Error('Las habilidades del perfil tienen un formato no válido.');
  }

  return parsed;
}

export function readProfileSkills(): Skill[] {
  return parseProfileSkills(localStorage.getItem(SKILLS_STORAGE_KEY));
}

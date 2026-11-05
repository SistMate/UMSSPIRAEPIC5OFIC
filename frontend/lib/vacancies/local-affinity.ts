export type LocalAffinitySkill = {
  name: string;
};

export type LocalAffinityRequirement = {
  requirement: string;
  matched: boolean;
  matchingSkills: string[];
};

export type LocalAffinityResult = {
  matched: number;
  total: number;
  percentage: number | null;
  requirements: LocalAffinityRequirement[];
};

function getWords(value: string): Set<string> {
  return new Set(
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('es')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean),
  );
}

function wordsMatch(first: string, second: string): boolean {
  if (first === second) return true;

  const shorter = first.length <= second.length ? first : second;
  const longer = shorter === first ? second : first;
  return shorter.length >= 4 && longer.startsWith(shorter);
}

export function calculateLocalAffinity(
  requirements: string[],
  skills: LocalAffinitySkill[],
): LocalAffinityResult {
  const comparedRequirements = requirements.map((requirement) => {
    const requirementWords = getWords(requirement);
    const matchingSkills = skills
      .filter((skill) =>
        [...getWords(skill.name)].some((skillWord) =>
          [...requirementWords].some((requirementWord) =>
            wordsMatch(skillWord, requirementWord),
          ),
        ),
      )
      .map((skill) => skill.name);

    return {
      requirement,
      matched: matchingSkills.length > 0,
      matchingSkills,
    };
  });
  const matched = comparedRequirements.filter(
    (requirement) => requirement.matched,
  ).length;
  const total = comparedRequirements.length;

  return {
    matched,
    total,
    percentage: total > 0 ? Math.round((matched / total) * 100) : null,
    requirements: comparedRequirements,
  };
}

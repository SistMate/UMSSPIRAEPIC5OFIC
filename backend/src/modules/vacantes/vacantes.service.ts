import { Injectable } from '@nestjs/common';
import { VacancyAffinityDto } from './dto/order-vacancies.dto';

@Injectable()
export class VacantesService {
  ordenarPorAfinidad(vacancies: VacancyAffinityDto[]) {
    const ordered = vacancies
      .map((vacancy, index) => ({ vacancy, index }))
      .filter(({ vacancy }) => vacancy.available !== false)
      .sort((left, right) => {
        const leftScore = left.vacancy.affinityPercentage ?? null;
        const rightScore = right.vacancy.affinityPercentage ?? null;

        if (leftScore === null && rightScore !== null) return 1;
        if (leftScore !== null && rightScore === null) return -1;
        if (leftScore !== null && rightScore !== null && leftScore !== rightScore) {
          return rightScore - leftScore;
        }

        const titleOrder = (left.vacancy.title ?? '').localeCompare(
          right.vacancy.title ?? '',
          'es',
        );
        return titleOrder || left.vacancy.id.localeCompare(right.vacancy.id) || left.index - right.index;
      });

    return ordered.map(({ vacancy }) => vacancy.id);
  }
}
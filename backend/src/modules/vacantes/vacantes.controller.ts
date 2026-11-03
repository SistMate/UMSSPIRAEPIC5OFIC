import { Body, Controller, Post } from '@nestjs/common';
import { OrderVacanciesDto } from './dto/order-vacancies.dto';
import { VacantesService } from './vacantes.service';

@Controller('vacantes')
export class VacantesController {
  constructor(private readonly vacantesService: VacantesService) {}

  @Post('ordenar-por-afinidad')
  ordenarPorAfinidad(@Body() dto: OrderVacanciesDto) {
    return {
      ids: this.vacantesService.ordenarPorAfinidad(dto.vacancies),
    };
  }
}
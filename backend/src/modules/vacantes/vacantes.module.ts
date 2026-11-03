import { Module } from '@nestjs/common';
import { VacantesController } from './vacantes.controller';
import { VacantesService } from './vacantes.service';

@Module({
  controllers: [VacantesController],
  providers: [VacantesService],
})
export class VacantesModule {}
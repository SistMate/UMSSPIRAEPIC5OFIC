
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from '../../config/supabase.module';

import { RequisitosTecnicosService } from './requisitos-tecnicos.service';
import { ElasticsearchService } from './indexacion/elasticsearch.service';
import { VacantesIndexService } from './indexacion/vacantes-index.service';
import { VacantesController } from './vacantes.controller';
import { VacantesEstructuraService } from './vacantes-estructura.service';
import { VacantesService } from './vacantes.service';
import { AfinidadService } from './afinidad.service';

@Module({
  imports: [
    ConfigModule,
    SupabaseModule,
  ],
  controllers: [VacantesController],
  providers: [
    RequisitosTecnicosService,
    VacantesEstructuraService,
    VacantesService,
    ElasticsearchService,
    VacantesIndexService,
    AfinidadService,
  ],
  exports: [
    VacantesEstructuraService,
    RequisitosTecnicosService,
    VacantesService,
    AfinidadService,
  ],
})
export class VacantesModule {}

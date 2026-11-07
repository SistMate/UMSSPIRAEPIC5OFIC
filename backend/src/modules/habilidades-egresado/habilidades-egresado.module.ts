
import { Module } from '@nestjs/common';
import { SupabaseModule } from '../../config/supabase.module';
import { SupabaseAuthGuard } from '../experiencia-laboral/supabase-auth.guard';
import { HabilidadesEgresadoController } from './habilidades-egresado.controller';
import { HabilidadesEgresadoService } from './habilidades-egresado.service';

@Module({
  imports: [SupabaseModule],
  controllers: [HabilidadesEgresadoController],
  providers: [HabilidadesEgresadoService, SupabaseAuthGuard],
  exports: [HabilidadesEgresadoService],
})
export class HabilidadesEgresadoModule {}

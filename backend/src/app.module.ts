
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule } from './config/supabase.module';
import { FormacionAcademicaModule } from './modules/formacion-academica/formacion-academica.module';
import { ExperienciaLaboralModule } from './modules/experiencia-laboral/experiencia-laboral.module';
import { VacantesModule } from './modules/vacantes/vacantes.module';
import { HabilidadesEgresadoModule } from './modules/habilidades-egresado/habilidades-egresado.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SupabaseModule,
    FormacionAcademicaModule,
    ExperienciaLaboralModule,
    VacantesModule,
    HabilidadesEgresadoModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

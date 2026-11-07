
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { HabilidadesEgresadoService } from './habilidades-egresado.service';
import {
  AuthenticatedRequest,
  AuthenticatedUser,
} from '../experiencia-laboral/authenticated-user';
import { SupabaseAuthGuard } from '../experiencia-laboral/supabase-auth.guard';

@Controller('habilidades-egresado')
@UseGuards(SupabaseAuthGuard)
export class HabilidadesEgresadoController {
  constructor(
    private readonly habilidadesService: HabilidadesEgresadoService,
  ) {}

  @Get()
  listar(@Req() req: AuthenticatedRequest) {
    return this.habilidadesService.listar(
      req.user as AuthenticatedUser,
    );
  }

  @Post()
  registrar(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      idArea: string;
      nivel: string;
      aniosExperiencia?: number;
    },
  ) {
    return this.habilidadesService.registrar(
      req.user as AuthenticatedUser,
      body,
    );
  }

  @Delete(':id')
  eliminar(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.habilidadesService.eliminar(
      req.user as AuthenticatedUser,
      id,
    );
  }
}

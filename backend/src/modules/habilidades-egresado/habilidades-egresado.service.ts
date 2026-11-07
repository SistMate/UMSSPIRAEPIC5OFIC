
import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service';
import { AuthenticatedUser } from '../experiencia-laboral/authenticated-user';

@Injectable()
export class HabilidadesEgresadoService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async listar(usuario: AuthenticatedUser) {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('habilidad_egresado')
      .select(`
        id,
        id_area,
        nivel,
        anios_experiencia,
        area:area_id (
          id,
          nombre
        )
      `)
      .eq('id_egresado', usuario.egresadoId);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data ?? [];
  }

  async registrar(
    usuario: AuthenticatedUser,
    datos: {
      idArea: string;
      nivel: string;
      aniosExperiencia?: number;
    },
  ) {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('habilidad_egresado')
      .insert({
        id_egresado: usuario.egresadoId,
        id_area: datos.idArea,
        nivel: datos.nivel,
        anios_experiencia: datos.aniosExperiencia ?? 0,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
  }

  async eliminar(usuario: AuthenticatedUser, id: string) {
    const { error } = await this.supabaseService
      .getAdminClient()
      .from('habilidad_egresado')
      .delete()
      .eq('id', id)
      .eq('id_egresado', usuario.egresadoId);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { message: 'Habilidad eliminada correctamente' };
  }
}

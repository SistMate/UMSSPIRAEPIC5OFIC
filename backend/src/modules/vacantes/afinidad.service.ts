
import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../../config/supabase.service';
import { AuthenticatedUser } from '../experiencia-laboral/authenticated-user';

type Nivel = 'Básico' | 'Intermedio' | 'Avanzado';

const NIVEL_VALOR: Record<string, number> = {
  'Básico': 1,
  'Intermedio': 2,
  'Avanzado': 3,
};

@Injectable()
export class AfinidadService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async calcular(usuario: AuthenticatedUser, idVacante: string) {
    const db = this.supabaseService.getAdminClient();

    const { data: habilidades, error: errorHabilidades } = await db
      .from('habilidad_egresado')
      .select('id_area, nivel, anios_experiencia')
      .eq('id_egresado', usuario.egresadoId);

    if (errorHabilidades) {
      throw new InternalServerErrorException(errorHabilidades.message);
    }

    const { data: relaciones, error: errorRelaciones } = await db
      .from('vacante_requerimiento_laboral')
      .select('id_requerimiento_laboral')
      .eq('id_vacante', idVacante);

    if (errorRelaciones) {
      throw new InternalServerErrorException(errorRelaciones.message);
    }

    const idsRequerimientos = [
      ...new Set((relaciones ?? []).map((r) => r.id_requerimiento_laboral)),
    ];

    if (idsRequerimientos.length === 0) {
      return {
        idVacante,
        porcentaje: null,
        cumplidos: 0,
        total: 0,
        requisitos: [],
      };
    }

    const { data: requerimientos, error: errorRequerimientos } = await db
      .from('requerimiento_habilidad')
      .select('id, id_area, nivel_requerimiento, id_requerimiento')
      .in('id_requerimiento', idsRequerimientos);

    if (errorRequerimientos) {
      throw new InternalServerErrorException(errorRequerimientos.message);
    }

    const idsAreas = [
      ...new Set([
        ...(habilidades ?? []).map((h) => h.id_area),
        ...(requerimientos ?? []).map((r) => r.id_area),
      ]),
    ];

    const { data: areas, error: errorAreas } = await db
      .from('area')
      .select('id, nombre')
      .in('id', idsAreas);

    if (errorAreas) {
      throw new InternalServerErrorException(errorAreas.message);
    }

    const nombresAreas = new Map(
      (areas ?? []).map((area) => [area.id, area.nombre]),
    );

    const requisitos = (requerimientos ?? []).map((requisito) => {
      const habilidad = (habilidades ?? []).find(
        (item) => item.id_area === requisito.id_area,
      );

      const nivelRequerido = requisito.nivel_requerimiento;
      const nivelCandidato = habilidad?.nivel;

      const cumpleNivel =
        !nivelRequerido ||
        (habilidad !== undefined &&
          (NIVEL_VALOR[nivelCandidato ?? ''] ?? 0) >=
            (NIVEL_VALOR[nivelRequerido] ?? 0));

      const cumple = Boolean(habilidad && cumpleNivel);

      return {
        id: requisito.id,
        area: nombresAreas.get(requisito.id_area) ?? 'Área sin nombre',
        nivelRequerido,
        nivelCandidato: nivelCandidato ?? null,
        cumplido: cumple,
      };
    });

    const cumplidos = requisitos.filter((r) => r.cumplido).length;
    const total = requisitos.length;

    return {
      idVacante,
      porcentaje: Math.round((cumplidos / total) * 100),
      cumplidos,
      total,
      requisitos,
    };
  }
}

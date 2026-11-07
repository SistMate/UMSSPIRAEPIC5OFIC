
import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import { SupabaseService } from '../../config/supabase.service';
import { AuthenticatedUser } from '../experiencia-laboral/authenticated-user';

const EGRESADO_PRUEBA_ID = 'ee9bf378-5daf-4724-ac0f-7a52d6bd005e';

function normalizarNivel(
  nivel: string | null | undefined,
): number {
  const valor = (nivel ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

  const niveles: Record<string, number> = {
    basico: 1,
    intermedio: 2,
    avanzado: 3,
  };

  return niveles[valor] ?? 0;
}

@Injectable()
export class AfinidadService {
  constructor(
    private readonly supabaseService: SupabaseService,
  ) {}

  // Cálculo para usuarios autenticados.
  async calcular(
    usuario: AuthenticatedUser,
    idVacante: string,
  ) {
    return this.calcularPorEgresado(
      usuario.egresadoId,
      idVacante,
    );
  }

  // Cálculo temporal para el egresado de prueba.
  async calcularSimulacion(idVacante: string) {
    return this.calcularPorEgresado(
      EGRESADO_PRUEBA_ID,
      idVacante,
    );
  }

  // Lógica compartida de cálculo de afinidad.
  private async calcularPorEgresado(
    idEgresado: string,
    idVacante: string,
  ) {
    const db = this.supabaseService.getAdminClient();

    const {
      data: habilidades,
      error: errorHabilidades,
    } = await db
      .from('habilidad_egresado')
      .select('id_area, nivel, anios_experiencia')
      .eq('id_egresado', idEgresado);

    if (errorHabilidades) {
      throw new InternalServerErrorException(
        errorHabilidades.message,
      );
    }

    const {
      data: relaciones,
      error: errorRelaciones,
    } = await db
      .from('vacante_requerimiento_laboral')
      .select('id_requerimiento_laboral')
      .eq('id_vacante', idVacante);

    if (errorRelaciones) {
      throw new InternalServerErrorException(
        errorRelaciones.message,
      );
    }

    const idsRequerimientos = [
      ...new Set(
        (relaciones ?? []).map(
          (relacion) => relacion.id_requerimiento_laboral,
        ),
      ),
    ];

    if (idsRequerimientos.length === 0) {
      return {
        idVacante,
        idEgresado,
        porcentaje: null,
        cumplidos: 0,
        total: 0,
        requisitos: [],
      };
    }

    const {
      data: requerimientos,
      error: errorRequerimientos,
    } = await db
      .from('requerimiento_habilidad')
      .select(
        'id, id_area, nivel_requerimiento, id_requerimiento',
      )
      .in('id_requerimiento', idsRequerimientos);

    if (errorRequerimientos) {
      throw new InternalServerErrorException(
        errorRequerimientos.message,
      );
    }

    const idsAreas = [
      ...new Set([
        ...(habilidades ?? []).map(
          (habilidad) => habilidad.id_area,
        ),
        ...(requerimientos ?? []).map(
          (requerimiento) => requerimiento.id_area,
        ),
      ]),
    ];

    const nombresAreas = new Map<string, string>();

    if (idsAreas.length > 0) {
      const {
        data: areas,
        error: errorAreas,
      } = await db
        .from('area')
        .select('id, nombre')
        .in('id', idsAreas);

      if (errorAreas) {
        throw new InternalServerErrorException(
          errorAreas.message,
        );
      }

      for (const area of areas ?? []) {
        nombresAreas.set(area.id, area.nombre);
      }
    }

    const requisitos = (requerimientos ?? []).map(
      (requisito) => {
        const habilidad = (habilidades ?? []).find(
          (item) => item.id_area === requisito.id_area,
        );

        const nivelRequerido =
          requisito.nivel_requerimiento;

        const nivelCandidato = habilidad?.nivel;

        const cumpleNivel =
          !nivelRequerido ||
          (
            habilidad !== undefined &&
            normalizarNivel(nivelCandidato) >=
              normalizarNivel(nivelRequerido)
          );

        const cumple = Boolean(
          habilidad && cumpleNivel,
        );

        return {
          id: requisito.id,
          area:
            nombresAreas.get(requisito.id_area) ??
            'Área sin nombre',
          nivelRequerido,
          nivelCandidato: nivelCandidato ?? null,
          cumplido: cumple,
        };
      },
    );

    const cumplidos = requisitos.filter(
      (requisito) => requisito.cumplido,
    ).length;

    const total = requisitos.length;

    return {
      idVacante,
      idEgresado,
      porcentaje:
        total > 0
          ? Math.round((cumplidos / total) * 100)
          : null,
      cumplidos,
      total,
      requisitos,
    };
  }
}

import type { Vacancy as ApiVacancy } from '../../lib/api/vacantes';
import type { Vacancy as LocalVacancy } from './vacancy-data';

export function mapLocalVacancy(vacancy: LocalVacancy): ApiVacancy {
  return {
    id: String(vacancy.id),
    idEmpresa: 'local',
    empresa: vacancy.company,
    titulo: vacancy.title,
    modalidad: vacancy.modality,
    estado: vacancy.availability === 'unavailable' ? 'No disponible' : 'Disponible',
    fechaCreacion: vacancy.createdAt ?? null,
    descripcion: vacancy.description,
    ubicacion: vacancy.location,
    area: vacancy.area,
    condiciones: vacancy.conditions ?? '',
    requisitos: vacancy.requirements.map((nombre, index) => ({
      id: `${vacancy.id}-requisito-${index}`,
      nombre,
    })),
  };
}

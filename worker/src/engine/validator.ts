import { timesOverlap, horasBloque } from '../utils/haversine';
import type { Asignacion, Docente, Sede } from '../types';

export interface ValidacionInput {
  docente: Docente;
  sede: Sede;
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
  modoLibre?: boolean;
  grupo?: number;
  calendario?: 'A' | 'B' | 'semanal';
  asignacionesExistentes: Asignacion[];
}

export interface ValidacionResult {
  valido: boolean;
  errores: string[];
}

export function validarAsignacion(input: ValidacionInput): ValidacionResult {
  const errores: string[] = [];
  const { docente, sede, dia_semana, hora_inicio, hora_fin, modoLibre, asignacionesExistentes } = input;

  // 1. Validar movilidad geográfica
  if (!modoLibre && docente.tipo_vinculacion === 'celula') {
    if (!sede.celula_id || sede.celula_id !== docente.celula_id) {
      errores.push(
        `El docente pertenece a la célula "${docente.celula_id}" y la sede pertenece a "${sede.celula_id ?? 'sede central'}". Activa el Modo Libre para asignaciones fuera de célula.`
      );
    }
  }

  // 2. Validar capacidad máxima de horas.
  // Regla de negocio: la capacidad se descuenta por horas nominales del bloque,
  // sin prorratear clases quincenales A/B.
  const horasNuevas = horasBloque(hora_inicio, hora_fin);
  const horasActuales = docente.horas_asignadas;
  if (horasActuales + horasNuevas > docente.max_horas) {
    errores.push(
      `El docente tiene ${horasActuales}h asignadas. Agregar ${horasNuevas}h supera el máximo de ${docente.max_horas}h.`
    );
  }

  // 3. Validar conflictos de horario respetando calendario
  // Regla: semanal choca con todo; A vs A choca; B vs B choca; A vs B NO choca
  const calendario = input.calendario ?? 'semanal';
  const conflictos = asignacionesExistentes.filter((a) => {
    if (a.docente_id !== docente.id) return false;
    if (a.dia_semana !== dia_semana) return false;
    if (!timesOverlap(hora_inicio, hora_fin, a.hora_inicio, a.hora_fin)) return false;
    const calExistente = a.calendario ?? 'semanal';
    if (calendario === 'semanal' || calExistente === 'semanal') return true;
    return calendario === calExistente;
  });
  if (conflictos.length > 0) {
    errores.push(
      `Conflicto de horario el día ${dia_semana} entre ${hora_inicio}-${hora_fin} con asignación existente ${conflictos[0].hora_inicio}-${conflictos[0].hora_fin} (calendario ${conflictos[0].calendario ?? 'semanal'}).`
    );
  }

  return { valido: errores.length === 0, errores };
}

export function debeActivarModoLibre(docente: Docente): boolean {
  return docente.horas_asignadas < docente.max_horas;
}

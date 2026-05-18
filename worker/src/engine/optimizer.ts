import { haversineKm, timeToMinutes } from '../utils/haversine';
import type { Asignacion, Docente, Sede, Materia, Disponibilidad } from '../types';
import { validarAsignacion } from './validator';

export interface AsignacionCandidata {
  docente_id: string;
  sede_id: string;
  materia_id: string;
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
  grupo: number;
  calendario: 'A' | 'B' | 'semanal';
  distancia_km: number;
  score: number;
}

export interface SolicitudAsignacion {
  docente: Docente;
  materia: Materia;
  sedes_disponibles: Sede[];
  sede_docente_ref: Sede | null;
  disponibilidad: Disponibilidad[];
  asignaciones_existentes: Asignacion[];
  periodo: string;
  grupo?: number;
  tipo_ciclo_programa?: 'semanal' | 'quincenal';
  calendario_inicio_periodo?: 'A' | 'B';
}

const VELOCIDAD_PROMEDIO_KMH = 80;
const MIN_TRANSFERENCIA_MIN = 30;

function calendariosSeCruzan(a?: 'A' | 'B' | 'semanal', b?: 'A' | 'B' | 'semanal'): boolean {
  const calA = a ?? 'semanal';
  const calB = b ?? 'semanal';
  return calA === 'semanal' || calB === 'semanal' || calA === calB;
}

export function calcularScoreAsignacion(
  distanciaKm: number,
  sedesEnDia: Sede[],
  sedeActual: Sede
): number {
  let score = 0;
  score -= distanciaKm * 2;
  const distanciaPromedio =
    sedesEnDia.length > 0
      ? sedesEnDia.reduce((acc, s) => acc + haversineKm(s.latitud, s.longitud, sedeActual.latitud, sedeActual.longitud), 0) / sedesEnDia.length
      : 0;
  score -= distanciaPromedio;
  return score;
}

export function verificarTiempoTraslado(
  sedeA: Sede,
  sedeB: Sede,
  horaFinA: string,
  horaInicioB: string
): boolean {
  const distancia = haversineKm(sedeA.latitud, sedeA.longitud, sedeB.latitud, sedeB.longitud);
  const tiempoTraslado = (distancia / VELOCIDAD_PROMEDIO_KMH) * 60 + MIN_TRANSFERENCIA_MIN;
  const minutosFin = timeToMinutes(horaFinA);
  const minutosInicio = timeToMinutes(horaInicioB);
  return minutosInicio - minutosFin >= tiempoTraslado;
}

export function generarCandidatos(req: SolicitudAsignacion): AsignacionCandidata[] {
  const candidatos: AsignacionCandidata[] = [];
  const horasMat = req.materia.horas_semana;

  for (const disp of req.disponibilidad) {
    const inicioDisp = timeToMinutes(disp.hora_inicio);
    const finDisp = timeToMinutes(disp.hora_fin);
    const duracionMin = horasMat * 60;

    if (finDisp - inicioDisp < duracionMin) continue;

    const horaInicioBloque = disp.hora_inicio;
    const horaFinBloque = `${String(Math.floor((inicioDisp + duracionMin) / 60)).padStart(2, '0')}:${String((inicioDisp + duracionMin) % 60).padStart(2, '0')}`;

    for (const sede of req.sedes_disponibles) {
      const distancia = req.sede_docente_ref
        ? haversineKm(req.sede_docente_ref.latitud, req.sede_docente_ref.longitud, sede.latitud, sede.longitud)
        : 0;

      const tipoCiclo = req.tipo_ciclo_programa ?? 'semanal';
      const calendario: 'A' | 'B' | 'semanal' =
        tipoCiclo === 'semanal' ? 'semanal' : (req.calendario_inicio_periodo ?? 'A');

      const validacion = validarAsignacion({
        docente: req.docente,
        sede,
        dia_semana: disp.dia_semana,
        hora_inicio: horaInicioBloque,
        hora_fin: horaFinBloque,
        modoLibre: req.docente.modo_libre === 1,
        calendario,
        asignacionesExistentes: req.asignaciones_existentes,
      });

      if (!validacion.valido) continue;

      const sedesEnDia = req.asignaciones_existentes
        .filter((a) =>
          a.docente_id === req.docente.id &&
          a.dia_semana === disp.dia_semana &&
          calendariosSeCruzan(calendario, a.calendario)
        )
        .map((a) => req.sedes_disponibles.find((s) => s.id === a.sede_id))
        .filter(Boolean) as Sede[];

      let tiempoOk = true;
      for (const asigDia of req.asignaciones_existentes.filter(
        (a) =>
          a.docente_id === req.docente.id &&
          a.dia_semana === disp.dia_semana &&
          calendariosSeCruzan(calendario, a.calendario)
      )) {
        const sedeExistente = req.sedes_disponibles.find((s) => s.id === asigDia.sede_id);
        if (!sedeExistente) continue;
        const esDespues = timeToMinutes(horaInicioBloque) > timeToMinutes(asigDia.hora_fin);
        const esAntes = timeToMinutes(horaFinBloque) < timeToMinutes(asigDia.hora_inicio);
        if (esDespues && !verificarTiempoTraslado(sedeExistente, sede, asigDia.hora_fin, horaInicioBloque)) {
          tiempoOk = false;
          break;
        }
        if (esAntes && !verificarTiempoTraslado(sede, sedeExistente, horaFinBloque, asigDia.hora_inicio)) {
          tiempoOk = false;
          break;
        }
      }

      if (!tiempoOk) continue;

      const gruposEnSede = req.asignaciones_existentes.filter(
        (a) => a.sede_id === sede.id && a.materia_id === req.materia.id
      ).map((a) => a.grupo ?? 1);
      const grupo = req.grupo ?? (gruposEnSede.length > 0 ? Math.max(...gruposEnSede) + 1 : 1);

      const score = calcularScoreAsignacion(distancia, sedesEnDia, sede);
      candidatos.push({
        docente_id: req.docente.id,
        sede_id: sede.id,
        materia_id: req.materia.id,
        dia_semana: disp.dia_semana,
        hora_inicio: horaInicioBloque,
        hora_fin: horaFinBloque,
        grupo,
        calendario,
        distancia_km: distancia,
        score,
      });
    }
  }

  return candidatos.sort((a, b) => b.score - a.score);
}

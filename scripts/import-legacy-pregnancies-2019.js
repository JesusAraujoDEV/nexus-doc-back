/**
 * Importa F.U.M./gesta de la era CONSULTA_2019 (EMBARAZO.DAT, 1721 filas) sobre
 * las fichas ya backfilled. A diferencia de import-legacy-pregnancies.js (era
 * CONSULTA_2021_v2), esta era usa una numeración de PACIENTE.DAT distinta de
 * patients.legacy_record_id, así que el cruce es por CEDULA (data/output/
 * paciente_cedula_2019.json), no por código.
 *
 * Y como el código EMBARAZOS ya demostró colisionar entre eras (ver
 * docs/work/2026-08-09-pregnancy-backfill-correction.md), NO se usa como
 * llave aquí tampoco: se matchea por paciente + F.U.M. dentro del rango de
 * fechas de una sola ficha de ese paciente (evita depender de un código que
 * puede repetirse entre eras).
 *
 * Uso: DB_URL=... node scripts/import-legacy-pregnancies-2019.js <embarazos.json> <paciente_cedula.json>
 */
const fs = require('fs');
const { Sequelize } = require('sequelize');
const { setupModels } = require('../db/models');
const { buildNewbornData, buildPregnancyUpdate } = require('./legacy-pregnancy-helpers');

async function main() {
  const [, , embarazosPath, cedulaPath] = process.argv;
  if (!embarazosPath || !cedulaPath) {
    console.error('Uso: node scripts/import-legacy-pregnancies-2019.js <embarazos.json> <paciente_cedula.json>');
    process.exit(1);
  }

  const embarazos = JSON.parse(fs.readFileSync(embarazosPath, 'utf8'));
  const pacientes = JSON.parse(fs.readFileSync(cedulaPath, 'utf8'));
  const cedulaCounts = new Map();
  for (const p of pacientes) cedulaCounts.set(p.cedula, (cedulaCounts.get(p.cedula) || 0) + 1);
  const cedulaByCodigo = new Map(pacientes.map((p) => [p.codigo, p.cedula]));

  const sequelize = new Sequelize(process.env.DB_URL, { dialect: 'postgres', logging: false });
  setupModels(sequelize);

  const stats = {
    actualizadas: 0, sinFum: 0, sinCedula: 0, cedulaDuplicada: 0, pacienteNoEncontrado: 0,
    sinFichaEnRango: 0, variasFichasEnRango: 0, yaEditada: 0,
  };

  await sequelize.transaction(async (transaction) => {
    for (const fila of embarazos) {
      if (!fila.fum) { stats.sinFum++; continue; }
      const cedula = cedulaByCodigo.get(fila.pacienteLegacyCode);
      if (!cedula) { stats.sinCedula++; continue; }
      if (cedulaCounts.get(cedula) > 1) { stats.cedulaDuplicada++; continue; }

      const [patient] = await sequelize.query(`SELECT id FROM patients WHERE cedula = $1`, {
        bind: [cedula], transaction,
      });
      if (!patient.length) { stats.pacienteNoEncontrado++; continue; }
      const patientId = patient[0].id;

      // Episodio de ese paciente cuyo rango de visitas cae dentro de +-300 dias del F.U.M.
      const [candidates] = await sequelize.query(
        `
        SELECT p.id, p.updated_at, p.created_at, p.lmp_date, p.newborn_data
        FROM pregnancies p
        WHERE p.patient_id = $1
          AND EXISTS (
            SELECT 1 FROM clinical_records cr
            WHERE cr.pregnancy_id = p.id
              AND cr.visit_date BETWEEN ($2::date - INTERVAL '300 days') AND ($2::date + INTERVAL '300 days')
          )
        `,
        { bind: [patientId, fila.fum], transaction },
      );
      if (candidates.length === 0) { stats.sinFichaEnRango++; continue; }
      if (candidates.length > 1) { stats.variasFichasEnRango++; continue; }
      const pregnancy = candidates[0];

      const untouched = pregnancy.updated_at.getTime() === pregnancy.created_at.getTime()
        && pregnancy.lmp_date === null && pregnancy.newborn_data === null;
      if (!untouched) { stats.yaEditada++; continue; }

      const newbornData = buildNewbornData(fila);
      const update = buildPregnancyUpdate(fila, newbornData);
      // legacy_code de esta era (CONSULTA_2019) reutiliza el mismo rango numérico
      // 1..1721 que la era CONSULTA_2021_v2 ya usó para 576 filas (columna UNIQUE) -
      // no es seguro guardarlo aca. Se deja null; el match ya quedó verificado por
      // cedula + rango de fechas, no depende de este numero.
      update[11] = null;
      update[12] = `Importado desde EMBARAZO.DAT (VRunner, archivo CONSULTA_2019). Código legado ${fila.codigo} de esa era (no guardado, coincide en rango con la era 2021_v2).`;
      await sequelize.query(
        `
        UPDATE pregnancies SET
          lmp_date = $1, lmp_source = $2, lmp_reference_date = $3,
          lmp_reference_weeks = $4, lmp_reference_days = $5, fetal_sex = $6,
          is_finalized = $7, is_loss = $8, is_ectopic = $9, newborn_data = $10,
          pregnancy_number = $11, legacy_code = $12, notes = $13, updated_at = now()
        WHERE id = $14
        `,
        { bind: [...update, pregnancy.id], transaction },
      );
      stats.actualizadas++;
    }
  });

  console.log('Resultado:', stats);
  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

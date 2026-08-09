'use strict';

const { groupIntoEpisodes, buildPregnancyRows } = require('./lib/group-pregnancy-episodes');

// Corrects 2026-08-10's date-gap-based backfill (20260810130000). Two bugs found while
// investigating a real report ("Eylin Gomez shows pregnant but with no evolution/F.U.M.").
// See docs/work/2026-08/2026-08-10-pregnancy-backfill.md for the corrected write-up.
//
// 1. category backfill missed 1,882 real obstetric records that lack the original 4 marker
//    keys (TRIMESTRE/DBP/EDAD-GEST-SEM/SAC-GES) but carry `POR-EMBARAZO: true` and/or an
//    `EMBARAZOS` key — confirmed both values are clean (`POR-EMBARAZO` is always the string
//    'true'; `EMBARAZOS` is never 0/empty).
// 2. `EMBARAZOS` (present on 10,133 of 10,134 truly-obstetric records, confirmed by
//    reverse-engineering the legacy EMBARAZO.DAT file) is a far more precise grouping key
//    than the date-gap heuristic. IMPORTANT: it is NOT safe as a global identifier — 575 of
//    its 1,719 distinct values (33%) are shared by more than one patient, so it is used only
//    as a per-patient grouping key (patient_id, code), never stored in `pregnancies.legacy_code`
//    (UNIQUE). F.U.M/F.P.P still cannot be imported — the freshest EMBARAZO.DAT export is
//    locked on the source machine; lmp_date stays null here too.
const OLD_NOTES_MARKER =
  'Ficha creada automáticamente por migración de datos históricos (2026-08-10). ' +
  'F.U.M. no disponible en los datos migrados — verificar con la paciente y actualizar.';

const NOTES_MARKER =
  'Ficha creada automáticamente por migración de datos históricos (2026-08-10, corregida). ' +
  'Agrupada por código de embarazo legado. F.U.M. no disponible — verificar con la paciente y actualizar.';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // ── 1. Undo 20260810130000, but only rows still untouched since then ──────────────
      const [[{ count: markerCount }]] = await queryInterface.sequelize.query(
        `SELECT count(*)::int AS count FROM pregnancies WHERE notes = $1`,
        { bind: [OLD_NOTES_MARKER], transaction },
      );
      const [[{ count: safeCount }]] = await queryInterface.sequelize.query(
        `
        SELECT count(*)::int AS count FROM pregnancies
        WHERE notes = $1 AND updated_at = created_at AND lmp_date IS NULL AND newborn_data IS NULL
        `,
        { bind: [OLD_NOTES_MARKER], transaction },
      );
      if (markerCount !== safeCount) {
        throw new Error(
          `Abortando: ${markerCount - safeCount} de ${markerCount} fichas de la migración anterior ` +
          `ya fueron editadas manualmente y no se pueden revertir con seguridad.`,
        );
      }

      await queryInterface.sequelize.query(
        `UPDATE clinical_records SET pregnancy_id = NULL
         WHERE pregnancy_id IN (SELECT id FROM pregnancies WHERE notes = $1)`,
        { bind: [OLD_NOTES_MARKER], transaction },
      );
      await queryInterface.sequelize.query(`DELETE FROM pregnancies WHERE notes = $1`, {
        bind: [OLD_NOTES_MARKER],
        transaction,
      });

      // ── 2. Broaden category ────────────────────────────────────────────────────────────
      await queryInterface.sequelize.query(
        `
        UPDATE clinical_records SET category = 'obstetrics'
        WHERE deleted_at IS NULL AND category = 'gynecology'
          AND (
            ultrasound_findings ? 'EMBARAZOS'
            OR ultrasound_findings->>'POR-EMBARAZO' = 'true'
            OR ultrasound_findings ?| array['TRIMESTRE', 'DBP', 'EDAD-GEST-SEM', 'SAC-GES']
          )
        `,
        { transaction },
      );

      // ── 3. Group unlinked obstetric records and insert episodes ────────────────────────
      const [records] = await queryInterface.sequelize.query(
        `
        SELECT id, patient_id, doctor_id, visit_date, ultrasound_findings->>'EMBARAZOS' AS code
        FROM clinical_records
        WHERE category = 'obstetrics' AND deleted_at IS NULL AND pregnancy_id IS NULL
        ORDER BY patient_id, visit_date, id
        `,
        { transaction },
      );
      if (records.length === 0) return;

      const episodesByPatient = groupIntoEpisodes(records);
      const { pregnancyRows, recordIds, pregnancyIdsForRecords } =
        buildPregnancyRows(episodesByPatient, NOTES_MARKER);

      await queryInterface.bulkInsert('pregnancies', pregnancyRows, { transaction });
      await queryInterface.sequelize.query(
        `
        UPDATE clinical_records cr SET pregnancy_id = v.pregnancy_id
        FROM (SELECT unnest($1::uuid[]) AS record_id, unnest($2::uuid[]) AS pregnancy_id) v
        WHERE cr.id = v.record_id
        `,
        { bind: [recordIds, pregnancyIdsForRecords], transaction },
      );

      // ── 4. Acceptance check: the reported case must be fixed ───────────────────────────
      const [[eylin]] = await queryInterface.sequelize.query(
        `
        SELECT
          (SELECT count(*) FROM pregnancies WHERE patient_id = p.id) AS pregnancy_count,
          (SELECT count(*) FROM clinical_records
             WHERE patient_id = p.id AND category = 'obstetrics' AND pregnancy_id IS NULL) AS unlinked_obstetric,
          (SELECT count(*) FROM pregnancies
             WHERE patient_id = p.id AND is_finalized = false) AS active_count
        FROM patients p WHERE p.id = '8f6090a5-823c-4403-9952-3bfdd4d9b9d5'
        `,
        { transaction },
      );
      if (!eylin || Number(eylin.pregnancy_count) < 1 || Number(eylin.unlinked_obstetric) > 0 || Number(eylin.active_count) !== 1) {
        throw new Error(`Abortando: verificación de aceptación (Eylin Gomez) falló: ${JSON.stringify(eylin)}`);
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `UPDATE clinical_records SET pregnancy_id = NULL
         WHERE pregnancy_id IN (SELECT id FROM pregnancies WHERE notes = $1)`,
        { bind: [NOTES_MARKER], transaction },
      );
      await queryInterface.bulkDelete('pregnancies', { notes: NOTES_MARKER }, { transaction });
      // category broadening (step 2) is not reverted: it is a strictly-more-correct
      // classification independent of the episode grouping, safe to leave in place.
    });
  },
};

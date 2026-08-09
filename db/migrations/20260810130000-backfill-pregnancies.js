'use strict';

const crypto = require('crypto');

// Historical ultrasound_findings never captured F.U.M/TRIMESTRE/EDAD-GEST-SEM/FPP (verified: 0 rows
// across 8,253 obstetric records), so pregnancies cannot be reconstructed with a known LMP. Instead we
// group each patient's obstetric visits into "episodes" (one Pregnancy row each) by gap analysis.
const EPISODE_GAP_DAYS = 294; // 42 weeks: two visits further apart than this cannot belong to the same gestation
const ACTIVE_WINDOW_DAYS = 180; // p95 gap between same-pregnancy visits is 77 days; bias tight to avoid false "active" positives
const NOTES_MARKER =
  'Ficha creada automáticamente por migración de datos históricos (2026-08-10). ' +
  'F.U.M. no disponible en los datos migrados — verificar con la paciente y actualizar.';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const [episodes] = await queryInterface.sequelize.query(
        `
        WITH ordered AS (
          SELECT id, patient_id, doctor_id, visit_date,
            visit_date - LAG(visit_date) OVER (PARTITION BY patient_id ORDER BY visit_date, id) AS gap_days
          FROM clinical_records
          WHERE category = 'obstetrics' AND deleted_at IS NULL AND pregnancy_id IS NULL
        ),
        flagged AS (
          SELECT *, CASE WHEN gap_days IS NULL OR gap_days > :episodeGapDays THEN 1 ELSE 0 END AS new_episode
          FROM ordered
        ),
        episoded AS (
          SELECT *, SUM(new_episode) OVER (PARTITION BY patient_id ORDER BY visit_date, id ROWS UNBOUNDED PRECEDING) AS episode_seq
          FROM flagged
        )
        SELECT patient_id, episode_seq,
          max(visit_date) AS last_visit,
          (array_agg(doctor_id ORDER BY visit_date DESC))[1] AS doctor_id,
          array_agg(id) AS record_ids
        FROM episoded
        GROUP BY patient_id, episode_seq
        ORDER BY patient_id, episode_seq
        `,
        { replacements: { episodeGapDays: EPISODE_GAP_DAYS }, transaction },
      );

      if (episodes.length === 0) return;

      const lastEpisodeSeqByPatient = new Map();
      for (const ep of episodes) {
        const current = lastEpisodeSeqByPatient.get(ep.patient_id) || 0;
        if (ep.episode_seq > current) lastEpisodeSeqByPatient.set(ep.patient_id, ep.episode_seq);
      }

      const now = new Date();
      const pregnancyRows = [];
      const recordIds = [];
      const pregnancyIdsForRecords = [];

      for (const ep of episodes) {
        const id = crypto.randomUUID();
        const isLastEpisode = ep.episode_seq === lastEpisodeSeqByPatient.get(ep.patient_id);
        const daysSinceLastVisit = Math.floor((now - new Date(ep.last_visit)) / 86400000);
        const isFinalized = !(isLastEpisode && daysSinceLastVisit <= ACTIVE_WINDOW_DAYS);

        pregnancyRows.push({
          id,
          patient_id: ep.patient_id,
          doctor_id: ep.doctor_id,
          pregnancy_number: ep.episode_seq,
          lmp_date: null,
          lmp_source: 'reported',
          lmp_reference_date: null,
          lmp_reference_weeks: null,
          lmp_reference_days: null,
          fetal_sex: null,
          is_finalized: isFinalized,
          is_loss: false,
          is_ectopic: false,
          newborn_data: null,
          notes: NOTES_MARKER,
          legacy_code: null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        });

        for (const recordId of ep.record_ids) {
          recordIds.push(recordId);
          pregnancyIdsForRecords.push(id);
        }
      }

      await queryInterface.bulkInsert('pregnancies', pregnancyRows, { transaction });

      await queryInterface.sequelize.query(
        `
        UPDATE clinical_records cr SET pregnancy_id = v.pregnancy_id
        FROM (SELECT unnest($1::uuid[]) AS record_id, unnest($2::uuid[]) AS pregnancy_id) v
        WHERE cr.id = v.record_id
        `,
        { bind: [recordIds, pregnancyIdsForRecords], transaction },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `
        UPDATE clinical_records SET pregnancy_id = NULL
        WHERE pregnancy_id IN (SELECT id FROM pregnancies WHERE notes = :marker)
        `,
        { replacements: { marker: NOTES_MARKER }, transaction },
      );
      await queryInterface.bulkDelete('pregnancies', { notes: NOTES_MARKER }, { transaction });
    });
  },
};

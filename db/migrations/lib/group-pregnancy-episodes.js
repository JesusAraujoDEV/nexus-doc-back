'use strict';

const crypto = require('crypto');

const EPISODE_GAP_DAYS = 294;
const ACTIVE_WINDOW_DAYS = 180;

/**
 * Groups obstetric clinical_records into pregnancy episodes: primarily by the legacy
 * (patient_id, EMBARAZOS code) pair; records without a code join the nearest prior
 * same-patient episode within EPISODE_GAP_DAYS, else start their own episode.
 */
function groupIntoEpisodes(records) {
  const episodesByPatient = new Map(); // patient_id -> array of { code, records[] }
  for (const r of records) {
    if (!episodesByPatient.has(r.patient_id)) episodesByPatient.set(r.patient_id, []);
    const episodes = episodesByPatient.get(r.patient_id);

    if (r.code) {
      let ep = episodes.find((e) => e.code === r.code);
      if (!ep) { ep = { code: r.code, records: [] }; episodes.push(ep); }
      ep.records.push(r);
      continue;
    }

    const visitTime = new Date(r.visit_date).getTime();
    let nearest = null;
    let nearestGap = Infinity;
    for (const ep of episodes) {
      const lastVisit = Math.max(...ep.records.map((x) => new Date(x.visit_date).getTime()));
      const gapDays = (visitTime - lastVisit) / 86400000;
      if (gapDays >= 0 && gapDays <= EPISODE_GAP_DAYS && gapDays < nearestGap) {
        nearest = ep;
        nearestGap = gapDays;
      }
    }
    if (nearest) nearest.records.push(r);
    else episodes.push({ code: null, records: [r] });
  }
  return episodesByPatient;
}

/** Builds Pregnancy rows + clinical_record link arrays from grouped episodes. */
function buildPregnancyRows(episodesByPatient, notesMarker) {
  const now = new Date();
  const pregnancyRows = [];
  const recordIds = [];
  const pregnancyIdsForRecords = [];

  for (const [patientId, episodes] of episodesByPatient) {
    episodes.sort((a, b) => {
      const aStart = Math.min(...a.records.map((r) => new Date(r.visit_date).getTime()));
      const bStart = Math.min(...b.records.map((r) => new Date(r.visit_date).getTime()));
      if (aStart !== bStart) return aStart - bStart;
      return (a.code || '').localeCompare(b.code || ''); // deterministic tiebreak
    });

    episodes.forEach((ep, idx) => {
      const lastVisit = new Date(Math.max(...ep.records.map((r) => new Date(r.visit_date).getTime())));
      const isLastEpisode = idx === episodes.length - 1;
      const daysSinceLastVisit = Math.floor((now - lastVisit) / 86400000);
      const isFinalized = !(isLastEpisode && daysSinceLastVisit <= ACTIVE_WINDOW_DAYS);
      const mostRecentRecord = ep.records.reduce((a, b) =>
        new Date(a.visit_date) >= new Date(b.visit_date) ? a : b);

      const id = crypto.randomUUID();
      pregnancyRows.push({
        id,
        patient_id: patientId,
        doctor_id: mostRecentRecord.doctor_id,
        pregnancy_number: idx + 1,
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
        notes: notesMarker,
        legacy_code: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });

      for (const r of ep.records) {
        recordIds.push(r.id);
        pregnancyIdsForRecords.push(id);
      }
    });
  }

  return { pregnancyRows, recordIds, pregnancyIdsForRecords };
}

module.exports = { groupIntoEpisodes, buildPregnancyRows, EPISODE_GAP_DAYS, ACTIVE_WINDOW_DAYS };

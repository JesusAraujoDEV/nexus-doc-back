/** Los 9 subtipos de ecografía general (catálogo legado TP-ECO.DAT), independientes
 * del módulo gineco-obstétrico ya existente (que vive en clinical_records.ultrasound_findings). */
const GENERAL_ULTRASOUND_SUB_TYPES = [
  'abdominal',
  'hepatobiliar',
  'partes_blandas',
  'mamario',
  'pelvico_transvaginal',
  'prostatico',
  'renal',
  'tiroideo',
  'testicular',
];

module.exports = { GENERAL_ULTRASOUND_SUB_TYPES };

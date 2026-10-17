const crypto = require('crypto');
const sequelize = require('../libs/sequelize');
const OwnershipService = require('./ownership_service');
const TrashService = require('./trash_service');
const { inspectUpload } = require('../libs/storage/file-inspect');
const { putObject, getObjectStream } = require('../libs/storage/r2-client');

const { models } = sequelize;
const ownership = new OwnershipService();
const trashService = new TrashService();

/** Nombre visible: sin rutas ni caracteres de control, máximo 200 caracteres. */
function cleanName(name) {
  const base = String(name || 'archivo').split(/[\\/]/).pop();
  // eslint-disable-next-line no-control-regex
  return base.replace(/[\u0000-\u001f\u007f"]/g, '').trim().slice(0, 200) || 'archivo';
}

class PatientFileService {
  /** Sube un adjunto a una consulta. La paciente se deriva de la consulta. */
  async uploadToRecord(recordId, file, userId) {
    const record = await ownership.record(recordId, userId);
    const inspected = await inspectUpload(file);
    // Clave opaca: no revela paciente ni nombre del archivo si el bucket se filtra.
    const storageKey = `doctors/${record.doctorId}/${crypto.randomUUID()}.${inspected.ext}`;
    await putObject(storageKey, inspected.buffer, inspected.mime);

    const created = await models.PatientFile.create({
      doctorId: record.doctorId,
      patientId: record.patientId,
      clinicalRecordId: record.id,
      storageKey,
      fileName: cleanName(file.originalname),
      fileType: inspected.kind,
      mimeType: inspected.mime,
      sizeBytes: inspected.buffer.length,
    });
    return models.PatientFile.findByPk(created.id);
  }

  async findByRecord(recordId, userId) {
    const record = await ownership.record(recordId, userId);
    return models.PatientFile.findAll({
      where: { clinicalRecordId: record.id, doctorId: record.doctorId },
      order: [['createdAt', 'ASC']],
    });
  }

  async findByPatient(patientId, userId) {
    const patient = await ownership.patient(patientId, userId);
    return models.PatientFile.findAll({
      where: { patientId: patient.id, doctorId: patient.doctorId },
      order: [['createdAt', 'DESC']],
    });
  }

  /** Metadatos + stream del contenido, para reenviarlo al cliente autenticado. */
  async content(id, userId) {
    const doctorId = await ownership.doctorIdFor(userId);
    const file = await models.PatientFile.scope('withKey').findOne({ where: { id, doctorId } });
    if (!file) throw ownership.notFound('Archivo');
    const stream = await getObjectStream(file.storageKey);
    return { file, stream };
  }

  async rename(id, fileName, userId) {
    const doctorId = await ownership.doctorIdFor(userId);
    const file = await models.PatientFile.findOne({ where: { id, doctorId } });
    if (!file) throw ownership.notFound('Archivo');
    await file.update({ fileName: cleanName(fileName) });
    return file;
  }

  /** Borrado lógico: el objeto queda en R2 para poder restaurarlo. */
  async remove(id, userId) {
    const doctorId = await ownership.doctorIdFor(userId);
    const file = await models.PatientFile.findOne({ where: { id, doctorId } });
    if (!file) throw ownership.notFound('Archivo');
    await file.destroy();
    return { id, deleted: true };
  }

  async findTrash(userId) {
    return trashService.listDeleted(models.PatientFile, userId);
  }

  async restore(id, userId) {
    return trashService.restore(models.PatientFile, id, userId);
  }
}

module.exports = PatientFileService;

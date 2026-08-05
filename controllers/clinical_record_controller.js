const ClinicalRecordService = require('./../services/clinical_record_service');
const service = new ClinicalRecordService();

class ClinicalRecordController {
  async create(req, res, next) {
    try {
      const body = req.body;
      const userId = req.user.sub;
      const record = await service.createByUser(body, userId);
      res.status(201).json(record);
    } catch (error) {
      next(error);
    }
  }

  async listByPatient(req, res, next) {
    try {
      const { patientId } = req.params;
      const records = await service.findByPatient(patientId);
      res.json(records);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const changes = req.body;
      const record = await service.update(id, changes);
      res.json(record);
    } catch (error) {
      next(error);
    }
  }

  async remove(req, res, next) {
    try {
      const { id } = req.params;
      const result = await service.softDelete(id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ClinicalRecordController;

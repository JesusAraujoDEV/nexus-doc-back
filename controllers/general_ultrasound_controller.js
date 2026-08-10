const GeneralUltrasoundService = require('../services/general_ultrasound_service');
const service = new GeneralUltrasoundService();

class GeneralUltrasoundController {
  async byRecord(req, res, next) {
    try {
      const { recordId } = req.params;
      const items = await service.findByRecord(recordId);
      res.json(items);
    } catch (error) {
      next(error);
    }
  }

  async save(req, res, next) {
    try {
      const { clinicalRecordId, subType, findings } = req.body;
      const item = await service.save(clinicalRecordId, subType, findings);
      res.status(201).json(item);
    } catch (error) {
      next(error);
    }
  }

  async remove(req, res, next) {
    try {
      const { id } = req.params;
      const result = await service.remove(id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = GeneralUltrasoundController;

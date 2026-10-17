const GeneralUltrasoundService = require('../services/general_ultrasound_service');
const service = new GeneralUltrasoundService();

class GeneralUltrasoundController {
  async byRecord(req, res, next) {
    try {
      const items = await service.findByRecord(req.params.recordId, req.user.sub);
      res.json(items);
    } catch (error) {
      next(error);
    }
  }

  async save(req, res, next) {
    try {
      const { clinicalRecordId, subType, findings } = req.body;
      const item = await service.save(clinicalRecordId, subType, findings, req.user.sub);
      res.status(201).json(item);
    } catch (error) {
      next(error);
    }
  }

  async remove(req, res, next) {
    try {
      const result = await service.remove(req.params.id, req.user.sub);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = GeneralUltrasoundController;

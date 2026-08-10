const ClinicalRecordSuggestionsService = require('./../services/clinical_record_suggestions_service');
const service = new ClinicalRecordSuggestionsService();

class ClinicalRecordSuggestionsController {
  async ultrasoundFieldValues(req, res, next) {
    try {
      const userId = req.user.sub;
      const { field } = req.query;
      const values = await service.ultrasoundFieldValues(userId, field);
      res.json(values);
    } catch (error) {
      next(error);
    }
  }

  async generalUltrasoundFieldValues(req, res, next) {
    try {
      const userId = req.user.sub;
      const { field } = req.query;
      const values = await service.generalUltrasoundFieldValues(userId, field);
      res.json(values);
    } catch (error) {
      next(error);
    }
  }

  async medications(req, res, next) {
    try {
      const userId = req.user.sub;
      const { q } = req.query;
      const values = await service.medications(userId, q);
      res.json(values);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ClinicalRecordSuggestionsController;

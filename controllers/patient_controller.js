const PatientService = require('./../services/patient_service');

const service = new PatientService();

class PatientController {
  async createQuick(req, res, next) {
    try {
      const body = req.body;
      const userId = req.user.sub;
      const patient = await service.createQuick(body, userId);
      res.status(201).json(patient);
    } catch (error) {
      next(error);
    }
  }

  async list(req, res, next) {
    try {
      const userId = req.user.sub;
      const patients = await service.findByDoctor(userId);
      res.json(patients);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const patient = await service.findOne(id);
      res.json(patient);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PatientController;

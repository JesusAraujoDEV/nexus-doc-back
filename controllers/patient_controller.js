const PatientService = require('./../services/patient_service');

const service = new PatientService();

class PatientController {
  async createQuick(req, res, next) {
    try {
      const patient = await service.createQuick(req.body, req.user.sub);
      res.status(201).json(patient);
    } catch (error) {
      next(error);
    }
  }

  async list(req, res, next) {
    try {
      const { search, page, limit, sortBy, sortDir, gender, hasVisits, hasCedula, pregnant, labsPending, recent } = req.query;
      const result = await service.findByDoctor(req.user.sub, { search, page, limit, sortBy, sortDir, gender, hasVisits, hasCedula, pregnant, labsPending, recent });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const patient = await service.findOne(req.params.id, req.user.sub);
      res.json(patient);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const patient = await service.update(req.params.id, req.body, req.user.sub);
      res.json(patient);
    } catch (error) {
      next(error);
    }
  }

  async remove(req, res, next) {
    try {
      const result = await service.softDelete(req.params.id, req.user.sub);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async trash(req, res, next) {
    try {
      const items = await service.findTrash(req.user.sub);
      res.json(items);
    } catch (error) {
      next(error);
    }
  }

  async restore(req, res, next) {
    try {
      const patient = await service.restore(req.params.id, req.user.sub);
      res.json(patient);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PatientController;

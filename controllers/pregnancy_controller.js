const PregnancyService = require('./../services/pregnancy_service');
const service = new PregnancyService();

class PregnancyController {
  async create(req, res, next) {
    try {
      const pregnancy = await service.createByUser(req.body, req.user.sub);
      res.status(201).json(pregnancy);
    } catch (error) {
      next(error);
    }
  }

  async listByPatient(req, res, next) {
    try {
      const pregnancies = await service.findByPatient(req.params.patientId, req.user.sub);
      res.json(pregnancies);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const pregnancy = await service.findOne(req.params.id, req.user.sub);
      res.json(pregnancy);
    } catch (error) {
      next(error);
    }
  }

  async pdf(req, res, next) {
    try {
      const pdf = await service.pdf(req.params.id, req.user.sub);
      res.type('application/pdf').send(pdf);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const pregnancy = await service.update(req.params.id, req.body, req.user.sub);
      res.json(pregnancy);
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
      const pregnancy = await service.restore(req.params.id, req.user.sub);
      res.json(pregnancy);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PregnancyController;

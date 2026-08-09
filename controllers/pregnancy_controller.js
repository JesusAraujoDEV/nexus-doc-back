const PregnancyService = require('./../services/pregnancy_service');
const service = new PregnancyService();

class PregnancyController {
  async create(req, res, next) {
    try {
      const userId = req.user.sub;
      const pregnancy = await service.createByUser(req.body, userId);
      res.status(201).json(pregnancy);
    } catch (error) {
      next(error);
    }
  }

  async listByPatient(req, res, next) {
    try {
      const { patientId } = req.params;
      const pregnancies = await service.findByPatient(patientId);
      res.json(pregnancies);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const pregnancy = await service.findOne(id);
      res.json(pregnancy);
    } catch (error) {
      next(error);
    }
  }

  async pdf(req, res, next) {
    try {
      const { id } = req.params;
      const pdf = await service.pdf(id);
      res.type('application/pdf').send(pdf);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const pregnancy = await service.update(id, req.body);
      res.json(pregnancy);
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

  async trash(req, res, next) {
    try {
      const userId = req.user.sub;
      const items = await service.findTrash(userId);
      res.json(items);
    } catch (error) {
      next(error);
    }
  }

  async restore(req, res, next) {
    try {
      const { id } = req.params;
      const pregnancy = await service.restore(id);
      res.json(pregnancy);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PregnancyController;

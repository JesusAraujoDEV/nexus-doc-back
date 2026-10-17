const MedicalReportService = require('../services/medical_report_service');
const service = new MedicalReportService();

class MedicalReportController {
  async create(req, res, next) {
    try {
      const report = await service.createByUser(req.body, req.user.sub);
      res.status(201).json(report);
    } catch (error) {
      next(error);
    }
  }

  async byRecord(req, res, next) {
    try {
      const reports = await service.findByRecord(req.params.recordId, req.user.sub);
      res.json(reports);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const report = await service.update(req.params.id, req.body, req.user.sub);
      res.json(report);
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

  async pdf(req, res, next) {
    try {
      const pdf = await service.pdf(req.params.id, req.user.sub);
      res.type('application/pdf').send(pdf);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = MedicalReportController;

const MedicalReportService = require('../services/medical_report_service');
const service = new MedicalReportService();

class MedicalReportController {
  async create(req, res, next) {
    try {
      const userId = req.user.sub;
      const report = await service.createByUser(req.body, userId);
      res.status(201).json(report);
    } catch (error) {
      next(error);
    }
  }

  async byRecord(req, res, next) {
    try {
      const { recordId } = req.params;
      const reports = await service.findByRecord(recordId);
      res.json(reports);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const report = await service.update(id, req.body);
      res.json(report);
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

  async pdf(req, res, next) {
    try {
      const { id } = req.params;
      const pdf = await service.pdf(id);
      res.type('application/pdf').send(pdf);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = MedicalReportController;

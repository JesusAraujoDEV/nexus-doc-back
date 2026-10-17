const LabExamOrderService = require('../services/lab_exam_order_service');
const service = new LabExamOrderService();

class LabExamOrderController {
  async order(req, res, next) {
    try {
      const order = await service.orderByUser(req.body, req.user.sub);
      res.status(201).json(order);
    } catch (error) {
      next(error);
    }
  }

  async pendingForPatient(req, res, next) {
    try {
      const orders = await service.findPendingForPatient(req.params.patientId, req.user.sub);
      res.json(orders);
    } catch (error) {
      next(error);
    }
  }

  async allForPatient(req, res, next) {
    try {
      const orders = await service.findByPatient(req.params.patientId, req.user.sub);
      res.json(orders);
    } catch (error) {
      next(error);
    }
  }

  async byRecord(req, res, next) {
    try {
      const orders = await service.findByRecord(req.params.recordId, req.user.sub);
      res.json(orders);
    } catch (error) {
      next(error);
    }
  }

  async recordResult(req, res, next) {
    try {
      const order = await service.recordResult(req.params.id, req.body, req.user.sub);
      res.json(order);
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

module.exports = LabExamOrderController;

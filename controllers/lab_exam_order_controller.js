const LabExamOrderService = require('../services/lab_exam_order_service');
const service = new LabExamOrderService();

class LabExamOrderController {
  async order(req, res, next) {
    try {
      const userId = req.user.sub;
      const order = await service.orderByUser(req.body, userId);
      res.status(201).json(order);
    } catch (error) {
      next(error);
    }
  }

  async pendingForPatient(req, res, next) {
    try {
      const { patientId } = req.params;
      const orders = await service.findPendingForPatient(patientId);
      res.json(orders);
    } catch (error) {
      next(error);
    }
  }

  async byRecord(req, res, next) {
    try {
      const { recordId } = req.params;
      const orders = await service.findByRecord(recordId);
      res.json(orders);
    } catch (error) {
      next(error);
    }
  }

  async recordResult(req, res, next) {
    try {
      const { id } = req.params;
      const order = await service.recordResult(id, req.body);
      res.json(order);
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

module.exports = LabExamOrderController;

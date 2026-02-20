const AvailabilityService = require('./../services/availability_service');

const service = new AvailabilityService();

class AvailabilityController {
  async getAvailability(req, res, next) {
    try {
      const { doctorId } = req.params;
      const { date } = req.query;
      const availability = await service.getAvailability(doctorId, date);
      res.json(availability);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AvailabilityController;

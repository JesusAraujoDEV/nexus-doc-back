const DoctorService = require('./../services/doctor_service');

const service = new DoctorService();

class DoctorController {
  async getBySlug(req, res, next) {
    try {
      const { slug } = req.params;
      const doctor = await service.findBySlug(slug);
      res.json(doctor);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = DoctorController;

const AppointmentService = require('./../services/appointment_service');
const DoctorService = require('./../services/doctor_service');

const service = new AppointmentService();
const doctorService = new DoctorService();

class AppointmentController {
  async create(req, res, next) {
    try {
      const body = req.body;
      const appointment = await service.create(body);
      res.status(201).json(appointment);
    } catch (error) {
      next(error);
    }
  }

  async list(req, res, next) {
    try {
      const userId = req.user.sub;
      const doctor = await doctorService.findByUserId(userId);
      const appointments = await service.findByDoctor(doctor.id, req.query);
      res.json(appointments);
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const body = req.body;
      const appointment = await service.updateStatus(id, body);
      res.json(appointment);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AppointmentController;

const ClinicalRecordService = require('./../services/clinical_record_service');
const DoctorService = require('./../services/doctor_service');

const service = new ClinicalRecordService();
const doctorService = new DoctorService();

class ClinicalRecordController {
  async create(req, res, next) {
    try {
      const body = req.body;
      const userId = req.user.sub;
      const doctor = await doctorService.findByUserId(userId);
      const record = await service.create(body, doctor.id);
      res.status(201).json(record);
    } catch (error) {
      next(error);
    }
  }

  async listByPatient(req, res, next) {
    try {
      const { patientId } = req.params;
      const records = await service.findByPatient(patientId);
      res.json(records);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ClinicalRecordController;

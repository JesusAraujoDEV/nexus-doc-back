const ClinicalRecordService = require('./../services/clinical_record_service');
const ClinicalRecordPdfService = require('./../services/clinical_record_pdf_service');

const service = new ClinicalRecordService();
const pdfService = new ClinicalRecordPdfService();

/** Responde un PDF generado por `build(id, userId)`. */
function sendPdf(build) {
  return async (req, res, next) => {
    try {
      const pdf = await build(req.params.id, req.user.sub);
      res.type('application/pdf').send(pdf);
    } catch (error) {
      next(error);
    }
  };
}

class ClinicalRecordController {
  constructor() {
    this.prescriptionPdf = sendPdf((id, userId) => pdfService.prescription(id, userId));
    this.ultrasoundPdf = sendPdf((id, userId) => pdfService.ultrasound(id, userId));
    this.generalUltrasoundPdf = sendPdf((id, userId) => pdfService.generalUltrasound(id, userId));
    this.labExamPdf = sendPdf((id, userId) => pdfService.labExam(id, userId));
  }

  async create(req, res, next) {
    try {
      const record = await service.createByUser(req.body, req.user.sub);
      res.status(201).json(record);
    } catch (error) {
      next(error);
    }
  }

  async listByPatient(req, res, next) {
    try {
      const records = await service.findByPatient(req.params.patientId, req.user.sub);
      res.json(records);
    } catch (error) {
      next(error);
    }
  }

  async calendar(req, res, next) {
    try {
      const { from, to } = req.query;
      const items = await service.findCalendarRangeByUser(req.user.sub, from, to);
      res.json(items);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const record = await service.findOne(req.params.id, req.user.sub);
      res.json(record);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const record = await service.update(req.params.id, req.body, req.user.sub);
      res.json(record);
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
      const record = await service.restore(req.params.id, req.user.sub);
      res.json(record);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ClinicalRecordController;

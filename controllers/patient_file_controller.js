const { pipeline } = require('stream/promises');
const PatientFileService = require('../services/patient_file_service');

const service = new PatientFileService();

// Imágenes y PDF se muestran en el navegador; el resto se descarga.
const INLINE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

function contentDisposition(file) {
  const mode = INLINE_MIMES.includes(file.mimeType) ? 'inline' : 'attachment';
  const ascii = file.fileName.replace(/[^\x20-\x7e]/g, '_');
  return `${mode}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(file.fileName)}`;
}

class PatientFileController {
  async upload(req, res, next) {
    try {
      const file = await service.uploadToRecord(req.params.recordId, req.file, req.user.sub);
      res.status(201).json(file);
    } catch (error) {
      next(error);
    }
  }

  async byRecord(req, res, next) {
    try {
      res.json(await service.findByRecord(req.params.recordId, req.user.sub));
    } catch (error) {
      next(error);
    }
  }

  async byPatient(req, res, next) {
    try {
      res.json(await service.findByPatient(req.params.patientId, req.user.sub));
    } catch (error) {
      next(error);
    }
  }

  async content(req, res, next) {
    try {
      const { file, stream } = await service.content(req.params.id, req.user.sub);
      res.set({
        'Content-Type': file.mimeType,
        'Content-Length': String(file.sizeBytes),
        'Content-Disposition': contentDisposition(file),
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store',
      });
      await pipeline(stream, res);
    } catch (error) {
      if (res.headersSent) return res.destroy(error);
      return next(error);
    }
  }

  async rename(req, res, next) {
    try {
      res.json(await service.rename(req.params.id, req.body.fileName, req.user.sub));
    } catch (error) {
      next(error);
    }
  }

  async remove(req, res, next) {
    try {
      res.json(await service.remove(req.params.id, req.user.sub));
    } catch (error) {
      next(error);
    }
  }

  async trash(req, res, next) {
    try {
      res.json(await service.findTrash(req.user.sub));
    } catch (error) {
      next(error);
    }
  }

  async restore(req, res, next) {
    try {
      res.json(await service.restore(req.params.id, req.user.sub));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PatientFileController;

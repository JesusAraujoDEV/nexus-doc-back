const LegacySyncService = require('../services/legacy_sync_service');

const service = new LegacySyncService();

class LegacySyncController {
  async start(req, res, next) {
    try {
      res.status(202).json(await service.start(req.body));
    } catch (error) {
      next(error);
    }
  }

  async status(req, res, next) {
    try {
      res.json(await service.findOne(req.params.id));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = LegacySyncController;

const StatsService = require('./../services/stats_service');

const service = new StatsService();

class StatsController {
  async summary(req, res, next) {
    try {
      const userId = req.user.sub;
      const stats = await service.forDoctor(userId);
      res.json(stats);
    } catch (error) {
      next(error);
    }
  }

  async visitTypes(req, res, next) {
    try {
      const userId = req.user.sub;
      const types = await service.getVisitTypes(userId);
      res.json(types);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = StatsController;

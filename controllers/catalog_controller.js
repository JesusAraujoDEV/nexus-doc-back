class CatalogController {
  constructor(service) {
    this.service = service;
  }

  list = async (req, res, next) => {
    try {
      const { search, page, limit } = req.query;
      const result = await this.service.list({ search, page, limit });
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = CatalogController;

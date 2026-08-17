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

  create = async (req, res, next) => {
    try {
      const item = await this.service.create(req.body);
      res.status(201).json(item);
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const item = await this.service.update(req.params.id, req.body);
      res.json(item);
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      const result = await this.service.delete(req.params.id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}

module.exports = CatalogController;

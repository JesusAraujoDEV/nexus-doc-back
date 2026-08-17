const { Op } = require('sequelize');
const boom = require('@hapi/boom');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 200;

/**
 * Servicio CRUD genérico para las tablas de catálogo (centros médicos,
 * diagnósticos, fármacos, exámenes, laboratorios, CIE-10, médicos
 * referidos). Todas comparten la misma forma: listar con búsqueda ILIKE +
 * paginación, crear, editar parcialmente y eliminar (hard delete, ninguna
 * es paranoid).
 */
class CatalogService {
  constructor(model, searchFields) {
    this.model = model;
    this.searchFields = searchFields;
  }

  buildWhere(search) {
    if (!search) return undefined;
    const like = { [Op.iLike]: `%${search}%` };
    return { [Op.or]: this.searchFields.map((field) => ({ [field]: like })) };
  }

  async list({ search, page, limit } = {}) {
    const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);
    const limitNum = Math.min(MAX_LIMIT, Math.max(1, Number.parseInt(limit, 10) || DEFAULT_LIMIT));

    const { rows, count } = await this.model.findAndCountAll({
      where: this.buildWhere(search),
      order: [['createdAt', 'ASC']],
      limit: limitNum,
      offset: (pageNum - 1) * limitNum,
    });

    return {
      items: rows,
      total: count,
      page: pageNum,
      pages: Math.ceil(count / limitNum),
    };
  }

  async create(data) {
    return this.model.create(data);
  }

  async update(id, data) {
    const instance = await this.model.findByPk(id);
    if (!instance) throw boom.notFound('Elemento no encontrado');
    return instance.update(data);
  }

  // ponytail: catálogos de referencia sin deleted_at/paranoid -> hard delete.
  async delete(id) {
    const instance = await this.model.findByPk(id);
    if (!instance) throw boom.notFound('Elemento no encontrado');
    await instance.destroy();
    return { id, deleted: true };
  }
}

module.exports = CatalogService;

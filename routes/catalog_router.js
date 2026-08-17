const express = require('express');

const validatorHandler = require('../middlewares/validator_handler');
const { authenticateJwt, checkRoles } = require('../middlewares/auth_handler');
const { listCatalogSchema, catalogIdSchema, CREATE_SCHEMAS, UPDATE_SCHEMAS } = require('../schemas/catalog_schema');
const CatalogController = require('../controllers/catalog_controller');
const CatalogService = require('../services/catalog_service');
const sequelize = require('../libs/sequelize');

const { models } = sequelize;
const router = express.Router();

const CATALOGS = [
  { path: 'medical-centers', model: () => models.MedicalCenter, searchFields: ['name', 'address'] },
  { path: 'diagnoses', model: () => models.DiagnosisCatalog, searchFields: ['name', 'icd10Code'] },
  { path: 'medications', model: () => models.Medication, searchFields: ['commercialName', 'genericName'] },
  { path: 'lab-exams', model: () => models.LabExam, searchFields: ['name'] },
  { path: 'labs', model: () => models.Lab, searchFields: ['name'] },
  { path: 'icd10', model: () => models.Icd10Code, searchFields: ['code', 'title'] },
  { path: 'referring-doctors', model: () => models.ReferringDoctor, searchFields: ['name', 'specialty'] },
];

// Todos son catálogos de referencia que la doctora puede ampliar/corregir
// sobre la marcha (igual que medicamentos/diagnósticos en récipe) -> CRUD
// completo, genérico, para los 7. Delete es hard-delete: ningún modelo de
// catálogo tiene deleted_at/paranoid habilitado.
for (const { path, model, searchFields } of CATALOGS) {
  const controller = new CatalogController(new CatalogService(model(), searchFields));

  router.get(
    `/${path}`,
    authenticateJwt,
    checkRoles('DOCTOR'),
    validatorHandler(listCatalogSchema, 'query'),
    controller.list
  );

  router.post(
    `/${path}`,
    authenticateJwt,
    checkRoles('DOCTOR'),
    validatorHandler(CREATE_SCHEMAS[path], 'body'),
    controller.create
  );

  router.patch(
    `/${path}/:id`,
    authenticateJwt,
    checkRoles('DOCTOR'),
    validatorHandler(catalogIdSchema, 'params'),
    validatorHandler(UPDATE_SCHEMAS[path], 'body'),
    controller.update
  );

  router.delete(
    `/${path}/:id`,
    authenticateJwt,
    checkRoles('DOCTOR'),
    validatorHandler(catalogIdSchema, 'params'),
    controller.remove
  );
}

module.exports = router;

const express = require('express');

const validatorHandler = require('../middlewares/validator_handler');
const { authenticateJwt, checkRoles } = require('../middlewares/auth_handler');
const { listCatalogSchema } = require('../schemas/catalog_schema');
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
];

for (const { path, model, searchFields } of CATALOGS) {
  const controller = new CatalogController(new CatalogService(model(), searchFields));
  router.get(
    `/${path}`,
    authenticateJwt,
    checkRoles('DOCTOR'),
    validatorHandler(listCatalogSchema, 'query'),
    controller.list
  );
}

module.exports = router;

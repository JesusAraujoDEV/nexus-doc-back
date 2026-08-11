const express = require('express');

const validatorHandler = require('../middlewares/validator_handler');
const { authenticateJwt, checkRoles } = require('../middlewares/auth_handler');
const { listCatalogSchema, createLabExamSchema, createReferringDoctorSchema } = require('../schemas/catalog_schema');
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

// Único catálogo que la doctora puede ampliar sobre la marcha (igual que
// medicamentos/diagnósticos en récipe): agregar un examen nuevo al vuelo.
const labExamController = new CatalogController(new CatalogService(models.LabExam, ['name']));
router.post(
  '/lab-exams',
  authenticateJwt,
  checkRoles('DOCTOR'),
  validatorHandler(createLabExamSchema, 'body'),
  labExamController.create
);

// Igual, para el catalogo de medicos referentes (compartido entre "Referido
// por" al crear paciente y "Referencia a:" en informes/constancias).
const referringDoctorController = new CatalogController(new CatalogService(models.ReferringDoctor, ['name']));
router.post(
  '/referring-doctors',
  authenticateJwt,
  checkRoles('DOCTOR'),
  validatorHandler(createReferringDoctorSchema, 'body'),
  referringDoctorController.create
);

module.exports = router;

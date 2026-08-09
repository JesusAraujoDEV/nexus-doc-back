'use strict';

// Ficha de Embarazo (equivalente a "Gesta" en MedDig): entidad propia, no un campo
// más de clinical_records, porque una gesta agrupa VARIAS consultas obstétricas
// (su pestaña "Evolución") y tiene su propio ciclo de vida (F.U.M., finalización,
// datos del recién nacido). Ver docs/decisions de data-architect para el porqué
// de cada columna.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pregnancies', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
      },
      patient_id: {
        allowNull: false,
        type: Sequelize.UUID,
        references: { model: 'patients', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      doctor_id: {
        allowNull: false,
        type: Sequelize.UUID,
        references: { model: 'doctors', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      // Contador de embarazos de la paciente. Se guarda (no se cuenta) porque la
      // doctora puede corregirlo a mano si hubo gestas fuera del sistema.
      pregnancy_number: { allowNull: false, type: Sequelize.INTEGER },
      lmp_date: { allowNull: true, type: Sequelize.DATEONLY },
      // 'reported' (la paciente la sabe) | 'estimated' (calculada por fecha incierta).
      lmp_source: { allowNull: false, type: Sequelize.STRING, defaultValue: 'reported' },
      lmp_reference_date: { allowNull: true, type: Sequelize.DATEONLY },
      lmp_reference_weeks: { allowNull: true, type: Sequelize.SMALLINT },
      lmp_reference_days: { allowNull: true, type: Sequelize.SMALLINT },
      fetal_sex: { allowNull: true, type: Sequelize.STRING },
      is_finalized: { allowNull: false, type: Sequelize.BOOLEAN, defaultValue: false },
      is_loss: { allowNull: false, type: Sequelize.BOOLEAN, defaultValue: false },
      is_ectopic: { allowNull: false, type: Sequelize.BOOLEAN, defaultValue: false },
      newborn_data: { allowNull: true, type: Sequelize.JSONB },
      notes: { allowNull: true, type: Sequelize.TEXT },
      legacy_code: { allowNull: true, type: Sequelize.INTEGER, unique: true },
      deleted_at: { allowNull: true, type: Sequelize.DATE },
      created_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });

    // Como mucho una gesta activa (no finalizada/pérdida/ectópico) por paciente -
    // a la vez sirve de índice para el filtro "embarazadas ahora".
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX pregnancies_one_active_per_patient
      ON pregnancies (patient_id)
      WHERE is_finalized = false AND is_loss = false AND is_ectopic = false AND deleted_at IS NULL
    `);

    await queryInterface.addColumn('clinical_records', 'pregnancy_id', {
      allowNull: true,
      type: Sequelize.UUID,
      references: { model: 'pregnancies', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
    await queryInterface.addColumn('clinical_records', 'category', {
      allowNull: false,
      type: Sequelize.STRING,
      defaultValue: 'gynecology',
    });
    await queryInterface.addIndex('clinical_records', ['pregnancy_id']);

    // Backfill: el histórico importado no tiene ficha, pero sí se puede saber si
    // fue una consulta obstétrica por las claves que trae su ultrasound_findings.
    await queryInterface.sequelize.query(`
      UPDATE clinical_records SET category = 'obstetrics'
      WHERE ultrasound_findings ?| array['TRIMESTRE', 'DBP', 'EDAD-GEST-SEM', 'SAC-GES']
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('clinical_records', ['pregnancy_id']);
    await queryInterface.removeColumn('clinical_records', 'category');
    await queryInterface.removeColumn('clinical_records', 'pregnancy_id');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS pregnancies_one_active_per_patient');
    await queryInterface.dropTable('pregnancies');
  },
};

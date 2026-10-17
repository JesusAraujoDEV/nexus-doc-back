'use strict';

// Adjuntos en Cloudflare R2 (bucket privado). La tabla estaba vacía al
// escribir esta migración, por eso las columnas nuevas pueden ser NOT NULL.
//
// - doctor_id: dueño del archivo, para autorizar sin JOIN a patients.
// - storage_key: clave del objeto en R2 (UUID, nunca el nombre original).
// - file_url pasa a opcional: el archivo no tiene URL pública; se descarga
//   por el backend.
// - deleted_at: borrado lógico; el objeto en R2 no se borra al instante.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('patient_files', 'doctor_id', {
      type: Sequelize.UUID,
      allowNull: false,
      references: { model: 'doctors', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    });
    await queryInterface.addColumn('patient_files', 'storage_key', {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
    });
    await queryInterface.addColumn('patient_files', 'mime_type', {
      type: Sequelize.STRING(100),
      allowNull: false,
    });
    await queryInterface.addColumn('patient_files', 'size_bytes', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });
    await queryInterface.addColumn('patient_files', 'deleted_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.changeColumn('patient_files', 'file_url', {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addIndex('patient_files', ['clinical_record_id']);
    await queryInterface.addIndex('patient_files', ['patient_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('patient_files', ['patient_id']);
    await queryInterface.removeIndex('patient_files', ['clinical_record_id']);
    await queryInterface.changeColumn('patient_files', 'file_url', { type: Sequelize.STRING, allowNull: false });
    await queryInterface.removeColumn('patient_files', 'deleted_at');
    await queryInterface.removeColumn('patient_files', 'size_bytes');
    await queryInterface.removeColumn('patient_files', 'mime_type');
    await queryInterface.removeColumn('patient_files', 'storage_key');
    await queryInterface.removeColumn('patient_files', 'doctor_id');
  },
};

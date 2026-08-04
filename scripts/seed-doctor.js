/**
 * Siembra el User + Doctor de la Dra. Rosana Arteaga en producción.
 * Uso: DB_URL=... node scripts/seed-doctor.js
 */
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { Sequelize } = require('sequelize');
const { setupModels } = require('../db/models');

const EMAIL = 'arteagarosana@hotmail.com';

function randomPassword() {
    return crypto.randomBytes(9).toString('base64url');
}

async function main() {
    const sequelize = new Sequelize(process.env.DB_URL, { dialect: 'postgres', logging: false });
    setupModels(sequelize);
    const { models } = sequelize;

    const existing = await models.User.findOne({ where: { email: EMAIL } });
    if (existing) {
        const doctor = await models.Doctor.findOne({ where: { userId: existing.id } });
        console.log('Ya existe. userId:', existing.id, 'doctorId:', doctor && doctor.id);
        await sequelize.close();
        return;
    }

    const password = randomPassword();
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await models.User.create({ email: EMAIL, passwordHash, role: 'DOCTOR' });
    const doctor = await models.Doctor.create({
        userId: user.id,
        slug: 'rosana-arteaga',
        firstName: 'Rosana',
        lastName: 'Arteaga',
        specialty: 'Ginecología y Obstetricia',
        clinicName: 'Grupo médico Valencia Plaza',
        phone: '0414-4282234',
        experienceYears: 25,
    });

    console.log('Creado. email:', EMAIL);
    console.log('Password temporal (guárdala, no se puede recuperar):', password);
    console.log('userId:', user.id, 'doctorId:', doctor.id);
    await sequelize.close();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});

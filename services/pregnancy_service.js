const boom = require('@hapi/boom');
const { Sequelize } = require('sequelize');
const sequelize = require('../libs/sequelize');
const DoctorService = require('./doctor_service');
const TrashService = require('./trash_service');
const { estimateLmpDate, dueDate, gestationalAgeToday, uncertainDateExplanation } = require('../libs/pregnancy-calc');
const { buildPregnancyPdf } = require('../libs/pdf/pregnancy-pdf');

const { models } = sequelize;
const doctorService = new DoctorService();
const trashService = new TrashService();

/** Agrega los campos calculados (nunca se guardan: quedarían mal el día siguiente). */
function withComputed(pregnancy) {
    const p = pregnancy.toJSON ? pregnancy.toJSON() : pregnancy;
    const ga = gestationalAgeToday(p.lmpDate);
    return {
        ...p,
        gestationalAgeWeeks: ga?.weeks ?? null,
        gestationalAgeDays: ga?.days ?? null,
        dueDate: p.lmpDate ? dueDate(p.lmpDate) : null,
        lmpExplanation: uncertainDateExplanation(p),
    };
}

function resolveLmpDate(data) {
    if (data.lmpSource === 'estimated') {
        if (!data.lmpReferenceDate || data.lmpReferenceWeeks == null || data.lmpReferenceDays == null) {
            throw boom.badRequest('Para calcular la F.U.M por fecha incierta hace falta la fecha de la ecografía y las semanas/días.');
        }
        return estimateLmpDate(data.lmpReferenceDate, data.lmpReferenceWeeks, data.lmpReferenceDays);
    }
    return data.lmpDate || null;
}

class PregnancyService {
    async nextPregnancyNumber(patientId) {
        const max = await models.Pregnancy.max('pregnancyNumber', { where: { patientId }, paranoid: false });
        return (max || 0) + 1;
    }

    async create(data, doctorId) {
        const pregnancyNumber = data.pregnancyNumber || await this.nextPregnancyNumber(data.patientId);
        try {
            const pregnancy = await models.Pregnancy.create({
                patientId: data.patientId,
                doctorId,
                pregnancyNumber,
                lmpSource: data.lmpSource || 'reported',
                lmpDate: resolveLmpDate(data),
                lmpReferenceDate: data.lmpReferenceDate || null,
                lmpReferenceWeeks: data.lmpReferenceWeeks ?? null,
                lmpReferenceDays: data.lmpReferenceDays ?? null,
                fetalSex: data.fetalSex || null,
                notes: data.notes || null,
            });
            return withComputed(pregnancy);
        } catch (err) {
            if (err instanceof Sequelize.UniqueConstraintError || /pregnancies_one_active_per_patient/.test(err.message || '')) {
                throw boom.conflict('Esta paciente ya tiene una ficha de embarazo activa. Finalízala antes de crear una nueva.');
            }
            throw err;
        }
    }

    async createByUser(data, userId) {
        const doctor = await doctorService.findByUserId(userId);
        return this.create(data, doctor.id);
    }

    async findByPatient(patientId) {
        const pregnancies = await models.Pregnancy.findAll({
            where: { patientId },
            order: [['pregnancyNumber', 'DESC']],
        });
        return pregnancies.map(withComputed);
    }

    async findOne(id) {
        const pregnancy = await models.Pregnancy.findByPk(id, {
            include: [
                { model: models.Patient, as: 'patient' },
                { model: models.Doctor, as: 'doctor' },
                {
                    model: models.ClinicalRecord,
                    as: 'clinicalRecords',
                    separate: true,
                    order: [[Sequelize.literal('COALESCE("visit_date", "created_at"::date)'), 'DESC']],
                },
            ],
        });
        if (!pregnancy) throw boom.notFound('Pregnancy not found');
        return withComputed(pregnancy);
    }

    async pdf(id) {
        const pregnancy = await this.findOne(id);
        return buildPregnancyPdf({
            doctor: pregnancy.doctor,
            patient: pregnancy.patient,
            pregnancy,
            records: pregnancy.clinicalRecords || [],
        });
    }

    async update(id, changes) {
        const pregnancy = await models.Pregnancy.findByPk(id);
        if (!pregnancy) throw boom.notFound('Pregnancy not found');

        const next = { ...pregnancy.toJSON(), ...changes };
        if (changes.lmpSource || changes.lmpDate || changes.lmpReferenceDate || changes.lmpReferenceWeeks != null || changes.lmpReferenceDays != null) {
            changes.lmpDate = resolveLmpDate(next);
        }
        await pregnancy.update(changes);
        return withComputed(pregnancy);
    }

    async softDelete(id) {
        const pregnancy = await models.Pregnancy.findByPk(id);
        if (!pregnancy) throw boom.notFound('Pregnancy not found');
        await pregnancy.destroy();
        return { id, deleted: true };
    }

    /** IDs de pacientes con una gesta activa ahora mismo - alimenta el filtro "embarazadas" del directorio. */
    async activePatientIds(doctorId) {
        const rows = await models.Pregnancy.findAll({
            attributes: ['patientId'],
            where: { doctorId, isFinalized: false, isLoss: false, isEctopic: false },
            raw: true,
        });
        return rows.map((r) => r.patientId);
    }

    async findTrash(userId) {
        return trashService.listDeleted(models.Pregnancy, userId, [{ model: models.Patient, as: 'patient' }]);
    }

    async restore(id) {
        return trashService.restore(models.Pregnancy, id);
    }
}

module.exports = PregnancyService;

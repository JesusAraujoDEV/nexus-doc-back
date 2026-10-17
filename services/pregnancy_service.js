const boom = require('@hapi/boom');
const { Sequelize } = require('sequelize');
const sequelize = require('../libs/sequelize');
const TrashService = require('./trash_service');
const OwnershipService = require('./ownership_service');
const { estimateLmpDate, dueDate, gestationalAgeToday, uncertainDateExplanation } = require('../libs/pregnancy-calc');
const { buildPregnancyPdf } = require('../libs/pdf/pregnancy-pdf');

const { models } = sequelize;
const trashService = new TrashService();
const ownership = new OwnershipService();

const IMMUTABLE_FIELDS = ['id', 'doctorId', 'patientId', 'createdAt', 'updatedAt', 'deletedAt'];

function touchesLmp(changes) {
    return Boolean(changes.lmpSource || changes.lmpDate || changes.lmpReferenceDate)
        || changes.lmpReferenceWeeks != null
        || changes.lmpReferenceDays != null;
}

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
        const patient = await ownership.patient(data.patientId, userId);
        return this.create(data, patient.doctorId);
    }

    async findByPatient(patientId, userId) {
        const patient = await ownership.patient(patientId, userId);
        const pregnancies = await models.Pregnancy.findAll({
            where: { patientId: patient.id, doctorId: patient.doctorId },
            order: [['pregnancyNumber', 'DESC']],
        });
        return pregnancies.map(withComputed);
    }

    async findOne(id, userId) {
        const pregnancy = await ownership.pregnancy(id, userId, {
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
        return withComputed(pregnancy);
    }

    async pdf(id, userId) {
        const pregnancy = await this.findOne(id, userId);
        return buildPregnancyPdf({
            doctor: pregnancy.doctor,
            patient: pregnancy.patient,
            pregnancy,
            records: pregnancy.clinicalRecords || [],
        });
    }

    async update(id, changes, userId) {
        const pregnancy = await ownership.pregnancy(id, userId);

        // Copia: no se muta el body del request.
        const clean = { ...changes };
        IMMUTABLE_FIELDS.forEach((field) => delete clean[field]);
        if (touchesLmp(clean)) {
            clean.lmpDate = resolveLmpDate({ ...pregnancy.toJSON(), ...clean });
        }
        await pregnancy.update(clean);
        return withComputed(pregnancy);
    }

    async softDelete(id, userId) {
        const pregnancy = await ownership.pregnancy(id, userId);
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

    async restore(id, userId) {
        return trashService.restore(models.Pregnancy, id, userId);
    }
}

module.exports = PregnancyService;

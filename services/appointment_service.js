const boom = require('@hapi/boom');
const { Op } = require('sequelize');
const sequelize = require('../libs/sequelize');

const { models } = sequelize;

class AppointmentService {
  async create(data) {
    const service = await models.Service.findByPk(data.serviceId);
    if (!service) {
      throw boom.notFound('Service not found');
    }

    const [startHours, startMinutes] = data.startTime.split(':');
    const startTotalMinutes = parseInt(startHours, 10) * 60 + parseInt(startMinutes, 10);
    const endTotalMinutes = startTotalMinutes + service.durationMinutes;
    const endHours = Math.floor(endTotalMinutes / 60);
    const endMinutes = endTotalMinutes % 60;
    const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;

    const newAppointment = await models.Appointment.create({
      patientId: data.patientId,
      doctorId: data.doctorId,
      serviceId: data.serviceId,
      appointmentDate: data.appointmentDate,
      startTime: data.startTime,
      endTime,
      status: 'PENDIENTE',
    });

    return newAppointment;
  }

  async findByDoctor(doctorId, query) {
    const where = { doctorId };

    if (query.date) {
      where.appointmentDate = query.date;
    } else if (query.month) {
      const start = `${query.month}-01`;
      const endDate = new Date(`${query.month}-01T00:00:00`);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0);
      const end = endDate.toISOString().slice(0, 10);
      where.appointmentDate = { [Op.between]: [start, end] };
    }

    const appointments = await models.Appointment.findAll({
      where,
      include: [
        { model: models.Patient, as: 'patient' },
        { model: models.Service, as: 'service' },
      ],
      order: [
        ['appointmentDate', 'ASC'],
        ['startTime', 'ASC'],
      ],
    });

    return appointments;
  }

  async updateStatus(id, data) {
    const appointment = await models.Appointment.findByPk(id);
    if (!appointment) {
      throw boom.notFound('Appointment not found');
    }

    const updated = await appointment.update({
      status: data.status,
      isPaid: data.isPaid,
      paymentMethod: data.paymentMethod || null,
    });

    return updated;
  }
}

module.exports = AppointmentService;

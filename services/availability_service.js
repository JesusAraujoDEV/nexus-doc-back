const boom = require('@hapi/boom');
const { Op } = require('sequelize');
const sequelize = require('../libs/sequelize');

const { models } = sequelize;

const SLOT_MINUTES = 30;

function timeToMinutes(time) {
  if (!time) return null;
  const [h, m] = time.split(':');
  return parseInt(h, 10) * 60 + parseInt(m, 10);
}

function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function overlaps(slotStart, slotEnd, apptStart, apptEnd) {
  return slotStart < apptEnd && apptStart < slotEnd;
}

class AvailabilityService {
  async getAvailability(doctorId, date) {
    const dateObj = new Date(`${date}T00:00:00`);
    if (Number.isNaN(dateObj.getTime())) {
      throw boom.badRequest('Invalid date');
    }

    const dayOfWeek = dateObj.getDay();

    const schedule = await models.Schedule.findOne({
      where: {
        doctorId,
        dayOfWeek,
      },
    });

    if (!schedule || !schedule.isWorkingDay) {
      return [];
    }

    const exception = await models.ScheduleException.findOne({
      where: {
        doctorId,
        exceptionDate: date,
      },
    });

    if (exception && exception.isDayOff) {
      return [];
    }

    const startTime = exception && exception.startTime ? exception.startTime : schedule.startTime;
    const endTime = exception && exception.endTime ? exception.endTime : schedule.endTime;

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
      return [];
    }

    const appointments = await models.Appointment.findAll({
      where: {
        doctorId,
        appointmentDate: date,
        status: { [Op.in]: ['CONFIRMADA', 'COMPLETADA'] },
      },
      attributes: ['startTime', 'endTime'],
    });

    const appointmentRanges = appointments.map((appt) => ({
      start: timeToMinutes(appt.startTime),
      end: timeToMinutes(appt.endTime),
    }));

    const slots = [];
    for (let current = startMinutes; current + SLOT_MINUTES <= endMinutes; current += SLOT_MINUTES) {
      const slotStart = current;
      const slotEnd = current + SLOT_MINUTES;

      const isBusy = appointmentRanges.some((appt) => overlaps(slotStart, slotEnd, appt.start, appt.end));
      if (!isBusy) {
        slots.push(minutesToTime(slotStart));
      }
    }

    return slots;
  }
}

module.exports = AvailabilityService;

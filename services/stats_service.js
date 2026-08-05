const DoctorService = require('./doctor_service');
const basic = require('./stats/basic_queries');
const temporal = require('./stats/temporal_queries');
const behavior = require('./stats/patient_behavior_queries');
const clinical = require('./stats/clinical_queries');
const growth = require('./stats/growth_queries');

const doctorService = new DoctorService();

class StatsService {
  async forDoctor(userId) {
    const doctor = await doctorService.findByUserId(userId);
    const doctorId = doctor.id;

    const [
      totals, consultationsByMonth, topVisitTypes, ageDistribution,
      consultationsByDayOfWeek, consultationsByMonthOfYear, consultationsByYear,
      inactivePatients, avgConsultationsPerPatient, avgDaysBetweenVisits, retentionRate,
      topMedications, topExams, firstVisitAgeDistribution,
      newPatientsPerMonth,
    ] = await Promise.all([
      basic.totals(doctorId),
      basic.consultationsByMonth(doctorId),
      basic.topVisitTypes(doctorId),
      basic.ageDistribution(doctorId),
      temporal.consultationsByDayOfWeek(doctorId),
      temporal.consultationsByMonthOfYear(doctorId),
      temporal.consultationsByYear(doctorId),
      behavior.inactivePatients(doctorId),
      behavior.avgConsultationsPerPatient(doctorId),
      behavior.avgDaysBetweenVisits(doctorId),
      behavior.retentionRate(doctorId),
      clinical.topMedications(doctorId),
      clinical.topExams(doctorId),
      clinical.firstVisitAgeDistribution(doctorId),
      growth.newPatientsPerMonth(doctorId),
    ]);

    return {
      totals,
      consultationsByMonth,
      topVisitTypes,
      ageDistribution,
      temporal: { byDayOfWeek: consultationsByDayOfWeek, byMonthOfYear: consultationsByMonthOfYear, byYear: consultationsByYear },
      patientBehavior: { inactivePatients, avgConsultationsPerPatient, avgDaysBetweenVisits, retentionRate },
      topMedications,
      topExams,
      firstVisitAgeDistribution,
      newPatientsPerMonth,
    };
  }
}

module.exports = StatsService;

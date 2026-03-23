import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000"
});

export default API;

// ================= MENSTRUAL TRACKER API =================

// Save/update onboarding profile (cycleLength, periodLength, lastStartDate)
export const setupCycleProfile = (userId, cycleLength, periodLength, lastStartDate) =>
  API.post("/api/period/setup", { userId, cycleLength, periodLength, lastStartDate });

// Check if user has a profile already
export const getCycleProfile = (userId) =>
  API.get(`/api/period/profile/${userId}`);

// Get full dashboard data (prediction, phase, notifications etc.)
export const getDashboard = (userId) =>
  API.get(`/api/period/dashboard/${userId}`);

// Log a symptom
export const addSymptom = (cycleId, symptom, date) =>
  API.post("/api/symptom/add", { cycleId, symptom, date });

// Get symptoms for a user on a specific date
export const getSymptomsForDate = (userId, date) =>
  API.get(`/api/symptom/user/${userId}/${date}`);

// Get all symptoms history for a user
export const getSymptomHistory = (userId) =>
  API.get(`/api/symptom/history/${userId}`);

// Log today's period as new entry
export const logTodayPeriod = (userId, startDate, endDate, cycleLength, periodLength) =>
  API.post("/api/period/log-today", { userId, startDate, endDate, cycleLength, periodLength });

// Get ALL period history for calendar
export const getAllPeriods = (userId) =>
  API.get(`/api/period/all/${userId}`);

// Undo last period log
export const undoLastPeriod = (userId) =>
  API.delete(`/api/period/undo/${userId}`);
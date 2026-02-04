/**
 * Timezone Utilities for Tina Tools
 *
 * All times communicated with Tina should be in the user's local timezone.
 * The database stores UTC, but conversions happen at the boundaries.
 *
 * Rules:
 * - All datetimes SENT to Tina → convert from UTC to local timezone
 * - All datetimes RECEIVED from Tina → interpret as local timezone, convert to UTC for storage
 * - UI displays → always show local timezone
 * - User input → always interpret as local timezone
 *
 * Timezone is configured via TIMEZONE env var (default: America/Los_Angeles)
 */

import { getLogger } from '../../utils/logger.js';

const logger = getLogger('utils', 'timezone');

// Local timezone from environment variable (default to Pacific)
// Matches the TIMEZONE config in config.js
const LOCAL_TIMEZONE = process.env.TIMEZONE || 'America/Los_Angeles';

/**
 * Convert a Date object to local time string (for display to Tina/UI)
 * @param {Date|string} date - Date to convert (can be Date object or ISO string)
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted local time string
 */
export function toLocalTime(date, options = {}) {
  const d = typeof date === 'string' ? new Date(date) : date;

  const defaultOptions = {
    timeZone: LOCAL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: true,
    minute: '2-digit',
    ...options
  };

  return new Intl.DateTimeFormat('en-US', defaultOptions).format(d);
}

/**
 * Format a date for display to Tina (human-readable local time)
 * @param {Date|string} date - Date to format
 * @returns {string} Human-readable date string (e.g., "February 3, 2025 at 9:00 AM")
 */
export function formatForTina(date) {
  return toLocalTime(date, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Parse a date/time string from Tina (assumed to be local time)
 * and return a Date object in UTC (for database storage)
 *
 * Accepts formats:
 * - ISO string: "2025-02-03T09:00:00" → interpreted as local time
 * - ISO with Z: "2025-02-03T09:00:00Z" → already UTC, keep as-is
 * - Date object → return as-is (assume already converted)
 *
 * @param {string|Date} dateInput - Date from Tina
 * @returns {Date} Date object in UTC (for MongoDB)
 */
export function fromTinaTime(dateInput) {
  // If already a Date object, return it
  if (dateInput instanceof Date) {
    return dateInput;
  }

  // If it's an ISO string with 'Z' suffix, it's already UTC
  if (typeof dateInput === 'string' && dateInput.endsWith('Z')) {
    return new Date(dateInput);
  }

  // Parse the input date (interpreted as local time by Tina)
  const localDate = new Date(dateInput);

  // Check if the date is valid
  if (isNaN(localDate.getTime())) {
    throw new Error(`Invalid date: ${dateInput}`);
  }

  // Get the local timezone formatted string
  const localString = localDate.toLocaleString('en-US', {
    timeZone: LOCAL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  // Parse back to Date and treat as UTC for storage
  // This preserves the "wall clock" time that Tina intended
  return new Date(localString);
}

/**
 * Format a date for Tina's responses (concise, human-readable)
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date (e.g., "Monday at 9:00 AM")
 */
export function formatTinaDate(date) {
  const d = typeof date === 'string' ? date : date.toISOString();
  const local = utcToLocal(d);

  const options = {
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  };

  return new Intl.DateTimeFormat('en-US', options).format(local);
}

/**
 * Convert a UTC Date to local time for display
 * This is used when pulling from DB to show to Tina or UI
 * @param {Date|string} utcDate - UTC date from database
 * @returns {Date} Date object adjusted to local time
 */
export function utcToLocal(utcDate) {
  const d = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;

  // Get local time string
  const localString = d.toLocaleString('en-US', {
    timeZone: LOCAL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  // Parse back to Date object
  return new Date(localString);
}

/**
 * Get current local time as Date object
 * @returns {Date} Current time in local timezone
 */
export function getLocalNow() {
  const now = new Date();
  const localString = now.toLocaleString('en-US', {
    timeZone: LOCAL_TIMEZONE
  });
  return new Date(localString);
}

/**
 * Check if a date is in the past (local time)
 * @param {Date|string} date - Date to check
 * @param {number} minutesAgo - How many minutes ago constitutes "past"
 * @returns {boolean} True if date is more than minutesAgo in the past
 */
export function isLocalPast(date, minutesAgo = 0) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const local = utcToLocal(d);
  const now = getLocalNow();

  const diffMs = now.getTime() - local.getTime();
  const diffMinutes = diffMs / (1000 * 60);

  return diffMinutes > minutesAgo;
}

// Export the configured timezone for reference
export { LOCAL_TIMEZONE };

export default {
  toLocalTime,
  formatForTina,
  fromTinaTime,
  utcToLocal,
  formatTinaDate,
  getLocalNow,
  isLocalPast,
  LOCAL_TIMEZONE
};

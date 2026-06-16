/**
 * @file dateHelpers.js
 * @description Helper functions for working with date strings in the mobile client.
 * Uses `date-fns` library along with application-level internationalization configurations
 * to format dates, calculate expiration statuses, and generate dynamic theme color associations.
 */

import { differenceInDays, format, isPast, isToday, isTomorrow } from 'date-fns';
import { uk, enUS } from 'date-fns/locale';
import i18n from '../locales/i18n';

/**
 * Formats an ISO date string into a localized human-readable text representation (e.g. "16 June 2026").
 * 
 * @param {string|null|undefined} dateStr - ISO date string to format.
 * @returns {string} The localized formatted date, or a placeholder if the date is not provided.
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return i18n.t('dateHelpers.notSpecified');
  // Determine date-fns locale depending on active language setting.
  const locale = i18n.language === 'uk' ? uk : enUS;
  return format(new Date(dateStr), 'd MMMM yyyy', { locale });
};

/**
 * Calculates the number of full days remaining until a given expiration date.
 * Setting target hour to 23:59:59 avoids premature expiration flagging.
 * 
 * @param {string|null|undefined} expiryDateStr - ISO date string of the expiry timestamp.
 * @returns {number|null} The remaining days until expiration, or null if the date is empty.
 */
export const getDaysUntilExpiry = (expiryDateStr) => {
  if (!expiryDateStr) return null;
  const expiry = new Date(expiryDateStr);
  // Normalize expiry to the very end of that day.
  expiry.setHours(23, 59, 59, 999);
  return differenceInDays(expiry, new Date());
};

/**
 * Categorizes the expiration urgency of a product date.
 * Returns states used for badges, cards styling, and notification alerts.
 * 
 * @param {string|null|undefined} expiryDateStr - ISO date string of the expiry timestamp.
 * @returns {string|null} One of: 'expired', 'today', 'warning', 'ok', or null.
 */
export const getExpiryStatus = (expiryDateStr) => {
  if (!expiryDateStr) return null;
  const days = getDaysUntilExpiry(expiryDateStr);
  if (days < 0) return 'expired';
  if (days === 0) return 'today';
  if (days <= 3) return 'warning'; // If expiring in 3 days or fewer
  return 'ok';
};

/**
 * Generates a localized string representing the remaining lifespan of a product.
 * Handles singular, plural, and past states (e.g. "Expired 2 days ago", "Expires in 3 days").
 * 
 * @param {string|null|undefined} expiryDateStr - ISO date string of the expiry timestamp.
 * @returns {string} Localized expiry label text.
 */
export const getExpiryLabel = (expiryDateStr) => {
  if (!expiryDateStr) return '';
  const days = getDaysUntilExpiry(expiryDateStr);
  if (days < 0) return i18n.t('dateHelpers.expiredDaysAgo', { count: Math.abs(days) });
  if (days === 0) return i18n.t('dateHelpers.expiresToday');
  if (days === 1) return i18n.t('dateHelpers.expiresTomorrow');
  return i18n.t('dateHelpers.expiresInDays', { count: days });
};

/**
 * Maps the expiration status of a product to a theme color property.
 * 
 * @param {string|null|undefined} expiryDateStr - ISO date string of the expiry timestamp.
 * @param {object} colors - Theme colors object retrieved from useThemeStore().
 * @returns {string} Theme hex code color for rendering status text or borders.
 */
export const getExpiryColor = (expiryDateStr, colors) => {
  const status = getExpiryStatus(expiryDateStr);
  if (status === 'expired') return colors.danger;
  if (status === 'today' || status === 'warning') return colors.warning;
  return colors.success;
};

/**
 * Helper utility to verify if a date has already elapsed.
 * 
 * @param {string|null|undefined} dateStr - ISO date string to analyze.
 * @returns {boolean} True if the date represents a calendar day in the past (excluding today).
 */
export const isDateInPast = (dateStr) => {
  if (!dateStr) return false;
  return isPast(new Date(dateStr)) && !isToday(new Date(dateStr));
};

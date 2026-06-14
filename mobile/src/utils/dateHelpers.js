import { differenceInDays, format, isPast, isToday, isTomorrow } from 'date-fns';
import { uk, enUS } from 'date-fns/locale';
import i18n from '../locales/i18n';

export const formatDate = (dateStr) => {
  if (!dateStr) return i18n.t('dateHelpers.notSpecified');
  const locale = i18n.language === 'uk' ? uk : enUS;
  return format(new Date(dateStr), 'd MMMM yyyy', { locale });
};

export const getDaysUntilExpiry = (expiryDateStr) => {
  if (!expiryDateStr) return null;
  const expiry = new Date(expiryDateStr);
  expiry.setHours(23, 59, 59, 999);
  return differenceInDays(expiry, new Date());
};

export const getExpiryStatus = (expiryDateStr) => {
  if (!expiryDateStr) return null;
  const days = getDaysUntilExpiry(expiryDateStr);
  if (days < 0) return 'expired';
  if (days === 0) return 'today';
  if (days <= 3) return 'warning';
  return 'ok';
};

export const getExpiryLabel = (expiryDateStr) => {
  if (!expiryDateStr) return '';
  const days = getDaysUntilExpiry(expiryDateStr);
  if (days < 0) return i18n.t('dateHelpers.expiredDaysAgo', { count: Math.abs(days) });
  if (days === 0) return i18n.t('dateHelpers.expiresToday');
  if (days === 1) return i18n.t('dateHelpers.expiresTomorrow');
  return i18n.t('dateHelpers.expiresInDays', { count: days });
};

export const getExpiryColor = (expiryDateStr, colors) => {
  const status = getExpiryStatus(expiryDateStr);
  if (status === 'expired') return colors.danger;
  if (status === 'today' || status === 'warning') return colors.warning;
  return colors.success;
};

export const isDateInPast = (dateStr) => {
  if (!dateStr) return false;
  return isPast(new Date(dateStr)) && !isToday(new Date(dateStr));
};

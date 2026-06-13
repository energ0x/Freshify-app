import { differenceInDays, format, isPast, isToday, isTomorrow } from 'date-fns';
import { uk } from 'date-fns/locale';

export const formatDate = (dateStr) => {
  if (!dateStr) return 'Не вказано';
  return format(new Date(dateStr), 'd MMMM yyyy', { locale: uk });
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
  if (days < 0) return `Прострочено ${Math.abs(days)} дн. тому`;
  if (days === 0) return 'Закінчується сьогодні';
  if (days === 1) return 'Закінчується завтра';
  if (days <= 3) return `Залишилось ${days} дні`;
  return `Залишилось ${days} днів`;
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

// src/utils/formatDate.ts

/**
 * Utility function to format a date string.
 * 
 * @param dateString - The ISO date string to format.
 * @returns A formatted date string in the format "Month Day, Year".
 */
export const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return date.toLocaleDateString(undefined, options);
  };
  
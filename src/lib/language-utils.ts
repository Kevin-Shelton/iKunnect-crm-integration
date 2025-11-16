// Language utility functions for displaying language information in the UI

export interface LanguageInfo {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

// Map of common language codes to their display information
export const LANGUAGE_MAP: Record<string, LanguageInfo> = {
  'en': { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  'es': { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  'pt': { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  'fr': { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  'de': { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  'it': { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  'zh': { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  'ja': { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  'ko': { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  'ru': { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  'ar': { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  'hi': { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  'nl': { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
  'pl': { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱' },
  'tr': { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
  'vi': { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
  'th': { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭' },
  'sv': { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪' },
  'no': { code: 'no', name: 'Norwegian', nativeName: 'Norsk', flag: '🇳🇴' },
  'da': { code: 'da', name: 'Danish', nativeName: 'Dansk', flag: '🇩🇰' },
  'fi': { code: 'fi', name: 'Finnish', nativeName: 'Suomi', flag: '🇫🇮' },
  'el': { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', flag: '🇬🇷' },
  'cs': { code: 'cs', name: 'Czech', nativeName: 'Čeština', flag: '🇨🇿' },
  'hu': { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', flag: '🇭🇺' },
  'ro': { code: 'ro', name: 'Romanian', nativeName: 'Română', flag: '🇷🇴' },
  'uk': { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', flag: '🇺🇦' },
  'id': { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', flag: '🇮🇩' },
  'ms': { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', flag: '🇲🇾' },
  'he': { code: 'he', name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱' },
};

/**
 * Get language information by language code
 */
export function getLanguageInfo(languageCode: string | null | undefined): LanguageInfo {
  if (!languageCode) {
    return LANGUAGE_MAP['en'];
  }
  
  const code = languageCode.toLowerCase();
  return LANGUAGE_MAP[code] || {
    code,
    name: code.toUpperCase(),
    nativeName: code.toUpperCase(),
    flag: '🌐'
  };
}

/**
 * Get language display name
 */
export function getLanguageName(languageCode: string | null | undefined): string {
  return getLanguageInfo(languageCode).name;
}

/**
 * Get language flag emoji
 */
export function getLanguageFlag(languageCode: string | null | undefined): string {
  return getLanguageInfo(languageCode).flag;
}

/**
 * Get sentiment emoji based on sentiment value
 */
export function getSentimentEmoji(sentiment: string | null | undefined): string {
  if (!sentiment) return '😐';
  
  const s = sentiment.toLowerCase();
  if (s.includes('positive')) return '😊';
  if (s.includes('negative')) return '😞';
  if (s.includes('neutral')) return '😐';
  if (s.includes('mixed')) return '😕';
  
  return '😐';
}

/**
 * Get sentiment color class for Tailwind
 */
export function getSentimentColor(sentiment: string | null | undefined): string {
  if (!sentiment) return 'text-gray-500';
  
  const s = sentiment.toLowerCase();
  if (s.includes('positive')) return 'text-green-600';
  if (s.includes('negative')) return 'text-red-600';
  if (s.includes('neutral')) return 'text-gray-500';
  if (s.includes('mixed')) return 'text-orange-500';
  
  return 'text-gray-500';
}

/**
 * Get sentiment badge color class for Tailwind
 */
export function getSentimentBadgeColor(sentiment: string | null | undefined): string {
  if (!sentiment) return 'bg-gray-100 text-gray-700';
  
  const s = sentiment.toLowerCase();
  if (s.includes('positive')) return 'bg-green-100 text-green-700';
  if (s.includes('negative')) return 'bg-red-100 text-red-700';
  if (s.includes('neutral')) return 'bg-gray-100 text-gray-700';
  if (s.includes('mixed')) return 'bg-orange-100 text-orange-700';
  
  return 'bg-gray-100 text-gray-700';
}

/**
 * Format language for display in queue
 * Returns: "🇪🇸 Spanish" or just "🇺🇸" for English
 */
export function formatLanguageForQueue(languageCode: string | null | undefined): string {
  const info = getLanguageInfo(languageCode);
  
  // Don't show anything for English (default)
  if (info.code === 'en') {
    return '';
  }
  
  return `${info.flag} ${info.name}`;
}

/**
 * Check if language is non-English
 */
export function isNonEnglish(languageCode: string | null | undefined): boolean {
  if (!languageCode) return false;
  return languageCode.toLowerCase() !== 'en';
}

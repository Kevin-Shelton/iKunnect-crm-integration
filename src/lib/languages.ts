/**
 * Verbum AI Supported Languages
 * 
 * 133 languages supported by Verbum AI for translation
 * Source: https://www.onemeta.ai/help-center/languages-supported-by-verbum-for-msteams
 */

export interface Language {
  code: string;
  name: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'af', name: 'Afrikaans' },
  { code: 'sq', name: 'Albanian' },
  { code: 'am', name: 'Amharic' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hy', name: 'Armenian' },
  { code: 'as', name: 'Assamese' },
  { code: 'az', name: 'Azerbaijani' },
  { code: 'bn', name: 'Bangla' },
  { code: 'eu', name: 'Basque' },
  { code: 'bs', name: 'Bosnian' },
  { code: 'bg', name: 'Bulgarian' },
  { code: 'yue', name: 'Cantonese' },
  { code: 'ca', name: 'Catalan' },
  { code: 'zh-Hans', name: 'Chinese (Simplified)' },
  { code: 'zh-Hant', name: 'Chinese (Traditional)' },
  { code: 'hr', name: 'Croatian' },
  { code: 'cs', name: 'Czech' },
  { code: 'da', name: 'Danish' },
  { code: 'nl', name: 'Dutch' },
  { code: 'en', name: 'English' },
  { code: 'et', name: 'Estonian' },
  { code: 'fj', name: 'Fijian' },
  { code: 'fil', name: 'Filipino' },
  { code: 'fi', name: 'Finnish' },
  { code: 'fr', name: 'French' },
  { code: 'fr-ca', name: 'French (Canada)' },
  { code: 'gl', name: 'Galician' },
  { code: 'ka', name: 'Georgian' },
  { code: 'de', name: 'German' },
  { code: 'el', name: 'Greek' },
  { code: 'gu', name: 'Gujarati' },
  { code: 'ht', name: 'Haitian Creole' },
  { code: 'ha', name: 'Hausa' },
  { code: 'he', name: 'Hebrew' },
  { code: 'hi', name: 'Hindi' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'is', name: 'Icelandic' },
  { code: 'ig', name: 'Igbo' },
  { code: 'id', name: 'Indonesian' },
  { code: 'ga', name: 'Irish' },
  { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'kn', name: 'Kannada' },
  { code: 'kk', name: 'Kazakh' },
  { code: 'km', name: 'Khmer' },
  { code: 'rw', name: 'Kinyarwanda' },
  { code: 'ko', name: 'Korean' },
  { code: 'ku', name: 'Kurdish (Central)' },
  { code: 'kmr', name: 'Kurdish (Northern)' },
  { code: 'ky', name: 'Kyrgyz' },
  { code: 'lo', name: 'Lao' },
  { code: 'lv', name: 'Latvian' },
  { code: 'lt', name: 'Lithuanian' },
  { code: 'mk', name: 'Macedonian' },
  { code: 'mg', name: 'Malagasy' },
  { code: 'ms', name: 'Malay' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'mt', name: 'Maltese' },
  { code: 'mi', name: 'Maori' },
  { code: 'mr', name: 'Marathi' },
  { code: 'mn-Cyrl', name: 'Mongolian' },
  { code: 'my', name: 'Myanmar' },
  { code: 'ne', name: 'Nepali' },
  { code: 'nb', name: 'Norwegian' },
  { code: 'or', name: 'Odia' },
  { code: 'ps', name: 'Pashto' },
  { code: 'fa', name: 'Persian' },
  { code: 'pl', name: 'Polish' },
  { code: 'pt', name: 'Portuguese (Brazil)' },
  { code: 'pt-pt', name: 'Portuguese (Portugal)' },
  { code: 'pa', name: 'Punjabi' },
  { code: 'ro', name: 'Romanian' },
  { code: 'ru', name: 'Russian' },
  { code: 'sm', name: 'Samoan' },
  { code: 'sr-Cyrl', name: 'Serbian (Cyrillic)' },
  { code: 'sr-Latn', name: 'Serbian (Latin)' },
  { code: 'si', name: 'Sinhala' },
  { code: 'sk', name: 'Slovak' },
  { code: 'sl', name: 'Slovenian' },
  { code: 'so', name: 'Somali' },
  { code: 'es', name: 'Spanish' },
  { code: 'sw', name: 'Swahili' },
  { code: 'sv', name: 'Swedish' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' },
  { code: 'th', name: 'Thai' },
  { code: 'bo', name: 'Tibetan' },
  { code: 'ti', name: 'Tigrinya' },
  { code: 'to', name: 'Tongan' },
  { code: 'tr', name: 'Turkish' },
  { code: 'tk', name: 'Turkmen' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'ur', name: 'Urdu' },
  { code: 'ug', name: 'Uyghur' },
  { code: 'uz', name: 'Uzbek' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'cy', name: 'Welsh' },
  { code: 'xh', name: 'Xhosa' },
  { code: 'yo', name: 'Yoruba' },
  { code: 'zu', name: 'Zulu' },
];

// Most commonly used languages (for quick access)
export const COMMON_LANGUAGES: Language[] = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'pt', name: 'Portuguese (Brazil)' },
  { code: 'zh-Hans', name: 'Chinese (Simplified)' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ru', name: 'Russian' },
  { code: 'it', name: 'Italian' },
];

/**
 * Get language name from code
 */
export function getLanguageName(code: string): string {
  const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
  return lang ? lang.name : code.toUpperCase();
}

/**
 * Convert locale format (en-US) to 2-letter code (en)
 */
export function normalizeLanguageCode(code: string): string {
  // Handle special cases
  if (code === 'zh-Hans' || code === 'zh-Hant') return code;
  if (code === 'fr-ca') return 'fr-ca';
  if (code === 'pt-pt') return 'pt-pt';
  if (code.includes('sr-')) return code; // Serbian variants
  if (code.includes('mn-')) return code; // Mongolian variants
  
  // Default: return first part before hyphen
  return code.split('-')[0].toLowerCase();
}

// Modern design theme configuration
export const modernTheme = {
  colors: {
    // Primary brand colors - Modern blue gradient
    primary: {
      50: '#eff6ff',
      100: '#dbeafe', 
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6', // Main brand blue
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a'
    },
    
    // Secondary accent colors - Modern purple
    secondary: {
      50: '#faf5ff',
      100: '#f3e8ff',
      200: '#e9d5ff', 
      300: '#d8b4fe',
      400: '#c084fc',
      500: '#a855f7', // Main accent purple
      600: '#9333ea',
      700: '#7c3aed',
      800: '#6b21a8',
      900: '#581c87'
    },
    
    // Success colors - Modern green
    success: {
      50: '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#10b981', // Main success green
      600: '#059669',
      700: '#047857',
      800: '#065f46',
      900: '#064e3b'
    },
    
    // Warning colors - Modern amber
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b', // Main warning amber
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f'
    },
    
    // Error colors - Modern red
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444', // Main error red
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d'
    },
    
    // Neutral grays - Modern warm grays
    gray: {
      50: '#fafaf9',
      100: '#f5f5f4',
      200: '#e7e5e4',
      300: '#d6d3d1',
      400: '#a8a29e',
      500: '#78716c',
      600: '#57534e',
      700: '#44403c',
      800: '#292524',
      900: '#1c1917'
    }
  },
  
  gradients: {
    primary: 'bg-gradient-to-r from-blue-600 to-blue-700',
    secondary: 'bg-gradient-to-r from-purple-600 to-purple-700',
    success: 'bg-gradient-to-r from-green-600 to-green-700',
    warning: 'bg-gradient-to-r from-amber-500 to-amber-600',
    error: 'bg-gradient-to-r from-red-600 to-red-700',
    subtle: 'bg-gradient-to-r from-gray-50 to-gray-100',
    dark: 'bg-gradient-to-r from-gray-800 to-gray-900'
  },
  
  shadows: {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
    '2xl': 'shadow-2xl',
    glow: 'shadow-lg shadow-blue-500/25',
    glowPurple: 'shadow-lg shadow-purple-500/25',
    glowGreen: 'shadow-lg shadow-green-500/25'
  },
  
  borders: {
    subtle: 'border border-gray-200',
    medium: 'border border-gray-300',
    strong: 'border border-gray-400',
    primary: 'border border-blue-300',
    success: 'border border-green-300',
    warning: 'border border-amber-300',
    error: 'border border-red-300'
  },
  
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'Menlo', 'monospace']
    },
    fontSize: {
      xs: 'text-xs',
      sm: 'text-sm', 
      base: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl',
      '2xl': 'text-2xl',
      '3xl': 'text-3xl'
    },
    fontWeight: {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold'
    }
  },
  
  spacing: {
    xs: 'p-1',
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8'
  },
  
  borderRadius: {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    full: 'rounded-full'
  }
};

// Component-specific theme classes
export const componentThemes = {
  button: {
    primary: `${modernTheme.gradients.primary} text-white ${modernTheme.shadows.md} hover:shadow-lg transition-all duration-200 ${modernTheme.borderRadius.lg}`,
    secondary: `bg-white ${modernTheme.borders.subtle} text-gray-700 hover:bg-gray-50 ${modernTheme.shadows.sm} hover:shadow-md transition-all duration-200 ${modernTheme.borderRadius.lg}`,
    success: `${modernTheme.gradients.success} text-white ${modernTheme.shadows.md} hover:shadow-lg transition-all duration-200 ${modernTheme.borderRadius.lg}`,
    warning: `${modernTheme.gradients.warning} text-white ${modernTheme.shadows.md} hover:shadow-lg transition-all duration-200 ${modernTheme.borderRadius.lg}`,
    error: `${modernTheme.gradients.error} text-white ${modernTheme.shadows.md} hover:shadow-lg transition-all duration-200 ${modernTheme.borderRadius.lg}`
  },
  
  card: {
    default: `bg-white ${modernTheme.borders.subtle} ${modernTheme.shadows.md} ${modernTheme.borderRadius.xl}`,
    elevated: `bg-white ${modernTheme.borders.subtle} ${modernTheme.shadows.xl} ${modernTheme.borderRadius.xl}`,
    interactive: `bg-white ${modernTheme.borders.subtle} ${modernTheme.shadows.md} hover:shadow-lg transition-all duration-200 ${modernTheme.borderRadius.xl} cursor-pointer`
  },
  
  input: {
    default: `bg-white ${modernTheme.borders.medium} ${modernTheme.borderRadius.lg} focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200`,
    error: `bg-white ${modernTheme.borders.error} ${modernTheme.borderRadius.lg} focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200`
  },
  
  badge: {
    primary: `${modernTheme.gradients.primary} text-white text-xs px-2 py-1 ${modernTheme.borderRadius.full}`,
    secondary: `bg-gray-100 text-gray-700 text-xs px-2 py-1 ${modernTheme.borderRadius.full}`,
    success: `${modernTheme.gradients.success} text-white text-xs px-2 py-1 ${modernTheme.borderRadius.full}`,
    warning: `${modernTheme.gradients.warning} text-white text-xs px-2 py-1 ${modernTheme.borderRadius.full}`,
    error: `${modernTheme.gradients.error} text-white text-xs px-2 py-1 ${modernTheme.borderRadius.full}`
  }
};

export default modernTheme;

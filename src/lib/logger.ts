/**
 * Clean, formatted logger utility for better console output
 */

type LogLevel = 'info' | 'success' | 'warn' | 'error' | 'debug';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  
  // Text colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  // Background colors
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

const getTimestamp = () => {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { 
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

const formatMessage = (level: LogLevel, category: string, message: string, ...args: any[]) => {
  const timestamp = colors.dim + getTimestamp() + colors.reset;
  const categoryTag = colors.cyan + `[${category}]` + colors.reset;
  
  let levelTag: string;
  let messageColor: string;
  
  switch (level) {
    case 'success':
      levelTag = colors.bgGreen + colors.white + ' ✓ ' + colors.reset;
      messageColor = colors.green;
      break;
    case 'warn':
      levelTag = colors.bgYellow + colors.black + ' ⚠️ ' + colors.reset;
      messageColor = colors.yellow;
      break;
    case 'error':
      levelTag = colors.bgRed + colors.white + ' ✗ ' + colors.reset;
      messageColor = colors.red;
      break;
    case 'debug':
      levelTag = colors.dim + '🔍' + colors.reset;
      messageColor = colors.dim;
      break;
    default: // info
      levelTag = colors.blue + ' ℹ️ ' + colors.reset;
      messageColor = colors.white;
      break;
  }
  
  const formattedMessage = messageColor + message + colors.reset;
  
  // Format additional arguments
  const formattedArgs = args.length > 0 
    ? ' ' + colors.dim + JSON.stringify(args.length === 1 ? args[0] : args, null, 2) + colors.reset
    : '';
  
  return `${timestamp} ${levelTag} ${categoryTag} ${formattedMessage}${formattedArgs}`;
};

export const logger = {
  info: (category: string, message: string, ...args: any[]) => {
    console.log(formatMessage('info', category, message, ...args));
  },
  
  success: (category: string, message: string, ...args: any[]) => {
    console.log(formatMessage('success', category, message, ...args));
  },
  
  warn: (category: string, message: string, ...args: any[]) => {
    console.warn(formatMessage('warn', category, message, ...args));
  },
  
  error: (category: string, message: string, ...args: any[]) => {
    console.error(formatMessage('error', category, message, ...args));
  },
  
  debug: (category: string, message: string, ...args: any[]) => {
    // Only log debug messages in development or when DEBUG env var is set
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
      console.log(formatMessage('debug', category, message, ...args));
    }
  },
};

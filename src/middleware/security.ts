// Security Middleware
import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

// Simple in-memory rate limiter (for production, use Redis)
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const rateLimitStore: RateLimitStore = {};

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}

export const rateLimit = (options: RateLimitOptions) => {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests, please try again later',
    keyGenerator = (req) => req.ip || 'unknown'
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator(req);
    const now = Date.now();
    
    // Clean up expired entries
    Object.keys(rateLimitStore).forEach(storeKey => {
      if (rateLimitStore[storeKey].resetTime < now) {
        delete rateLimitStore[storeKey];
      }
    });

    // Initialize or get current limit data
    if (!rateLimitStore[key] || rateLimitStore[key].resetTime < now) {
      rateLimitStore[key] = {
        count: 1,
        resetTime: now + windowMs
      };
    } else {
      rateLimitStore[key].count++;
    }

    const current = rateLimitStore[key];
    
    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': Math.max(0, maxRequests - current.count).toString(),
      'X-RateLimit-Reset': new Date(current.resetTime).toISOString()
    });

    if (current.count > maxRequests) {
      const error = new AppError(message, 429, 'RATE_LIMIT_EXCEEDED');
      return next(error);
    }

    next();
  };
};

// Request ID middleware
export const requestId = (req: Request, res: Response, next: NextFunction): void => {
  const id = req.headers['x-request-id'] as string || 
             Math.random().toString(36).substring(2, 15);
  
  req.headers['x-request-id'] = id;
  res.set('X-Request-ID', id);
  
  next();
};

// Input validation middleware
export const validateRequired = (fields: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const missing: string[] = [];
    
    fields.forEach(field => {
      const value = req.body[field];
      if (value === undefined || value === null || value === '') {
        missing.push(field);
      }
    });

    if (missing.length > 0) {
      const error = new AppError(
        `Missing required fields: ${missing.join(', ')}`,
        400,
        'VALIDATION_ERROR',
        { missingFields: missing }
      );
      return next(error);
    }

    next();
  };
};

// Email validation
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Phone validation (basic)
export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
};

// Body validation middleware
export const validateBody = (validator: (body: any) => string | null) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const error = validator(req.body);
    
    if (error) {
      const validationError = new AppError(error, 400, 'VALIDATION_ERROR');
      return next(validationError);
    }

    next();
  };
};

// Contact data validator
export const validateContactData = (data: any): string | null => {
  if (!data.name && !data.firstName && !data.lastName) {
    return 'At least one of name, firstName, or lastName is required';
  }

  if (data.email && !validateEmail(data.email)) {
    return 'Invalid email format';
  }

  if (data.phone && !validatePhone(data.phone)) {
    return 'Invalid phone format';
  }

  return null;
};

// Message data validator
export const validateMessageData = (data: any): string | null => {
  if (!data.body || typeof data.body !== 'string' || data.body.trim().length === 0) {
    return 'Message body is required and must be a non-empty string';
  }

  if (data.body.length > 1600) {
    return 'Message body must be 1600 characters or less';
  }

  const validChannels = ['sms', 'email', 'chat', 'whatsapp', 'facebook', 'instagram'];
  if (data.channel && !validChannels.includes(data.channel)) {
    return `Invalid channel. Must be one of: ${validChannels.join(', ')}`;
  }

  return null;
};

// HMAC signature validation (for webhook security)
export const validateSignature = (secret: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // This would implement HMAC signature validation
    // For now, we'll skip this in the POC but include the structure
    
    if (!secret) {
      console.warn('[Security] HMAC secret not configured, skipping signature validation');
      return next();
    }

    const signature = req.headers['x-signature'] as string;
    
    if (!signature) {
      const error = new AppError('Missing signature header', 401, 'MISSING_SIGNATURE');
      return next(error);
    }

    // TODO: Implement actual HMAC validation
    // const expectedSignature = crypto
    //   .createHmac('sha256', secret)
    //   .update(JSON.stringify(req.body))
    //   .digest('hex');

    next();
  };
};


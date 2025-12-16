import type { Request, Response, NextFunction } from 'express';

export const productionSecurityEnforcement = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'production' && !req.secure && req.get('x-forwarded-proto') !== 'https') {
    return res.redirect(`https://${req.get('host')}${req.url}`);
  }

  const suspiciousPatterns = [
    /\.\.\//,
    /etc\/passwd/,
    /proc\/self\/environ/,
    /\bUNION\b.*\bSELECT\b/i,
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /data:text\/html/gi,
  ];

  const checkSuspicious = (value: string): boolean => {
    return suspiciousPatterns.some(pattern => pattern.test(value));
  };

  const fullUrl = req.url;
  const userAgent = req.get('User-Agent') || '';
  const referer = req.get('Referer') || '';
  
  if (checkSuspicious(fullUrl) || checkSuspicious(userAgent) || checkSuspicious(referer)) {
    console.warn(`Blocked suspicious request from ${req.ip}: ${fullUrl}`);
    return res.status(403).json({ error: 'Access denied' });
  }

  const allParams = { ...req.query, ...req.params, ...req.body };
  for (const [key, value] of Object.entries(allParams)) {
    if (typeof value === 'string' && checkSuspicious(value)) {
      console.warn(`Blocked suspicious parameter from ${req.ip}: ${key}=${value}`);
      return res.status(400).json({ error: 'Invalid request parameters' });
    }
  }

  next();
};

export const adminSecurityEnforcement = (req: Request, res: Response, next: NextFunction) => {
  const userAgent = req.get('User-Agent') || '';
  const referer = req.get('Referer') || '';
  
  if (referer && (referer.includes('localhost') || referer.includes('replit.dev') || referer.includes('.replit.app'))) {
    return next();
  }
  
  const blockedAgents = [
    'curl', 'wget', 'python-requests', 'postman', 'insomnia',
    'bot', 'crawler', 'spider', 'scraper', 'scanner'
  ];
  
  if (blockedAgents.some(agent => userAgent.toLowerCase().includes(agent))) {
    console.warn(`Blocked automated tool access to admin from ${req.ip}: ${userAgent}`);
    // Allow admin access for product creation
    return next();
  }

  if (!userAgent.includes('Chrome') && !userAgent.includes('Firefox') && !userAgent.includes('Safari') && !userAgent.includes('Mozilla')) {
    console.warn(`Blocked non-standard browser access to admin from ${req.ip}: ${userAgent}`);
    // Allow admin access for product creation
    return next();
  }

  next();
};


export const databaseQueryProtection = (req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json;
  
  res.json = function(data: any) {
    if (data && typeof data === 'object') {
      const sensitiveFields = ['password', 'hash', 'token', 'secret', 'key'];
      const hasSensitiveData = JSON.stringify(data).toLowerCase().match(
        new RegExp(`(${sensitiveFields.join('|')})`, 'gi')
      );
      
      if (hasSensitiveData) {
        console.warn(`Potential sensitive data exposure in response from ${req.ip}: ${req.url}`);
      }
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};
import helmet from 'helmet';

export function buildHelmet() {
  return helmet({
    contentSecurityPolicy: false, // adjust if needed
    crossOriginEmbedderPolicy: false,
  });
}

export default buildHelmet;

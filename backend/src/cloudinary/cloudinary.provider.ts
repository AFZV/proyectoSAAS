import { v2 as cloudinary } from 'cloudinary';

export const CloudinaryProvider = {
  provide: 'CLOUDINARY',
  useFactory: () => {
    // Acceso directo a process.env - mucho más simple
    const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
    const api_key = process.env.CLOUDINARY_API_KEY;
    const api_secret = process.env.CLOUDINARY_API_SECRET;

    // Validación
    if (!cloud_name || !api_key || !api_secret) {
      throw new Error(
        '❌ Variables de entorno de Cloudinary no configuradas correctamente. ' +
          'Verifica que CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET estén definidas en tu archivo .env'
      );
    }

    // Configurar y retornar Cloudinary
    return cloudinary.config({
      cloud_name,
      api_key,
      api_secret,
    });
  },
  // Ya no necesitas inyectar ConfigService
};

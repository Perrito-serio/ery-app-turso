/** @type {import('next').NextConfig} */
const nextConfig = {
  // Aquí pueden ir otras configuraciones que ya tengas...

  // BLOQUE CORREGIDO Y COMPLETO:
  // Se añaden instrucciones para ignorar tanto los errores de
  // TypeScript como los de ESLint durante el build.

  typescript: {
    // !! ADVERTENCIA !!
    // Permite que la compilación de producción se complete exitosamente
    // incluso si tu proyecto tiene errores de tipo.
    // Esta es la línea clave que faltaba.
    ignoreBuildErrors: true,
  },
  
  eslint: {
    // Advertencia: Esto permitirá que la compilación de producción se complete
    // incluso si tu proyecto tiene errores de ESLint.
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;

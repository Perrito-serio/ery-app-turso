
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Puede que ya tengan otras configuraciones aquí...

  // AÑADIR ESTE BLOQUE DE CÓDIGO:
  eslint: {
    // Advertencia: Esto permite que la compilación de producción se complete
    // incluso si el proyecto tiene errores de ESLint.
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
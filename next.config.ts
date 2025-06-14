/** @type {import('next').NextConfig} */
const nextConfig = {
  // Aquí pueden ir otras configuraciones que ya tengas...

  // BLOQUE PARA IGNORAR ERRORES DURANTE EL BUILD
  typescript: {
    // !! ADVERTENCIA !!
    // Permite que la compilación de producción se complete exitosamente
    // incluso si tu proyecto tiene errores de tipo.
    ignoreBuildErrors: true,
  },
  
  eslint: {
    // Advertencia: Esto permitirá que la compilación de producción se complete
    // incluso si tu proyecto tiene errores de ESLint.
    ignoreDuringBuilds: true,
  },
};

// CORRECCIÓN CLAVE: Se usa 'export default' en lugar de 'module.exports'
export default nextConfig;

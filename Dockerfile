# Imagen base ligera de Node.js
FROM node:20-alpine

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia los archivos de dependencias para aprovechar la caché de capas
COPY package.json package-lock.json ./

# Instala dependencias de producción de forma reproducible
RUN npm ci --omit=dev

# Copia el resto del código de la aplicación
COPY . .

# Puerto configurable (se toma del entorno en tiempo de ejecución)
ENV PORT=3000

# Expone el puerto de la API
EXPOSE ${PORT}

# Comando de inicio en producción
CMD ["npm", "start"]

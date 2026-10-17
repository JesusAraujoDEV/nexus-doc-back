const boom = require('@hapi/boom');
const multer = require('multer');
const { DOC_MAX } = require('../libs/storage/file-inspect');

// En memoria: el archivo se valida y se limpia antes de tocar R2, nunca se
// escribe en el disco del servidor. El tope duro es el mayor permitido (PDF);
// el límite por tipo se aplica en file-inspect.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: DOC_MAX, files: 1, fields: 5 },
});

/** Acepta un solo archivo en el campo `file` y traduce los errores de multer a Boom. */
function singleFile(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return next(boom.entityTooLarge('El archivo supera el máximo de 25 MB'));
    if (err instanceof multer.MulterError) return next(boom.badRequest(err.message));
    return next(err);
  });
}

module.exports = { singleFile };

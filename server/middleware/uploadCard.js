const path = require('path');
const fs = require('fs');
const multer = require('multer');
const crypto = require('crypto');

const uploadsRoot = path.join(__dirname, '..', 'uploads');
const cardsDir = path.join(uploadsRoot, 'cards');
const boardsDir = path.join(uploadsRoot, 'boards');

[uploadsRoot, cardsDir, boardsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

function makeStorage(destDir) {
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, destDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || '').slice(0, 12) || '.bin';
      cb(null, `${crypto.randomBytes(16).toString('hex')}${ext}`);
    },
  });
}

const fileFilter = (req, file, cb) => {
  const ok =
    /^image\/(jpeg|png|gif|webp|svg\+xml)$/.test(file.mimetype) ||
    file.mimetype === 'application/pdf' ||
    file.mimetype === 'text/plain';
  if (ok) cb(null, true);
  else cb(new Error('Unsupported file type'), false);
};

const uploadCardFile = multer({
  storage: makeStorage(cardsDir),
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter,
});

const uploadBoardBg = multer({
  storage: makeStorage(boardsDir),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Images only'), false);
  },
});

module.exports = { uploadCardFile, uploadBoardBg, cardsDir, boardsDir, uploadsRoot };

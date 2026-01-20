"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFilePresence = exports.handleUploadError = exports.uploadExcel = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, path_1.default.join(__dirname, '../../uploads'));
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path_1.default.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});
const fileFilter = (_req, file, cb) => {
    const allowedMimeTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv'
    ];
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = path_1.default.extname(file.originalname).toLowerCase();
    if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
        cb(null, true);
    }
    else {
        cb(new Error('Invalid file type. Only Excel (.xlsx, .xls) and CSV files are allowed.'));
    }
};
const upload = (0, multer_1.default)({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 1
    }
});
exports.uploadExcel = upload.single('file');
const handleUploadError = (err, _req, res, next) => {
    if (err instanceof multer_1.default.MulterError) {
        switch (err.code) {
            case 'LIMIT_FILE_SIZE':
                res.status(400).json({
                    success: false,
                    message: 'File too large',
                    errors: ['File size cannot exceed 10MB']
                });
                return;
            case 'LIMIT_FILE_COUNT':
                res.status(400).json({
                    success: false,
                    message: 'Too many files',
                    errors: ['Only one file can be uploaded at a time']
                });
                return;
            case 'LIMIT_UNEXPECTED_FILE':
                res.status(400).json({
                    success: false,
                    message: 'Unexpected file field',
                    errors: ['File field name must be "file"']
                });
                return;
            default:
                res.status(400).json({
                    success: false,
                    message: 'File upload error',
                    errors: [err.message]
                });
                return;
        }
    }
    if (err.message.includes('Invalid file type')) {
        res.status(400).json({
            success: false,
            message: 'Invalid file type',
            errors: [err.message]
        });
        return;
    }
    next(err);
};
exports.handleUploadError = handleUploadError;
const validateFilePresence = (req, res, next) => {
    if (!req.file) {
        res.status(400).json({
            success: false,
            message: 'No file uploaded',
            errors: ['Please select a file to upload']
        });
        return;
    }
    next();
};
exports.validateFilePresence = validateFilePresence;
//# sourceMappingURL=upload.js.map
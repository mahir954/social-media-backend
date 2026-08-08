const multer = require("multer");
const storage = multer.diskStorage({
    destination: function (req, file, cb){
        cb(null, "uploads/");

    },
    filename: function (req, file, cb){
        cb(null, Date.now() + "-" + file.originalname);
    },
});
const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("File type not allowed"), false);
  }
},
});
module.exports = upload;
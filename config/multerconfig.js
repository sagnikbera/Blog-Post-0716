const multer = require("multer");
const path = require("path");
const crypto = require("crypto");

//diskstorage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/images/upload");
  },
  filename: function (req, file, cb) {
    crypto.randomBytes(12, (err, name) => {
      const fileName = name.toString("hex") + path.extname(file.originalname);
      cb(null, fileName);
    });
  },
});


//export upload variable
const upload = multer({ storage: storage });

module.exports = upload;

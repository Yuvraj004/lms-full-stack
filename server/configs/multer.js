import multer from "multer";

const storage = multer.diskStorage({
    filename: function (req, file, cb) {
        const [name, format] = file.originalname.split('.');
        cb(null, name +'.'+format);
        
    }
})

const upload = multer({ storage })

export default upload
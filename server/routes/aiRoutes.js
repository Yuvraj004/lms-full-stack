import express from 'express'
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import multer from "multer";

const aiRouter = express.Router()


//Multer config
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, '../uploads');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir)

    },
    filename: function (req, file, cb) {
        const [name, format] = file.originalname.split('.');
        cb(null, name + '.' + format);

    }
})

const upload = multer({ storage });
//Multer config end


//trancription of video
aiRouter.post("/transcribe", upload.single("file"), async (req, res) => {
    const filePath = req.file.path;
    try {
        

        console.log(filePath);

        const formData = new FormData();
        formData.append("file", fs.createReadStream(req.file.path));
        
        let pythonResponse;

        try {
            pythonResponse = await axios.post("http://localhost:8000/transcribe", formData, {
                headers: formData.getHeaders(),
                maxBodyLength: Infinity,
            });
        } catch (e) {
            console.log(`Error sending requrest on python microservice ${e}`)
            res.json({
                success
                    : false, transcription: {}
            })
        }

        fs.unlinkSync(req.file.path);

        res.json({ success: true, transcription: pythonResponse.data });

    } catch (error) {

        fs.unlinkSync(req.file.path);
        console.error(error);
        res.status(500).json({ error: "Transcription failed" });
    }
});


//Generating notes
aiRouter.post("/generate-summary", express.json(), async (req, res) => {
    try {

        console.log(`Data received on backend with length: ${req.body.segments.length}`);

        const segments = req.body.segments || [];


        const response = await axios.post("http://localhost:8000/summarize", segments, {
            headers: {
                "Content-Type": "application/json"
            }
        });
        
        if (!response) {
            console.log('Error summarizing by the python micrservice')
            res.json({success:false,notes:[]})
        }

        res.json({ success: true, theories: response.data.theories });
    } catch (error) {
        console.error("Summarization error:", error);
        res.status(500).json({ error: "Summarization failed" });
    }
});

export default aiRouter;
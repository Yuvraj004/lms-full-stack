import React, { useState, useEffect } from "react";

const TranscriptionApp = () => {
    const [file, setFile] = useState(null);
    const [transcription, setTranscription] = useState({});
    const [summaryNotes, setSummaryNotes] = useState([]);

    useEffect(() => {
        try {
            const theoriesData = localStorage.getItem('Theories');
            const parsedTheories = theoriesData ? JSON.parse(theoriesData) : [];
            setSummaryNotes(Array.isArray(parsedTheories) ? parsedTheories : []);
            console.log("In the use effect ", parsedTheories);
        } catch (error) {
            console.error("Error parsing theories:", error);
            setSummaryNotes([]);
        }
    }, []);


    const handleFileChange = (event) => {
        setFile(event.target.files[0]);
    };

    const handleUpload = async () => {
        if (!file) {
            alert("Please select an audio file first.");
            return;
        }

        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await fetch("http://localhost:5000/api/ai/transcribe", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();
            console.log(transcription)
            setTranscription(data.transcription);
        } catch (error) {
            console.error("Error:", error);
            alert("Failed to transcribe the file.");
        }
    };

    const handleGenerateSummary = async () => {
        if (!transcription?.segments) {
            alert("Please upload and transcribe a file first.");
            return;
        }

        const dataToBeSend = transcription.segments;

        try {
            const response = await fetch("http://localhost:5000/api/ai/generate-summary", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ segments: dataToBeSend })
            });

            const data = await response.json();
            if (data) {
                localStorage.setItem('Theories', data.theories);
            }

            console.log(data.theories)

            setSummaryNotes(data.theories);
        } catch (error) {
            console.error("Error generating summary:", error);
            alert("Failed to generate summary.");
        }
    };


    return (
        <div style={{ padding: "20px", textAlign: "center", display: 'flex', flexDirection: 'column', flexWrap: 'wrap', alignContent: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ margin: '20px 0px' }}>Test OpenAI Transcription API</h2>
            <input type="file" accept="audio/*" onChange={handleFileChange} />
            <button onClick={handleUpload} style={{ margin: "30px 10px", border: 'blue solid 4px', color: 'Highlight', borderRadius: "20%" }}>
                Upload & Transcribe
            </button>
            <h3>Transcription:</h3>
            {/* <p>{transcription.segments.length ?? "Upload an audio file to see transcription here."}</p> */}
            <p>{transcription.text ?? "No text provided"}</p>

            <button onClick={handleGenerateSummary} style={{ margin: "10px", border: 'green solid 4px', color: 'green', borderRadius: "20%" }}>
                Generate Summary
            </button>

            <h3 style={{ marginTop: "40px" }}>📝 Summary Notes:</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {summaryNotes.length > 0 ? (
                    summaryNotes.map((element, index) => (
                        <div key={index} style={{ border: "1px solid #acc", padding: "10px", borderRadius: "8px" }}>
                            <h4>{element.range}</h4>
                            <p>{element.theory}</p>
                        </div>
                    ))
                ) : (
                    <p>No Notes generated yet</p>
                )}
            </div>


        </div>
    );
};

export default TranscriptionApp;

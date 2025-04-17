import React, { useState } from "react";

const TranscriptionApp = () => {
    const [file, setFile] = useState(null);
    const [transcription, setTranscription] = useState({});
    const [summaryNotes, setSummaryNotes] = useState([]);


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
                body: JSON.stringify({segments:dataToBeSend})
            });

            const data = await response.json();
            setSummaryNotes(data.notes);
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 my-16 gap-3 px-2 md:p-0">

                {transcription.segments && transcription.segments.map((segment, index) => {
                    return (

                        <div key={index} id={segment.id} className="border border-gray-500/30 pb-6 overflow-hidden rounded-lg">
                            <h3>
                                <p>Start Time:{segment.start}</p>
                                <p>End Time: {segment.end}</p>
                            </h3>
                            <p>Data: {segment.text}</p>

                        </div>
                    )
                })}
            </div>

            <button onClick={handleGenerateSummary} style={{ margin: "10px", border: 'green solid 4px', color: 'green', borderRadius: "20%" }}>
                Generate Summary
            </button>

            <h3 style={{ marginTop: "40px" }}>📝 Summary Notes:</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {summaryNotes && summaryNotes.map((note, index) => (
                    <div key={index} style={{ border: "1px solid #acc", padding: "10px", borderRadius: "8px" }}>
                        <h4>{note.range}</h4>
                        <p>{note.summary}</p>
                    </div>
                ))}
            </div>


        </div>
    );
};

export default TranscriptionApp;

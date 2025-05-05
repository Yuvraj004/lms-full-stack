import React, { useContext, useEffect, useState, useCallback, useRef } from "react";
import { AppContext } from '../../context/AppContext'; // Adjust path if needed
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import ReactPlayer from 'react-player/lazy'; // Import ReactPlayer (lazy load for better performance)

// Helper function to format duration (same as before)
const formatDuration = (totalSeconds) => {
    // ... (keep existing formatDuration function)
    if (isNaN(totalSeconds) || totalSeconds < 0) {
        return "00:00";
    }
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const minutesStr = String(minutes).padStart(2, '0');
    const secondsStr = String(seconds).padStart(2, '0');
    if (hours > 0) {
        const hoursStr = String(hours).padStart(2, '0');
        return `${hoursStr}:${minutesStr}:${secondsStr}`;
    } else {
        return `${minutesStr}:${secondsStr}`;
    }
};

// Helper function to calculate average rating (same as before)
const calculateAverageRating = (ratings) => {
    // ... (keep existing calculateAverageRating function)
    if (!ratings || ratings.length === 0) {
        return 0;
    }
    const total = ratings.reduce((sum, ratingObj) => sum + (ratingObj.rating || 0), 0);
    return (total / ratings.length).toFixed(1);
};


const CourseDetailPage = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const { backendUrl, getToken } = useContext(AppContext);
    const effectiveBackendUrl =  "http://localhost:5000";
    const videoRef = useRef(null);

    const [courseData, setCourseData] = useState(null);
    const [lectureUrl, setLectureUrl] = useState("");
    const [transcription, setTranscription] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [clicked, setClicked] = useState(false);
    const [timeTranscription, setTimeTranscription] = useState('');
    const [summaryNotes, setSummaryNotes] = useState([]);

    // --- State for Video Player ---
    const [currentVideoUrl, setCurrentVideoUrl] = useState(null);
    const [currentVideoTitle, setCurrentVideoTitle] = useState('');
    const [playingLectureId, setPlayingLectureId] = useState(null); // To highlight the playing lecture

    // Load summary notes from localStorage on component mount
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

    //Fetch Course Data (existing useEffect)
    useEffect(() => {
        const fetchCourseData = async () => {
            // ... (keep existing fetchCourseData logic)
            if (!courseId) {
                setError("No Course ID provided.");
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            setError(null);
            try {
                const token = await getToken();
                const res = await axios.get(`${backendUrl}/api/course/${courseId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.data && res.data.courseData) {
                    const fetchedData = {
                        ...res.data.courseData,
                        courseContent: Array.isArray(res.data.courseData.courseContent)
                            ? res.data.courseData.courseContent
                            : [],
                        courseRatings: Array.isArray(res.data.courseData.courseRatings)
                            ? res.data.courseData.courseRatings
                            : [],
                        enrolledStudents: Array.isArray(res.data.courseData.enrolledStudents)
                            ? res.data.courseData.enrolledStudents
                            : [],
                    };
                    setCourseData(fetchedData);
                } else {
                    setError("Course not found or invalid data received.");
                    toast.error("Could not load course details.");
                }
            } catch (err) {
                console.error("Error fetching course data:", err);
                const errorMessage = err.response?.data?.message || err.message || "Failed to load course data.";
                setError(errorMessage);
                toast.error(`Error: ${errorMessage}`);
            } finally {
                setIsLoading(false);
            }
        };
        fetchCourseData();
    }, [courseId, backendUrl, getToken, navigate]);

    // --- Handle Lecture Click for Video Playback ---
    const handleLectureClick = useCallback((lecture) => {
        // Basic Access Control: Allow only free previews for now
        // TODO: Enhance this check if user enrollment status is available
        const canPlay = lecture.isPreviewFree;

        if (lecture.lectureUrl && canPlay) {
            setCurrentVideoUrl(lecture.lectureUrl);
            setCurrentVideoTitle(lecture.lectureTitle);
            setPlayingLectureId(lecture.lectureId); // Set the ID of the playing lecture
            setLectureUrl(lecture.lectureUrl);
            handleTranscriptCreation(lecture.lectureUrl);
        } else if (!lecture.lectureUrl) {
            toast.info("Video for this lecture is not available yet.");
        } else {
            // If not a free preview and user isn't enrolled (assuming check needed)
            toast.info("Enroll in the course to watch this lecture.");
            // Optionally clear the player if a non-playable lecture is clicked
            setCurrentVideoUrl(null);
            setCurrentVideoTitle('');
            setPlayingLectureId(null);
        }
    }, []); // No dependencies needed if access logic is self-contained or comes from props/context later


    const handleTranscriptCreation = async (lectureUrl) => {
        if (!lectureUrl) {
            alert("Please select a video file first.");
            return;
        }
        setClicked(true);
        alert('generating Transcription');
        try {
            // Fetch the video file from Cloudinary URL
            const response = await fetch(lectureUrl);
            const blob = await response.blob();

            // Create a File object (optional name and MIME type)
            const file = new File([blob], "lecture.mp4", { type: blob.type });

            // Prepare FormData
            const formData = new FormData();
            formData.append("file", file);
            console.log("Sending file")

            // Send to backend
            const transcribeResponse = await fetch("http://localhost:5000/api/ai/transcribe", {
                method: "POST",
                body: formData,
            });
            console.log("receiving data")
            const data = await transcribeResponse.json();

            console.log(data.transcription.segments[0]);

            setTranscription(data.transcription); // or data.segments if you want segments
            setClicked(false);
        } catch (error) {
            console.error("Transcription Error:", error);
            alert("Failed to transcribe the video file.");
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
                localStorage.setItem('Theories', JSON.stringify(data.theories));
            }

            console.log(data.theories)

            setSummaryNotes(data.theories);
        } catch (error) {
            console.error("Error generating summary:", error);
            alert("Failed to generate summary.");
        }
    };

    const handleSliderChange = (e) => {
        const timeperiod = (e.target.value / 100) * videoRef.current.getDuration();
        const percentage = e.target.value / 100;
        const newTime = videoRef.current.getDuration() * percentage;

        if (videoRef.current) {
            videoRef.current.seekTo(newTime, "seconds");
        }
        const foundSegment = transcription.segments.find((segment) => {
            return timeperiod >= segment.start && timeperiod <= segment.end;
        });

        if (foundSegment) {
            setTimeTranscription(foundSegment.text);
            localStorage.setItem('Segment_Transcript', foundSegment.text);
        }
    };

    // --- Render Logic ---

    if (isLoading) {
        return <div className="container mx-auto p-10 text-center text-gray-600">Loading course details...</div>;
    }

    if (error) {
        return (
            <div className="container mx-auto p-10 text-center text-red-600">
                <p>Error loading course: {error}</p>
                <Link to="/dashboard" className="text-indigo-600 hover:underline mt-4 inline-block">Go back to Dashboard</Link>
            </div>
        );
    }

    if (!courseData) {
        return (
            <div className="container mx-auto p-10 text-center text-gray-600">
                Course not found.
                <Link to="/dashboard" className="text-indigo-600 hover:underline mt-4 inline-block">Go back to Dashboard</Link>
            </div>
        );
    }

    // Calculate display values (same as before)
    const averageRating = calculateAverageRating(courseData.courseRatings);
    const discountedPrice = (courseData.coursePrice * (1 - (courseData.discount || 0) / 100)).toFixed(2);
    const hasDiscount = courseData.discount > 0 && courseData.discount < 100;

    // Sort chapters (same as before)
    const sortedChapters = [...courseData.courseContent].sort((a, b) => (a.chapterOrder || 0) - (b.chapterOrder || 0));

    return (
        <div className="container mx-auto p-4 md:p-8 bg-gray-50 min-h-screen">
            <div className="bg-white shadow-lg rounded-lg overflow-hidden">

                {/* Optional Header with Thumbnail (same as before) */}
                {courseData.courseThumbnail && (
                    <div className="w-full h-48 md:h-64 overflow-hidden">
                        <img
                            src={courseData.courseThumbnail}
                            alt={`${courseData.courseTitle} thumbnail`}
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}

                {/* --- Video Player Area --- */}
                {currentVideoUrl && (
                    <div className="p-4 md:p-6 lg:p-8 bg-black relative">
                        {/* Close button - top right corner */}
                        <button
                            onClick={() => {
                                setCurrentVideoUrl(null);
                                setCurrentVideoTitle('');
                                setPlayingLectureId(null);
                            }}
                            className="absolute top-4 right-4 text-white hover:text-gray-300 focus:outline-none"
                            aria-label="Close video player"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <h2 className="text-xl font-semibold text-white mb-3">{currentVideoTitle}</h2>
                        <div className='player-wrapper aspect-video'> {/* aspect-video for 16:9 ratio */}
                            <ReactPlayer
                                ref={videoRef}
                                className='react-player'
                                url={currentVideoUrl}
                                width='100%'
                                height='100%'
                                controls={true}
                                playing={false} // Optional: Auto-play when selected
                                onError={e => {
                                    console.error('Video Player Error:', e)
                                    toast.error('Could not load video.');
                                    setCurrentVideoUrl(null); // Clear on error
                                }}
                            />

                            {/* --- Transcript Segments Slider --- */}
                            {transcription?.segments?.length > 0 && (
                                <div className="mt-6">
                                    <h3 className="text-lg text-white font-semibold mb-4">Transcript Segments</h3>

                                    {transcription && timeTranscription && (
                                        <>
                                            <div className="mb-6">
                                                <p className="mt-2 text-white">{timeTranscription}</p>
                                            </div>
                                        </>
                                    )}

                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        defaultValue="0"
                                        className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                                        onChange={(e) => handleSliderChange(e)}
                                    />
                                </div>
                            )}

                            {/* Summary Notes Section */}
                            <div className="mt-8">
                                <button
                                    onClick={handleGenerateSummary}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                    disabled={!transcription}
                                >
                                    Generate Summary
                                </button>

                                <h3 className="text-lg text-white font-semibold mt-6 mb-4">📝 Summary Notes:</h3>
                                <div className="space-y-4">
                                    {summaryNotes && summaryNotes.length > 0 ? (
                                        summaryNotes.map((element, index) => (
                                            <div
                                                key={index}
                                                className="border border-gray-300 p-4 rounded-lg bg-gray-800"
                                            >
                                                <h4 className="text-white font-medium">{element.range}</h4>
                                                <p className="text-gray-300 mt-2">{element.theory}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-gray-400 italic">No notes generated yet</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="p-6 md:p-8">
                    {/* Course Title and Basic Info (same as before) */}
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3">{courseData.courseTitle}</h1>
                    <p className="text-gray-600 mb-5 text-lg">{courseData.courseDescription}</p>

                    {/* Price and Discount (same as before) */}
                    <div className="mb-6 flex items-baseline space-x-3">
                        {/* ... price display ... */}
                        <span className="text-3xl font-bold text-indigo-600">${discountedPrice}</span>
                        {hasDiscount && (
                            <span className="text-xl text-gray-500 line-through">${courseData.coursePrice.toFixed(2)}</span>
                        )}
                        {hasDiscount && (
                            <span className="text-sm font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded">{courseData.discount}% off</span>
                        )}
                    </div>

                    {/* Metadata (same as before, corrected educator display) */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 text-sm text-gray-700">
                        {/* ... rating, students ... */}
                        <div>
                            <span className="font-semibold block">Rating:</span>
                            <span>{averageRating} / 5.0 ({courseData.courseRatings.length} ratings)</span>
                        </div>
                        <div>
                            <span className="font-semibold block">Students:</span>
                            <span>{courseData.enrolledStudents.length} enrolled</span>
                        </div>
                        <div>
                            <span className="font-semibold block">Educator:</span>
                            <span>
                                {courseData.educator ?
                                    (typeof courseData.educator === 'object' ?
                                        (courseData.educator.name || courseData.educator._id || 'Unknown Educator')
                                        : courseData.educator
                                    )
                                    : 'N/A'
                                }
                            </span>
                        </div>
                        <div>
                            <span className="font-semibold block">Status:</span>
                            <span className={`font-medium ${courseData.isPublished ? 'text-green-600' : 'text-red-600'}`}>
                                {courseData.isPublished ? 'Published' : 'Not Published'}
                            </span>
                        </div>
                        <div>
                            <span className="font-semibold block">Last Updated:</span>
                            <span>{new Date(courseData.updatedAt).toLocaleDateString()}</span>
                        </div>
                    </div>

                    {/* Course Content Section */}
                    <div className="mt-8 border-t pt-6">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-5">Course Curriculum</h2>
                        {sortedChapters.length > 0 ? (
                            <div className="space-y-5">
                                {sortedChapters.map((chapter, chapterIndex) => (
                                    <div key={chapter.chapterId || chapterIndex} className="bg-gray-100 rounded-lg p-4">
                                        <h3 className="text-lg font-semibold text-gray-700 mb-3">
                                            Chapter {chapterIndex + 1}: {chapter.chapterTitle}
                                        </h3>
                                        {/* Use <ul> for semantic list */}
                                        <ul className="space-y-1">
                                            {[...chapter.chapterContent]
                                                .sort((a, b) => (a.lectureOrder || 0) - (b.lectureOrder || 0))
                                                .map((lecture, lectureIndex) => {
                                                    // Determine if lecture is playable (based on current basic logic)
                                                    const isPlayable = lecture.isPreviewFree && lecture.lectureUrl;
                                                    // Determine if this lecture is the one currently playing
                                                    const isPlaying = playingLectureId === lecture.lectureId;

                                                    return (
                                                        <li key={lecture.lectureId || lectureIndex}>
                                                            {/* Make the entire item clickable */}
                                                            <button
                                                                onClick={() => handleLectureClick(lecture)}
                                                                disabled={!lecture.lectureUrl} // Disable button if no URL
                                                                className={`w-full flex justify-between items-center text-sm py-2 px-3 rounded transition-colors duration-150 ${isPlaying ? 'bg-indigo-100 text-indigo-800' : 'hover:bg-gray-200' // Highlight if playing
                                                                    } ${!lecture.lectureUrl ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`} // Style disabled state
                                                            >
                                                                <div className="flex items-center space-x-2 text-left">
                                                                    {/* Play Icon (conditional based on playing state or just static) */}
                                                                    <svg className={`w-4 h-4 ${isPlaying ? 'text-indigo-600' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                                    </svg>
                                                                    <span className="text-gray-800">{lecture.lectureTitle}</span>
                                                                    {lecture.isPreviewFree && (
                                                                        <span className="text-xs font-medium bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Preview</span>
                                                                    )}
                                                                </div>
                                                                <span className={`text-xs font-mono ${isPlaying ? 'text-indigo-700' : 'text-gray-500'}`}>
                                                                    {formatDuration(lecture.lectureDuration)}
                                                                </span>
                                                            </button>

                                                        </li>
                                                    );
                                                })}
                                            {chapter.chapterContent.length === 0 && (
                                                <li className="text-sm text-gray-500 italic px-3 py-2">No lectures in this chapter yet.</li>
                                            )}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-600 italic">No curriculum details available for this course yet.</p>
                        )}
                    </div>
                </div>
            </div>
        </div >
    );
};

export default CourseDetailPage;
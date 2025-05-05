import React, { useContext, useEffect, useState, useCallback } from "react";
import { AppContext } from '../../context/AppContext';
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs

const EditCourse = () => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const { backendUrl, getToken } = useContext(AppContext);
    const effectiveBackendUrl = 'http://localhost:5000';

    const [courseData, setCourseData] = useState(null); // Holds the entire course structure being edited
    const [originalCourseData, setOriginalCourseData] = useState(null); // To compare changes if needed (optional)
    const [newLectureFiles, setNewLectureFiles] = useState({}); // Maps tempLectureId to File object
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // --- Fetch Initial Course Data ---
    useEffect(() => {
        const fetchCourseData = async () => {
            setIsLoading(true);
            try {
                // Use axios for consistency and potential interceptors
                const token = await getToken();
                const res = await axios.get(`${backendUrl}/api/course/${courseId}`, {
                    headers: { Authorization: `Bearer ${token}` }, // Assuming fetching needs auth too
                });
                if (res.data && res.data.courseData) {
                    // Ensure courseContent exists, even if empty
                    const fetchedData = {
                        ...res.data.courseData,
                        courseContent: res.data.courseData.courseContent || [],
                    };
                    // Deep copy to avoid direct state mutation issues later
                    setCourseData(JSON.parse(JSON.stringify(fetchedData)));
                    setOriginalCourseData(JSON.parse(JSON.stringify(fetchedData))); // Store original
                } else {
                    toast.error("Course not found or failed to load data.");
                    navigate("/dashboard"); // Or appropriate redirect
                }
            } catch (err) {
                console.error("Error fetching course data:", err);
                toast.error(`Failed to load course: ${err.response?.data?.message || err.message}`);
                navigate("/dashboard"); // Or appropriate redirect
            } finally {
                setIsLoading(false);
            }
        };

        fetchCourseData();
    }, [courseId, backendUrl, getToken, navigate]);

    // --- Handlers for Course Level Details ---
    const handleCourseDetailChange = useCallback((e) => {
        const { name, value, type, checked } = e.target;
        const newValue = type === "checkbox" ? checked : value;
        // Ensure numeric fields are stored as numbers
        const finalValue = (name === 'coursePrice' || name === 'discount') ? (value === '' ? '' : Number(value)) : newValue;

        setCourseData(prev => ({ ...prev, [name]: finalValue }));
    }, []);


    // --- Handlers for Chapters ---
    const handleAddChapter = useCallback(() => {
        const newChapter = {
            chapterId: `temp_${uuidv4()}`, // Temporary ID
            chapterOrder: courseData.courseContent.length + 1,
            chapterTitle: "",
            chapterContent: [],
            isNew: true, // Flag to identify new chapters on submit
        };
        setCourseData(prev => ({
            ...prev,
            courseContent: [...prev.courseContent, newChapter]
        }));
    }, [courseData]); // Depend on courseData to get current length

    const handleChapterChange = useCallback((chapterIndex, e) => {
        const { name, value } = e.target;
        setCourseData(prev => {
            const updatedContent = [...prev.courseContent];
            updatedContent[chapterIndex] = {
                ...updatedContent[chapterIndex],
                [name]: value // e.g., chapterTitle
            };
            return { ...prev, courseContent: updatedContent };
        });
    }, []);

    const handleRemoveChapter = useCallback(async (chapterIndex) => {
        const chapterToRemove = courseData.courseContent[chapterIndex];
        const courseId = courseData._id;
        const chapterToRemoveId = chapterToRemove.chapterId;

        try {
            const token = await getToken();
            const config = { // This object is the configuration
                headers: { Authorization: `Bearer ${token}` }
            };
            const dataToSend = { // This object is the request body
                courseId,
                chapterId: chapterToRemoveId,
            };


            const response = await axios.put(
                `${backendUrl}/api/educator/del-coursedata/chapter`,
                dataToSend, // 2nd argument: data payload (request body)
                config      // 3rd argument: configuration object with headers
            );

            if (response?.status === 200) {
                toast.success(response.data.message);
                setCourseData(prev => ({
                    ...prev,
                    courseContent: prev.courseContent.filter((_, index) => index !== chapterIndex)
                }));
            }
            else if (response.data.success === false) {
                toast.warn(response.data.message);
                toast.error("Backend error lecture deletion error")
            }
        } catch (error) {
            toast.warn("Removing existing chapters requires backend support. This chapter is only removed from the current view.");
            console.log(error);
            toast.error("Couldn't process delete request at backend.")
        }

    }, [courseData, newLectureFiles]); // Depend on courseData and newLectureFiles

    // --- Handlers for Lectures ---
    const handleAddLecture = useCallback((chapterIndex) => {
        const chapter = courseData.courseContent[chapterIndex];
        const newLecture = {
            lectureId: `temp_${uuidv4()}`, // Temporary ID
            lectureTitle: "",
            lectureDuration: 0, // Default or prompt user
            lectureUrl: "", // Will be set by backend after upload
            isPreviewFree: false,
            lectureOrder: chapter.chapterContent.length + 1,
            isNew: true, // Flag to identify new lectures on submit
        };
        setCourseData(prev => {
            const updatedContent = [...prev.courseContent];
            updatedContent[chapterIndex] = {
                ...chapter,
                chapterContent: [...chapter.chapterContent, newLecture]
            };
            return { ...prev, courseContent: updatedContent };
        });
    }, [courseData]); // Depend on courseData

    const handleLectureChange = useCallback((chapterIndex, lectureIndex, e) => {
        const { name, value, type, checked } = e.target;
        const newValue = type === "checkbox" ? checked : value;
        // Ensure numeric fields are stored as numbers
        const finalValue = (name === 'lectureDuration' || name === 'lectureOrder') ? (value === '' ? '' : Number(value)) : newValue;

        setCourseData(prev => {
            const updatedContent = [...prev.courseContent];
            const updatedChapter = { ...updatedContent[chapterIndex] };
            const updatedLectures = [...updatedChapter.chapterContent];

            updatedLectures[lectureIndex] = {
                ...updatedLectures[lectureIndex],
                [name]: finalValue
            };

            updatedChapter.chapterContent = updatedLectures;
            updatedContent[chapterIndex] = updatedChapter;

            return { ...prev, courseContent: updatedContent };
        });
    }, []);

    const handleLectureFileChange = useCallback((tempLectureId, e) => {
        const file = e.target.files[0];
        if (file) {
            setNewLectureFiles(prev => ({
                ...prev,
                [tempLectureId]: file
            }));
        }
    }, []);


    const handleRemoveLecture = useCallback(async (chapterIndex, lectureIndex) => {
        const lectureToRemove = courseData.courseContent[chapterIndex].chapterContent[lectureIndex];
        const courseId = courseData._id;
        const chapterId = courseData.courseContent[chapterIndex].chapterId;
        const lectureId = lectureToRemove.lectureId;

        try {
            console.log(`Deleting Lecture ${lectureToRemove.lectureTitle}`);

            const token = await getToken()

            const config = { // This object is the configuration
                headers: { Authorization: `Bearer ${token}` }
            };
            const dataToSend = { // This object is the request body
                courseId,
                chapterId,
                lectureId
            };

            const response = await axios.put(
                `${backendUrl}/api/educator/del-coursedata/lecture`,
                dataToSend, // 2nd argument: data payload (request body)
                config      // 3rd argument: configuration object with headers
            );

            if (response?.status === 200) {
                toast.success("Chapter Deleted Succesfully");
                setCourseData(prev => {
                    const updatedContent = [...prev.courseContent];
                    const updatedChapter = { ...updatedContent[chapterIndex] };
                    updatedChapter.chapterContent = updatedChapter.chapterContent.filter((_, index) => index !== lectureIndex);
                    updatedContent[chapterIndex] = updatedChapter;
                    return { ...prev, courseContent: updatedContent };
                });
            }
            else if (response.data.success === false) {
                toast.warn(response.data.message);
                toast.error("Backend error lecture deletion error")
            }
        } catch (error) {
            toast.warn("Removing existing lectures requires backend support. This lecture is only removed from the current view.");
            console.log(error);
            toast.error("Couldn't process lecture delete request at backend.")
        }

    }, [courseData, newLectureFiles]); // Depend on courseData and newLectureFiles


    // --- Submission Logic ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!courseData) return;
        setIsSubmitting(true);

        // 1. Identify changes and new items
        const updatePayload = {
            courseTitle: courseData.courseTitle,
            courseDescription: courseData.courseDescription,
            coursePrice: courseData.coursePrice,
            discount: courseData.discount,
            isPublished: courseData.isPublished,
            newChapters: [],
            newLectures: []
        };
        const lectureFilesToSend = [];

        if (courseData.courseContent) {
            courseData.courseContent.forEach(chapter => {
                // Check if it's a new chapter (added via UI)
                if (chapter.isNew) {
                    // Generate permanent ID before sending or let backend handle it if preferred
                    const finalChapterId = uuidv4(); // Or let backend generate? API expects it.
                    const newChapterData = {
                        ...chapter,
                        chapterId: finalChapterId, // Use the final ID
                        chapterContent: [] // Lectures will be handled in newLectures
                    };
                    delete newChapterData.isNew; // Clean up temp flag
                    delete newChapterData.chapterContent; // Avoid sending nested lectures here

                    updatePayload.newChapters.push(newChapterData);


                    if (chapter.chapterContent) {
                        // Add lectures from this NEW chapter to newLectures
                        chapter.chapterContent.forEach(lecture => {
                            if (!lecture.isNew) {
                                console.warn("Unexpected: Existing lecture found within a new chapter state.");
                                return; // Skip if somehow an old lecture ended up in a new chapter state
                            }
                            if (!newLectureFiles[lecture.lectureId]) {
                                toast.error(`Missing video file for new lecture: ${lecture.lectureTitle}`);
                                setIsSubmitting(false); // Halt submission
                                throw new Error(`Missing video file for new lecture: ${lecture.lectureTitle}`); // Stop processing
                            }

                            const newLectureData = { ...lecture, chapterId: finalChapterId }; // Associate with the *new* chapter's final ID
                            delete newLectureData.isNew; // Clean up temp flag
                            delete newLectureData.lectureUrl; // Ensure URL is not sent
                            // Generate permanent lecture ID here if needed, or let backend handle it
                            // Assuming frontend generates it for now, based on Mongoose schema `required: true`
                            newLectureData.lectureId = uuidv4();


                            updatePayload.newLectures.push(newLectureData);
                            lectureFilesToSend.push(newLectureFiles[lecture.lectureId]); // Add file in corresponding order
                        });
                    }


                } else {
                    // It's an existing chapter, check for new lectures within it
                    chapter.chapterContent.forEach(lecture => {
                        if (lecture.isNew) {
                            if (!newLectureFiles[lecture.lectureId]) {
                                toast.error(`Missing video file for new lecture: ${lecture.lectureTitle}`);
                                setIsSubmitting(false); // Halt submission
                                throw new Error(`Missing video file for new lecture: ${lecture.lectureTitle}`); // Stop processing
                            }
                            const newLectureData = { ...lecture, chapterId: chapter.chapterId }; // Associate with EXISTING chapter ID
                            delete newLectureData.isNew;
                            delete newLectureData.lectureUrl;
                            // Generate permanent lecture ID
                            newLectureData.lectureId = uuidv4();

                            updatePayload.newLectures.push(newLectureData);
                            lectureFilesToSend.push(newLectureFiles[lecture.lectureId]);
                        }
                        // Note: Editing existing lectures isn't handled by this API structure
                    });
                }
            });
        }

        // 2. Create FormData
        const formData = new FormData();
        formData.append("updateData", JSON.stringify(updatePayload));
        if (lectureFilesToSend) {
            lectureFilesToSend.forEach((file) => {
                formData.append("videos", file); // Use "videos" as the field name expected by backend
            });
        }


        // 3. Send Request
        try {
            const token = await getToken();
            const { data } = await axios.put(
                `${backendUrl}/api/educator/edit-course/${courseId}`,
                formData,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    // Optional: Add progress tracking here if needed
                }
            );

            if (data.success) {
                toast.success(data.message || "Course updated successfully!");
                // Update local state with the final data from the backend
                setCourseData(JSON.parse(JSON.stringify(data.course)));
                setOriginalCourseData(JSON.parse(JSON.stringify(data.course)));
                setNewLectureFiles({}); // Clear staged files
                // Optionally navigate away or reset parts of the form
            } else {
                toast.error(data.message || "Failed to update course.");
            }
        } catch (err) {
            console.error("Update failed:", err);
            toast.error(`Update failed: ${err.response?.data?.message || err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Render Logic ---
    if (isLoading) return <div className="text-center p-10">Loading course data...</div>;
    if (!courseData) return <div className="text-center p-10 text-red-500">Could not load course data.</div>;

    return (
        <div className="container mx-auto p-4 lg:p-8">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">Edit Course</h1>
            <form onSubmit={handleSubmit} className="space-y-8 bg-white p-6 rounded-lg shadow-md">

                {/* Course Details Section */}
                <section className="space-y-4 border-b pb-6 mb-6">
                    <h2 className="text-xl font-semibold text-gray-700">Course Details</h2>
                    <div>
                        <label htmlFor="courseTitle" className="block text-sm font-medium text-gray-600 mb-1">Title</label>
                        <input
                            type="text"
                            id="courseTitle"
                            name="courseTitle"
                            value={courseData.courseTitle}
                            onChange={handleCourseDetailChange}
                            placeholder="Enter course title"
                            className="w-full border border-gray-300 p-2 rounded focus:ring-indigo-500 focus:border-indigo-500"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="courseDescription" className="block text-sm font-medium text-gray-600 mb-1">Description</label>
                        <textarea
                            id="courseDescription"
                            name="courseDescription"
                            value={courseData.courseDescription}
                            onChange={handleCourseDetailChange}
                            placeholder="Describe your course"
                            className="w-full border border-gray-300 p-2 rounded h-32 focus:ring-indigo-500 focus:border-indigo-500"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="coursePrice" className="block text-sm font-medium text-gray-600 mb-1">Price ($)</label>
                            <input
                                type="number"
                                id="coursePrice"
                                name="coursePrice"
                                value={courseData.coursePrice}
                                onChange={handleCourseDetailChange}
                                placeholder="e.g., 99.99"
                                className="w-full border border-gray-300 p-2 rounded focus:ring-indigo-500 focus:border-indigo-500"
                                required
                                min="0"
                                step="0.01"
                            />
                        </div>
                        <div>
                            <label htmlFor="discount" className="block text-sm font-medium text-gray-600 mb-1">Discount (%)</label>
                            <input
                                type="number"
                                id="discount"
                                name="discount"
                                value={courseData.discount}
                                onChange={handleCourseDetailChange}
                                placeholder="e.g., 10"
                                className="w-full border border-gray-300 p-2 rounded focus:ring-indigo-500 focus:border-indigo-500"
                                required
                                min="0"
                                max="100"
                            />
                        </div>
                        <div className="flex items-end pb-2">
                            <label className="flex items-center space-x-2 text-sm font-medium text-gray-600">
                                <input
                                    type="checkbox"
                                    name="isPublished"
                                    checked={courseData.isPublished}
                                    onChange={handleCourseDetailChange}
                                    className="rounded text-indigo-600 focus:ring-indigo-500"
                                />
                                <span>Publish Course</span>
                            </label>
                        </div>
                    </div>
                    {/* Add Thumbnail Update Here if needed - requires backend changes */}
                    {/* <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Current Thumbnail</label>
                        {courseData.courseThumbnail ? <img src={courseData.courseThumbnail} alt="Thumbnail" className="h-20 mb-2"/> : <p>None</p>}
                        <input type="file" name="thumbnailFile" onChange={handleThumbnailChange} />
                     </div> */}
                </section>

                {/* Chapters and Lectures Section */}
                <section className="space-y-6">
                    <h2 className="text-xl font-semibold text-gray-700 mb-4">Course Content</h2>
                    {courseData.courseContent?.map((chapter, chapterIndex) => (
                        <div key={chapter.chapterId} className="border border-gray-200 p-4 rounded-md bg-gray-50 space-y-4">
                            {/* Chapter Header */}
                            <div className="flex justify-between items-center">
                                <div className="flex-grow mr-4">
                                    <label htmlFor={`chapterTitle-${chapterIndex}`} className="sr-only">Chapter Title</label>
                                    <input
                                        type="text"
                                        id={`chapterTitle-${chapterIndex}`}
                                        name="chapterTitle" // Make sure this matches the handler logic
                                        value={chapter.chapterTitle}
                                        onChange={(e) => handleChapterChange(chapterIndex, e)}
                                        placeholder={`Chapter ${chapterIndex + 1} Title`}
                                        className="w-full border-gray-300 p-2 rounded font-medium text-lg focus:ring-indigo-500 focus:border-indigo-500"
                                        // disabled={!chapter.isNew} // Optionally disable editing existing titles if API doesn't support
                                        required
                                    />
                                    {/* Add Chapter Order input if needed */}
                                    {/* <input type="number" name="chapterOrder" value={chapter.chapterOrder} onChange={(e) => handleChapterChange(chapterIndex, e)} placeholder="Order" className="w-20 border p-1 rounded ml-2"/> */}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveChapter(chapterIndex)}
                                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                                    title="Remove Chapter"
                                >
                                    Remove Chapter
                                </button>
                            </div>

                            {/* Lectures within Chapter */}
                            <div className="pl-4 border-l-2 border-indigo-200 space-y-3">
                                {chapter.chapterContent?.map((lecture, lectureIndex) => (
                                    <div key={lecture.lectureId} className="border border-gray-300 p-3 rounded bg-white shadow-sm space-y-2">
                                        <div className="flex justify-between items-start">
                                            <p className="font-semibold text-gray-700">Lecture {lectureIndex + 1}</p>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveLecture(chapterIndex, lectureIndex)}
                                                className="text-red-500 hover:text-red-700 text-xs font-medium"
                                                title="Remove Lecture"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            name="lectureTitle"
                                            value={lecture.lectureTitle}
                                            onChange={(e) => handleLectureChange(chapterIndex, lectureIndex, e)}
                                            placeholder="Lecture Title"
                                            className="w-full border border-gray-300 p-1.5 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                            // disabled={!lecture.isNew} // Optionally disable editing existing titles
                                            required
                                        />
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <input
                                                type="number"
                                                name="lectureDuration"
                                                value={lecture.lectureDuration}
                                                onChange={(e) => handleLectureChange(chapterIndex, lectureIndex, e)}
                                                placeholder="Duration (seconds)"
                                                className="w-full border border-gray-300 p-1.5 rounded focus:ring-indigo-500 focus:border-indigo-500"
                                                // disabled={!lecture.isNew}
                                                required
                                            />
                                            <label className="flex items-center space-x-1.5">
                                                <input
                                                    type="checkbox"
                                                    name="isPreviewFree"
                                                    checked={lecture.isPreviewFree}
                                                    onChange={(e) => handleLectureChange(chapterIndex, lectureIndex, e)}
                                                    className="rounded text-indigo-600 focus:ring-indigo-500"
                                                // disabled={!lecture.isNew}
                                                />
                                                <span>Free Preview</span>
                                            </label>
                                        </div>
                                        {/* Add Lecture Order input if needed */}
                                        {/* Display existing lecture URL (read-only) */}
                                        {!lecture.isNew && lecture.lectureUrl && (
                                            <p className="text-xs text-gray-500 truncate">
                                                Video: <a href={lecture.lectureUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View Current Video</a>
                                            </p>
                                        )}
                                        {/* File input only for NEW lectures */}
                                        {lecture.isNew && (
                                            <div>
                                                <label htmlFor={`lectureFile-${lecture.lectureId}`} className="block text-xs font-medium text-gray-600 mb-1">Lecture Video File</label>
                                                <input
                                                    type="file"
                                                    id={`lectureFile-${lecture.lectureId}`}
                                                    accept="video/*"
                                                    onChange={(e) => handleLectureFileChange(lecture.lectureId, e)}
                                                    className="w-full text-sm border border-gray-300 rounded file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                                    required={lecture.isNew} // Required only if it's a new lecture
                                                />
                                                {newLectureFiles[lecture.lectureId] && <span className="text-xs text-green-600 ml-2">File selected: {newLectureFiles[lecture.lectureId].name}</span>}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {/* Add New Lecture Button */}
                                <button
                                    type="button"
                                    onClick={() => handleAddLecture(chapterIndex)}
                                    className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                                >
                                    + Add New Lecture to this Chapter
                                </button>
                            </div>
                        </div>
                    ))}

                    {/* Add New Chapter Button */}
                    <button
                        type="button"
                        onClick={handleAddChapter}
                        className="mt-4 bg-green-100 text-green-700 px-4 py-2 rounded hover:bg-green-200 font-medium"
                    >
                        + Add New Chapter
                    </button>
                </section>

                {/* Submission Button */}
                <div className="pt-6 border-t mt-6">
                    <button
                        type="submit"
                        className="bg-indigo-600 text-white px-6 py-2 rounded shadow hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isSubmitting || isLoading}
                    >
                        {isSubmitting ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate(-1)} // Go back
                        className="ml-4 bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EditCourse;
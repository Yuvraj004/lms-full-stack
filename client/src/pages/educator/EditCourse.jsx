import React, { useContext, useEffect, useState } from "react";
import { AppContext } from '../../context/AppContext';
import { useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";

const EditCourse = () => {
    const { courseId } = useParams();

    const [courseData, setCourseData] = useState({
        courseTitle: "",
        coursePrice: "",
        discount: "",
        courseDescription: "",
        isPublished: false,
        newChapters: [],
        newLectures: [],
    });
    const [videoFiles, setVideoFiles] = useState([]);
    const [prevCourseData, setPrevCourseData] = useState({});

    let { backendUrl ,getToken} = useContext(AppContext)

    backendUrl = "http://localhost:5000" || backendUrl;

    useEffect(() => {
        const fetchCourseData = async () => {
            try {
                const res = await fetch(`${backendUrl}/api/course/${courseId}`);
                const data = await res.json();
                setPrevCourseData(data.courseData);
            } catch (err) {
                console.error(err);
            }
        };

        fetchCourseData();
    }, [courseId]);


    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const newValue = type === "checkbox" ? checked : value;
        setCourseData({ ...courseData, [name]: newValue });
    };

    const handleFileChange = (e) => {
        setVideoFiles(Array.from(e.target.files));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const formData = new FormData();
        formData.append("updateData", JSON.stringify(courseData));
        videoFiles.forEach(file => formData.append("videos", file));
        
        const token = await getToken()

        try {
            
            const {data} = await axios.put(`${backendUrl}/api/educator/edit-course/${courseId}`,formData ,{
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (data.success) {
                toast.success(data.message);
                setCourseData(data.course);
            }

        } catch (err) {
            console.error("Update failed:", err);
        }
    };

    if (!courseData) return <div>Loading...</div>;

    return (
        <div className="max-w-2xl mx-auto p-4">
            <h2 className="text-2xl font-bold mb-6">Edit Course</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input
                    type="text"
                    name="courseTitle"
                    value={courseData.courseTitle}
                    onChange={handleChange}
                    placeholder={`Current Title: ${prevCourseData?.courseTitle || ''}`}
                    className="w-full border p-2 rounded"
                />
                <input
                    type="number"
                    name="coursePrice"
                    value={courseData.coursePrice}
                    onChange={handleChange}
                    placeholder={`Current Price: ${prevCourseData.coursePrice}`}
                    className="w-full border p-2 rounded"
                />
                <input
                    type="number"
                    name="discount"
                    value={courseData.discount}
                    onChange={handleChange}
                    placeholder={`Current Discount: ${prevCourseData.discount}`}
                    className="w-full border p-2 rounded"
                />
                <textarea
                    name="courseDescription"
                    value={courseData.courseDescription}
                    onChange={handleChange}
                    placeholder={`Current Description: ${prevCourseData?.courseDescription || ''}`}
                    className="w-full border p-2 rounded h-32"
                />
                <label className="block text-sm">Upload New Lecture Videos</label>
                <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="w-full border p-2 rounded"
                />
                <label className="flex items-center space-x-2">
                    <input
                        type="checkbox"
                        name="isPublished"
                        checked={courseData.isPublished}
                        onChange={handleChange}
                    />
                    <span>Publish Now</span>
                </label>
                <button
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    Save Changes
                </button>
            </form>
        </div>
    );
};

export default EditCourse;
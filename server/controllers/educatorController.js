import { v2 as cloudinary } from 'cloudinary'
import { Course, Lecture, Chapter } from '../models/Course.js';
import { Purchase } from '../models/Purchase.js';
import User from '../models/User.js';
import { clerkClient } from '@clerk/express'
import fs from 'fs';

// update role to educator
export const updateRoleToEducator = async (req, res) => {

    try {

        const userId = req.auth.userId

        await clerkClient.users.updateUserMetadata(userId, {
            publicMetadata: {
                role: 'educator',
            },
        })

        res.json({ success: true, message: 'You can publish a course now' })

    } catch (error) {
        res.json({ success: false, message: error.message })
    }

}

// Add New Course
export const addCourse = async (req, res) => {
    const imageFile = req.file //thumbnail optional

    try {

        const { courseData } = req.body

        const educatorId = req.auth.userId

        const parsedCourseData = await JSON.parse(courseData)

        parsedCourseData.educator = educatorId

        const newCourse = await Course.create(parsedCourseData)
        
        let imageUpload;

        if (imageFile){
            imageUpload = await cloudinary.uploader.upload(imageFile.path)
            newCourse.courseThumbnail = imageUpload.secure_url
        }

        await newCourse.save()
        if (imageFile) {
            fs.unlinkSync(imageFile.path)
        }

        res.json({ success: true, message: 'Course Added' })

    } catch (error) {
        if (imageFile) {
            fs.unlinkSync(imageFile.path)
        }
        res.json({ success: false, message: error.message })

    }
}

//Edit Course
export const editCourse = async (req, res) => {
    const { courseId } = req.params;
    const { updateData } = req.body; // JSON string
    const videoFiles = req.files; // multiple files (videos)
    const parsedUpdateData = JSON.parse(updateData); // parse body
    let correspondingFile;

    try {
        console.log("course id received", courseId)
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        // Optional course-level updates
        const {
            courseTitle,
            courseDescription,
            coursePrice,
            discount,
            isPublished,
            newChapters = [],
            newLectures = [] // format: [{ chapterId, lectureId, otherLectureData }]
        } = parsedUpdateData;

        if (courseTitle) course.courseTitle = courseTitle;
        if (courseDescription) course.courseDescription = courseDescription;
        if (typeof coursePrice === 'number') course.coursePrice = coursePrice;
        if (typeof discount === 'number') course.discount = discount;
        if (typeof isPublished === 'boolean') course.isPublished = isPublished;

        // Append new chapters
        if (newChapters.length > 0) {
            course.courseContent.push(...newChapters);
        }

        // Upload each lecture video and add it to the corresponding chapter
        for (let i = 0; i < newLectures.length; i++) {
            const { chapterId, ...lectureData } = newLectures[i];
            correspondingFile = videoFiles[i];

            if (!correspondingFile) continue;

            const uploadedVideo = await cloudinary.uploader.upload(correspondingFile.path, {
                resource_type: 'video'
            });

            lectureData.lectureUrl = uploadedVideo.secure_url;

            // Add lecture to the correct chapter
            const chapter = course.courseContent.find(c => c.chapterId === chapterId);
            if (chapter) {
                chapter.chapterContent.push(lectureData);
            }
        }

        await course.save();
        if (correspondingFile)
            fs.unlinkSync(correspondingFile.path)
        res.json({ success: true, message: 'Course updated successfully', course });
    } catch (error) {
        console.error(error);
        if (correspondingFile)
            fs.unlinkSync(correspondingFile.path)
        res.status(500).json({ success: false, message: error.message });
    }
};

//Delete Course
export const deleteCourse = async (req, res) => {
    const { courseId } = req.params;
    try {
        console.log('Course received for deletion')
        const deletedCourse = await Course.findByIdAndDelete(courseId).select('courseId updatedAt').lean();
        if (!deletedCourse) {
            return res.status(400).json({ success: false, message: 'Course could not be deleted. Check your courseId for typos.' })
        }

        res.status(200).json({ success: true, message: 'Course deleted successfully' })
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message })
    }
}

export const deleteCourseData = async (req, res) => {
    const { lectureId, chapterId, courseId } = req.body;
    
    try {
        if (!lectureId) {
            const deletedChapterResult = await Course.updateOne(
                { _id: courseId }, // Match the course document
                
                { $pull: { courseContent: { chapterId: chapterId } } } // Remove the element matching the chapterId from the array
            );

            // Check if a course was found and if a chapter was actually removed
            if (deletedChapterResult.matchedCount === 0) {
                return res.status(404).json({ success: false, message: 'Course not found.' });
            }
            if (deletedChapterResult.modifiedCount === 0) {
                // This means the course was found, but no chapter with that ID existed in its array
                return res.status(404).json({ success: false, message: 'Chapter not found within the course or could not be deleted. Check your chapterId.' });
            }

            return res.status(200).json({ success: true, message: 'Chapter deleted successfully.' });


        }
        else {
            const updateResult = await Course.updateOne(
                { _id: courseId }, // Match the course document
                // Use $pull with arrayFilters to target the nested lecture array
                { $pull: { 'courseContent.$[chapter].chapterContent': { lectureId: lectureId } } },
                // Define the filter for the chapter element
                { arrayFilters: [{ 'chapter.chapterId': chapterId }] }
            );

            // Check if a course was found and if a lecture was actually removed
            if (updateResult.matchedCount === 0) {
                return res.status(404).json({ success: false, message: 'Course not found.' });
            }
            if (updateResult.modifiedCount === 0) {
                // This means the course was found, but either the chapterId didn't match any chapters,
                // or the lectureId didn't match any lectures within the specified chapter.
                return res.status(404).json({ success: false, message: 'Lecture not found within the specified chapter or could not be deleted. Check your courseId, chapterId, and lectureId.' });
            }

            return res.status(200).json({ success: true, message: 'Lecture deleted successfully.' });

        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message })
    }
}

// Get Educator Courses
export const getEducatorCourses = async (req, res) => {
    try {

        const educator = req.auth.userId

        const courses = await Course.find({ educator })

        res.json({ success: true, courses })

    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Get Educator Dashboard Data ( Total Earning, Enrolled Students, No. of Courses)
export const educatorDashboardData = async (req, res) => {
    try {
        const educator = req.auth.userId;

        const courses = await Course.find({ educator });

        const totalCourses = courses.length;

        const courseIds = courses.map(course => course._id);

        // Calculate total earnings from purchases
        const purchases = await Purchase.find({
            courseId: { $in: courseIds },
            status: 'completed'
        });

        const totalEarnings = purchases.reduce((sum, purchase) => sum + purchase.amount, 0);

        // Collect unique enrolled student IDs with their course titles
        const enrolledStudentsData = [];
        for (const course of courses) {
            const students = await User.find({
                _id: { $in: course.enrolledStudents }
            }, 'name imageUrl');

            students.forEach(student => {
                enrolledStudentsData.push({
                    courseTitle: course.courseTitle,
                    student
                });
            });
        }

        res.json({
            success: true,
            dashboardData: {
                totalEarnings,
                enrolledStudentsData,
                totalCourses
            }
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Get Enrolled Students Data with Purchase Data
export const getEnrolledStudentsData = async (req, res) => {
    try {
        const educator = req.auth.userId;

        // Fetch all courses created by the educator
        const courses = await Course.find({ educator });

        // Get the list of course IDs
        const courseIds = courses.map(course => course._id);

        // Fetch purchases with user and course data
        const purchases = await Purchase.find({
            courseId: { $in: courseIds },
            status: 'completed'
        }).populate('userId', 'name imageUrl').populate('courseId', 'courseTitle');

        // enrolled students data
        const enrolledStudents = purchases.map(purchase => ({
            student: purchase.userId,
            courseTitle: purchase.courseId.courseTitle,
            purchaseDate: purchase.createdAt
        }));

        res.json({
            success: true,
            enrolledStudents
        });

    } catch (error) {
        res.json({
            success: false,
            message: error.message
        });
    }
};

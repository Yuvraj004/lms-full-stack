import express from 'express'
import { addCourse,deleteCourse,deleteCourseData,editCourse, educatorDashboardData, getEducatorCourses, getEnrolledStudentsData, updateRoleToEducator } from '../controllers/educatorController.js';
import upload from '../configs/multer.js';
import { protectEducator } from '../middlewares/authMiddleware.js';


const educatorRouter = express.Router()

// Add Educator Role 
educatorRouter.get('/update-role', updateRoleToEducator)

// Add Courses 
educatorRouter.post('/add-course', upload.single('image'), protectEducator, addCourse)

// support multiple videos under field name 'videos'
educatorRouter.put('/edit-course/:courseId', protectEducator, upload.array('videos'), editCourse);

// Delete Course
educatorRouter.delete('/del-course/:courseId', protectEducator, deleteCourse)

// Delete Course Data
educatorRouter.put('/del-coursedata/lecture', protectEducator, deleteCourseData);
educatorRouter.put('/del-coursedata/chapter', protectEducator, deleteCourseData);


// Get Educator Courses 
educatorRouter.get('/courses', protectEducator, getEducatorCourses)

// Get Educator Dashboard Data
educatorRouter.get('/dashboard', protectEducator, educatorDashboardData)

// Get Educator Students Data
educatorRouter.get('/enrolled-students', protectEducator, getEnrolledStudentsData)


export default educatorRouter;
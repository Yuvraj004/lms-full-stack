import React, { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import Loading from '../../components/student/Loading';

const MyCourses = () => {

  const { backendUrl, isEducator, currency, getToken } = useContext(AppContext)

  const navigate = useNavigate();
  const [courses, setCourses] = useState(null)

  const fetchEducatorCourses = async () => {

    try {

      const token = await getToken()

      const { data } = await axios.get(backendUrl + '/api/educator/courses', { headers: { Authorization: `Bearer ${token}` } })

      data.success && setCourses(data.courses)

    } catch (error) {
      toast.error(error.message)
    }

  }

  const handleDelete = async (itemId) => {
    try {
      console.log(`Deleted Course`);
      
      const token = await getToken()

      const response = await axios.delete(`${backendUrl}/api/educator/del-course/${itemId}`,
        {
          headers:
            { Authorization: `Bearer ${token}` }
        });
      console.log(response.data)
      if (response?.status === 200) {
        setCourses(courses.filter((item) => item._id !== itemId));
      }
    } catch (error) {
      console.log(error);
      toast.error("Couldn't process course delete request at backend.")
    }
  };

  useEffect(() => {
    if (isEducator) {
      fetchEducatorCourses()
    }
  }, [isEducator])

  return courses ? (
    <div className="h-screen flex flex-col items-start justify-between md:p-8 md:pb-0 p-4 pt-8 pb-0">
      <div className='w-full'>
        <h2 className="pb-4 text-lg font-medium">My Courses</h2>
        <div className="flex flex-col items-center max-w-4xl w-full overflow-hidden rounded-md bg-white border border-gray-500/20">
          <table className="md:table-auto table-fixed w-full overflow-hidden">
            <thead className="text-gray-900 border-b border-gray-500/20 text-sm text-left">
              <tr>
                <th className="px-4 py-3 font-semibold truncate">All Courses</th>
                <th className="px-4 py-3 font-semibold truncate">Earnings</th>
                <th className="px-4 py-3 font-semibold truncate">Students</th>
                <th className="px-4 py-3 font-semibold truncate">Published On</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-500">
              {courses.map((course) => (
                <tr key={course._id} className="border-b border-gray-500/20">
                  <td className="md:px-4 pl-2 md:pl-4 py-3 flex items-center space-x-3 truncate">
                    <img src={course.courseThumbnail} alt="Course Image" className="w-16" />
                    <Link to={`/educator/courseDetails/${course._id}`}><span className="truncate hidden md:block">{course.courseTitle}</span></Link>
                  </td>
                  <td className="px-4 py-3">{currency} {Math.floor(course.enrolledStudents.length * (course.coursePrice - course.discount * course.coursePrice / 100))}</td>
                  <td className="px-4 py-3">{course.enrolledStudents.length}</td>
                  <td className="px-4 py-3">
                    {new Date(course.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/educator/edit-course/${course._id}`)}
                      className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition"
                    >
                      Edit
                    </button>
                  </td>
                  <td className='px-2 py-3'>
                    <button
                      onClick={() => handleDelete(course._id)}
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  ) : <Loading />
};

export default MyCourses;
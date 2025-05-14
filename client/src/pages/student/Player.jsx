import React, { useContext, useEffect, useState, useRef } from 'react'
import { AppContext } from '../../context/AppContext'
import YouTube from 'react-youtube';
import { assets } from '../../assets/assets';
import { useParams } from 'react-router-dom';
import humanizeDuration from 'humanize-duration';
import axios from 'axios';
import { toast } from 'react-toastify';
import Rating from '../../components/student/Rating';
import Footer from '../../components/student/Footer';
import Loading from '../../components/student/Loading';
import ReactPlayer from 'react-player/lazy'; // Import ReactPlayer (lazy load for better performance)

const Player = ({ }) => {

  const { enrolledCourses, backendUrl, getToken, calculateChapterTime, userData, fetchUserEnrolledCourses } = useContext(AppContext)

  const { courseId } = useParams()
  const [courseData, setCourseData] = useState(null)
  const [progressData, setProgressData] = useState(null)
  const [openSections, setOpenSections] = useState({});
  const [playerData, setPlayerData] = useState(null);
  const [initialRating, setInitialRating] = useState(0);

  const [transcription, setTranscription] = useState({});
  const [timeTranscription, setTimeTranscription] = useState('');
  const [clicked, setClicked] = useState(false);
  const [summaryNotes, setSummaryNotes] = useState({});
  const videoRef = useRef(null);

  const getCourseData = () => {
    enrolledCourses.map((course) => {
      if (course._id === courseId) {
        setCourseData(course)
        course.courseRatings.map((item) => {
          if (item.userId === userData._id) {
            setInitialRating(item.rating)
          }
        })
      }
    })
  }

  const toggleSection = (index) => {
    setOpenSections((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };


  useEffect(() => {
    if (enrolledCourses.length > 0) {
      getCourseData()
    }
  }, [enrolledCourses])

  const markLectureAsCompleted = async (lectureId) => {

    try {

      const token = await getToken()

      const { data } = await axios.post(backendUrl + '/api/user/update-course-progress',
        { courseId, lectureId },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (data.success) {
        toast.success(data.message)
        getCourseProgress()
      } else {
        toast.error(data.message)
      }

    } catch (error) {
      toast.error(error.message)
    }

  }

  const getCourseProgress = async () => {

    try {

      const token = await getToken()

      const { data } = await axios.post(backendUrl + '/api/user/get-course-progress',
        { courseId },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (data.success) {
        setProgressData(data.progressData)
      } else {
        toast.error(data.message)
      }

    } catch (error) {
      toast.error(error.message)
    }

  }

  const handleRate = async (rating) => {

    try {

      const token = await getToken()

      const { data } = await axios.post(backendUrl + '/api/user/add-rating',
        { courseId, rating },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (data.success) {
        toast.success(data.message)
        fetchUserEnrolledCourses()
      } else {
        toast.error(data.message)
      }

    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleTranscriptCreation = async (lectureUrl, lectureId, chapterId, courseId) => {
    if (!lectureUrl) {
      alert("Please select a video file first.");
      return;
    }
    setClicked(true);
    console.log(`generating Transcription for courseId: ${courseId} , chapterId: ${chapterId} , lectureId: ${lectureId}`);
    try {
      // Fetch the video file from Cloudinary URL
      const response = await fetch(lectureUrl);
      const blob = await response.blob();

      // Create a File object (optional name and MIME type)
      const file = new File([blob], "lecture.mp4", { type: blob.type });

      // Prepare FormData
      const formData = new FormData();
      formData.append('lectureId', lectureId)
      formData.append('chapterId', chapterId)
      formData.append('courseId', courseId)
      formData.append("file", file);

      // Send to backend
      const transcribeResponse = await fetch("http://localhost:5000/api/ai/transcribe", {
        method: "POST",
        body: formData,
      });
      console.log("receiving data")
      const data = await transcribeResponse.json();

      // console.log(data.transcription);

      setTranscription(data.transcription); // or data.segments if you want segments
      setClicked(false);
    } catch (error) {
      console.error("Transcription Error:", error);
      alert("Failed to transcribe the video file.");
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

  const handleSliderChangeFromVideo = (seconds) => {

    const foundSegment = transcription.segments.find((segment) => {
      return seconds >= segment.start && seconds <= segment.end;
    });

    if (foundSegment) {
      setTimeTranscription(foundSegment.text);
      localStorage.setItem('Segment_Transcript', foundSegment.text);
    }
  }

  const handleGenerateSummary = async (lectureId) => {
    if (!transcription?.segments) {
      alert("Please upload and transcribe a file first.");
      return;
    }
    console.log('sending summary request')

    const dataToBeSend = transcription.segments;

    try {
      const response = await fetch("http://localhost:5000/api/ai/generate-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ segments: dataToBeSend, lectureId: lectureId })
      });

      const data = await response.json();
      // if (data) {
      //   localStorage.setItem('Theories', JSON.stringify(data.theories));
      // }

      console.log({
        lectureId: lectureId,
        notes: data.theories
      }
      )

      setSummaryNotes({
        lectureId: lectureId,
        notes: data.theories
      });
    } catch (error) {
      console.error("Error generating summary:", error);
      alert("Failed to generate summary.");
    }
  };


  useEffect(() => {

    getCourseProgress()

  }, [])

  return courseData ? (
    <>

      <div className='p-4 sm:p-10 flex flex-col-reverse md:grid md:grid-cols-2 gap-10 md:px-36' >
        <div className=" text-gray-800" >
          <h2 className="text-xl font-semibold">Course Structure</h2>
          <div className="pt-5">
            {courseData && courseData.courseContent.map((chapter, index) => (
              <div key={index} className="border border-gray-300 bg-white mb-2 rounded">
                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
                  onClick={() => toggleSection(index)}
                >
                  <div className="flex items-center gap-2">
                    <img src={assets.down_arrow_icon} alt="arrow icon" className={`transform transition-transform ${openSections[index] ? "rotate-180" : ""}`} />
                    <p className="font-medium md:text-base text-sm">{chapter.chapterTitle}</p>
                  </div>
                  <p className="text-sm md:text-default">{chapter.chapterContent.length} lectures - {calculateChapterTime(chapter)}</p>
                </div>

                <div className={`overflow-hidden transition-all duration-300 ${openSections[index] ? "max-h-100" : "max-h-0"}`} >
                  <ul className="list-disc md:pl-10 pl-4 pr-4 py-2 text-gray-600 border-t border-gray-300">
                    {chapter.chapterContent.map((lecture, i) => (
                      <li key={i} className="flex-row items-start  py-1">
                        <div className='flex flex-row items-center justify-between'>
                          <img src={progressData && progressData.lectureCompleted.includes(lecture.lectureId) ? assets.blue_tick_icon : assets.play_icon} alt="bullet icon" className="w-4 h-4 mt-1 pr-1 " />
                          <div className="flex items-center justify-between w-full text-gray-800 text-xs md:text-default ">
                            <p>{lecture.lectureTitle}</p>
                            <div className='flex gap-2'>
                              {lecture.lectureUrl && <p onClick={() => {
                                setPlayerData({ ...lecture, chapter: index + 1, lecture: i + 1 });
                                handleTranscriptCreation(lecture.lectureUrl, lecture.lectureId, chapter.chapterId, courseId);
                              }} className='text-blue-500 cursor-pointer'>Watch</p>}
                              <p>{humanizeDuration(lecture.lectureDuration * 60 * 1000, { units: ['h', 'm'] })}</p>
                            </div>
                          </div>
                        </div>
                        {/* Summary Notes Section */}
                        <div className="mt-8" disabled={!summaryNotes}>
                          <button
                            onClick={() => {
                              console.log('button clicked');

                              handleGenerateSummary(lecture.lectureId)
                            }}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-red-600 transition-colors"

                            disabled={clicked}
                          >
                            Generate Summary
                          </button>

                          {summaryNotes.notes && lecture.lectureId == summaryNotes.lectureId &&
                            <>
                              <h3 className="text-lg text-black font-semibold mt-6 mb-4">📝 Summary Notes:</h3>
                              <div className="space-y-4">
                                
                                {summaryNotes.notes && summaryNotes.notes.length > 0 ? (

                                  summaryNotes.notes.map((element, index) => (
                                    <>
                                      <div
                                        key={index}
                                        className="border border-gray-300 p-4 rounded-lg"
                                      >
                                        <h4 className="text-black font-medium italic">{element.range}</h4>
                                        <p className="text-gray-900 mt-2">{element.theory}</p>
                                      </div>
                                    </>
                                  ))
                                ) : (
                                  <p className="text-gray-600 italic">No notes generated yet</p>
                                )}
                              </div>
                            </>
                          }
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          <div className=" flex items-center gap-2 py-3 mt-10">
            <h1 className="text-xl font-bold">Rate this Course:</h1>
            <Rating initialRating={initialRating} onRate={handleRate} />
          </div>

        </div>

        <div className='md:mt-10'>
          {
            playerData
              ? (
                <>
                  <div>
                    {/* --- Video Player Area --- */}
                    {playerData.lectureUrl && (
                      <div className="p-4 md:p-6 lg:p-8 bg-black relative">
                        <h2 className="text-xl font-semibold text-white mb-3">{playerData.lectureTitle}</h2>
                        <div className='player-wrapper aspect-video'> {/* aspect-video for 16:9 ratio */}
                          <ReactPlayer
                            ref={videoRef}
                            className='react-player'
                            url={playerData.lectureUrl}
                            width='100%'
                            height='100%'
                            controls={true}
                            playing={false} // Optional: Auto-play when selected
                            onSeek={e => { handleSliderChangeFromVideo(e) }}
                            onError={e => {
                              console.error('Video Player Error:', e)
                              toast.error('Could not load video.');
                              // setCurrentVideoUrl(null); // Clear on error
                            }}

                          />

                          {/* --- Transcript Segments Slider --- */}
                          {transcription && transcription?.segments?.length > 0 ?
                            (
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
                            ) : (<p className='text-xl font-semibold text-white'>Transcription: Loading...</p>)
                          }


                        </div>
                      </div>
                    )}
                    <div className='flex justify-between items-center mt-1'>
                      <p className='text-xl '>{playerData.chapter}.{playerData.lecture} {playerData.lectureTitle}</p>
                      <button onClick={() => markLectureAsCompleted(playerData.lectureId)} className='text-blue-600'>{progressData && progressData.lectureCompleted.includes(playerData.lectureId) ? 'Completed' : 'Mark Complete'}</button>
                    </div>
                  </div>
                </>
              )
              : <img src={courseData ? courseData.courseThumbnail : ''} alt="" />
          }
        </div>
      </div>
      <Footer />
    </>
  ) : <Loading />
}

export default Player
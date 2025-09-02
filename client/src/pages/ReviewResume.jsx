import { FileText, Sparkles } from 'lucide-react'
import React, { useState } from 'react'
import axios from 'axios'
import { useAuth } from '@clerk/clerk-react'
import toast from 'react-hot-toast'
import Markdown from 'react-markdown';

axios.defaults.baseURL = import.meta.env.VITE_BASE_URL

const ReviewResume = () => {
  const [input, setInput] = useState(null)
  const [loading, setLoading] = useState(false)
  const [content, setContent] = useState('')
  const [dragActive, setDragActive] = useState(false)
  
  const { getToken } = useAuth()
    
  const onSubmitHandler = async (e) => {
    e.preventDefault()
    if (!input) return toast.error("Please upload a resume")
    
    try {
      setLoading(true)
      setContent('')

      const formData = new FormData()
      formData.append('resume', input)

      const { data } = await axios.post(
        '/api/ai/resume-review',
        formData,
        { headers: { Authorization: `Bearer ${await getToken()}` } }
      )

      if (data.success) setContent(data.content)
      else toast.error(data.message)

    } catch (error) {
      toast.error(error.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type !== 'application/pdf') return toast.error('Only PDF files are supported.')
      setInput(file)
      setContent('')
    }
  }

  return (
    <div className="h-full overflow-y-scroll p-6 flex items-start flex-wrap gap-4 text-slate-700">
      {/* left col */}
      <form
        onSubmit={onSubmitHandler}
        className="w-full max-w-lg p-4 bg-white rounded-lg border border-gray-200"
      >
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 text-[#00DA83]" />
          <h1 className="text-xl font-semibold">Resume Review</h1>
        </div>

        <p className="mt-6 text-sm font-medium">Upload resume</p>

        {/* Drag-and-drop and click area */}
        <label
        onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`w-full p-6 mt-2 border-2 rounded-lg text-center cursor-pointer transition-all
          ${dragActive 
            ? 'border-[#00DA83] bg-[#f0fff6] shadow-inner' 
            : 'border-gray-300 bg-white hover:border-[#00DA83] hover:shadow-xs'} 
          flex flex-col justify-center items-center gap-2`}
      >
        <FileText className="w-8 h-8  text-[#00DA83]" />
        <span className="text-xs text-gray-500 font-light mt-1">
          {input ? input.name : 'Drag & drop your PDF here or click to select'}
        </span>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => {
            const file = e.target.files[0]
            if (file) setInput(file)
            setContent('')
          }}
          className="hidden"
        />
      </label>

{input && <p className="text-xs text-gray-500 mt-1">Selected file: {input.name}</p>}

        <p className='text-xs text-gray-500 font-light mt-1'>Supports PDF resume only.</p>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center items-center gap-2 bg-gradient-to-r from-[#00DA83] to-[#009BB3] text-white px-4 py-2 mt-6 text-sm rounded-lg cursor-pointer disabled:opacity-50"
        >
          {loading 
            ? <span className='w-4 h-4 my-1 rounded-full border-2 border-t-transparent animate-spin'></span>
            : <FileText className="w-5" />
          } 
          Review Resume
        </button>
      </form>

      {/* right col (preview panel) */}
      <div className="w-full max-w-lg p-4 bg-white rounded-lg flex flex-col border border-gray-200 min-h-96 max-h-[600px]">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-[#00DA83]" />
          <h1 className="text-xl font-semibold">Analysis Results</h1>
        </div>

        {!content ? (
          <div className="flex-1 flex justify-center items-center">
            <div className="text-sm flex flex-col items-center gap-5 text-gray-400">
              <FileText className="w-9 h-9" />
              <p >Upload a resume and click "Review Resume" to get started</p>
            </div>
          </div>
        ) : (
          <div className='mt-3 h-full overflow-y-scroll text-sm text-slate-600'>
            <Markdown>{content}</Markdown>
          </div>
        )}
      </div>
    </div>
  )
}

export default ReviewResume

import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function MyInquiryWritePage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [inquiryContent, setInquiryContent] = useState('');

  const handleSubmit = () => {
    // TODO: 문의 등록 로직 구현
    navigate(-1);
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-[#fdfdfe]">
      <div className="flex items-center h-14 px-4 bg-[#5382E0] border-b border-[#5382E0]">
        <button className="absolute left-4" onClick={() => navigate(-1)}>
          <img src="/back.png" alt="뒤로가기" className="w-6 h-6 invert brightness-0" />
        </button>
        <span className="flex-1 text-center text-white font-bold text-lg">1:1 문의</span>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pt-6">
        <div className="mb-6">
          <div className="text-[#5382E0] font-bold text-base mb-2">문의 제목</div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="문의 제목을 입력해주세요"
            className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#5382E0]"
          />
        </div>
        <div className="mb-6">
          <div className="text-[#5382E0] font-bold text-base mb-2">문의 내용</div>
          <textarea
            value={inquiryContent}
            onChange={(e) => setInquiryContent(e.target.value)}
            placeholder="문의하실 내용을 자세히 작성해주세요."
            className="w-full h-40 p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-[#5382E0] resize-none"
          />
        </div>
      </div>
      <div className="px-5 py-6">
        <div className="flex gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex-1 h-12 border border-[#5382E0] text-[#5382E0] rounded-lg font-bold"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 h-12 bg-[#5382E0] text-white rounded-lg font-bold"
          >
            등록
          </button>
        </div>
      </div>
    </div>
  );
} 
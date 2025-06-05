import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomBar from './BottomBar';
import shuttleData from '../mocks/shuttle_schedule.json';

type TimetableItem = {
  거점: string;
  차량규격: string;
  소요시간: string;
  승차장소?: string;
  하차장소?: string;
  출발시간: { [key: string]: string }[];
};

interface ShuttleScheduleJson {
  출근: TimetableItem[];
  퇴근: TimetableItem[];
}

// Extract unique locations from 출근 and 퇴근
const getLocations = () => {
  const go = shuttleData["출근"].map((item) => item["거점"]);
  const back = shuttleData["퇴근"].map((item) => item["거점"]);
  return Array.from(new Set([...go, ...back]));
};

const LOCATIONS = getLocations();
const TYPES = ["출근", "퇴근"] as const;
type TabType = typeof TYPES[number];

// 도착 시간 계산 함수
function getArrivalTime(departure: string, duration: string): string {
  // departure: '07:20', duration: '15분' 등
  const [h, m] = departure.split(":").map(Number);
  const min = parseInt(duration);
  if (isNaN(h) || isNaN(m) || isNaN(min)) return '';
  const date = new Date(2000, 0, 1, h, m + min);
  const hh = date.getHours().toString().padStart(2, '0');
  const mm = date.getMinutes().toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

// 출발 시간이 현재 시간 이전인지 확인하는 함수
function isPastTime(departure: string) {
  // 테스트용: 현재 시간을 8:20으로 고정
  const now = new Date();
  now.setHours(8, 20, 0, 0);
  const [h, m] = departure.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return false;
  const dep = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
  return dep < now;
}

// 슬라이드 탭에서 스크롤바 숨김
const timetableScrollbarStyle = `
  .timetable-no-scrollbar::-webkit-scrollbar { display: none; }
  .timetable-no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
`;

// 시간 입력 핸들러 (숫자만, 자동 HH:MM 포맷)
function handleTimeInput(val: string, setValue: (v: string) => void) {
  // 숫자만 남기기
  let digits = val.replace(/\D/g, '');
  if (digits.length > 4) digits = digits.slice(0, 4);
  let formatted = digits;
  if (digits.length > 2) {
    formatted = digits.slice(0, 2) + ':' + digits.slice(2);
  }
  setValue(formatted);
}

export default function ShuttleTimetablePage() {
  // timetableData는 수정/삭제를 위해 state로 관리
  const [timetableData, setTimetableData] = useState<ShuttleScheduleJson>(
    shuttleData as unknown as ShuttleScheduleJson
  );

  const navigate = useNavigate();
  const [locationIdx, setLocationIdx] = useState(0);
  const [tab, setTab] = useState<TabType>("출근");
  const location = LOCATIONS[locationIdx];

  const locationTabRef = useRef<HTMLDivElement>(null);
  const selectedBtnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // --- 추가: 수정 모드 및 액션시트 상태 ---
  const [isEditMode, setIsEditMode] = useState(false);
  const [editIdx, setEditIdx] = useState<{itemIdx: number, timeIdx: number} | null>(null); // 현재 수정 중인 시간
  const [editValue, setEditValue] = useState('');
  // 액션 팝업 방식 복원
  const [openActionIdx, setOpenActionIdx] = useState<number | null>(null); // 어떤 시간의 액션시트가 열려있는지
  const actionSheetRef = useRef<HTMLDivElement | null>(null);

  // 수정 모드 취소/완료를 위한 원본 백업
  const [originalTimetableData, setOriginalTimetableData] = useState<ShuttleScheduleJson | null>(null);

  // Filter timetable for selected location and type
  const timetable: TimetableItem[] = timetableData[tab].filter(
    (item) => item.거점 === location
  );

  // 거점 슬라이드 탭: 모든 거점 버튼을 한 줄에 보여주고, 좌우 화살표로 선택 이동
  const handlePrev = () => {
    setLocationIdx((prev) => (prev - 1 + LOCATIONS.length) % LOCATIONS.length);
  };
  const handleNext = () => {
    setLocationIdx((prev) => (prev + 1) % LOCATIONS.length);
  };

  // 화살표로 이동 시, 선택된 거점이 항상 보이도록 스크롤
  useEffect(() => {
    const btn = selectedBtnRefs.current[locationIdx];
    if (btn && locationTabRef.current) {
      btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [locationIdx]);

  // 액션시트 바깥 클릭 시 닫기
  useEffect(() => {
    if (openActionIdx === null) return;
    function handleClick(e: MouseEvent | TouchEvent) {
      if (actionSheetRef.current && !actionSheetRef.current.contains(e.target as Node)) {
        setOpenActionIdx(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [openActionIdx]);

  // 전체적으로 추가/수정 중인지 체크 (어떤 카드든 editIdx가 있으면 true)
  const isAnyCardEditing = Boolean(editIdx);

  // 현재 locationIdx(선택된 거점)의 카드에서만 추가/수정 인풋이 열려 있을 때
  const isCurrentLocationEditing = Boolean(editIdx && editIdx.itemIdx === locationIdx);

  return (
    <div className="bg-white pb-16" style={{ minHeight: 'calc(var(--vh, 1vh) * 100)' }}>
      {/* 상단바 */}
      <div className="fixed left-0 top-0 right-0 z-20 flex items-center h-14 px-4 border-b border-gray-100 bg-[#5382E0]">
        <button className="absolute left-4" onClick={() => navigate(-1)}>
          <img src="/back.png" alt="뒤로가기" className="w-6 h-6 invert brightness-0" />
        </button>
        <div className="flex-1 text-center font-semibold text-lg text-white">셔틀 시간표</div>
        {!isEditMode && (
          <button
            className="absolute right-4 text-white text-sm border border-white rounded px-2 py-1 bg-[#5382E0]"
            onClick={() => {
              setOriginalTimetableData(JSON.parse(JSON.stringify(timetableData)));
              setIsEditMode(true);
            }}
          >수정하기</button>
        )}
      </div>
      {/* 거점 슬라이드 탭 (한 줄, 좌우 화살표로 이동, 넘치면 가로 스크롤) */}
      <div className="pt-16 flex items-center justify-center mb-2 select-none">
        <button onClick={handlePrev} className="pl-6 pr-3 py-1 text-[#5382E0] text-lg font-bold" aria-label="이전 거점">&#60;</button>
        <div
          ref={locationTabRef}
          className="flex gap-2 flex-nowrap w-full max-w-full overflow-x-auto timetable-no-scrollbar"
          style={{ scrollBehavior: 'smooth' }}
        >
          {LOCATIONS.map((loc, idx) => (
            <button
              key={loc}
              ref={el => { selectedBtnRefs.current[idx] = el; }}
              className={`px-4 py-1 rounded-full border text-sm font-semibold whitespace-nowrap flex-shrink-0 ${location === loc ? 'bg-[#5382E0] text-white border-[#5382E0]' : 'bg-white text-[#5382E0] border-[#5382E0]'}`}
              style={{ minWidth: 'fit-content' }}
              onClick={() => setLocationIdx(idx)}
            >
              {loc}
            </button>
          ))}
        </div>
        <button onClick={handleNext} className="pr-6 pl-3 py-1 text-[#5382E0] text-lg font-bold" aria-label="다음 거점">&#62;</button>
      </div>
      {/* 출근/퇴근 탭 */}
      <div className="flex justify-center gap-2 mb-6">
        {TYPES.map((t) => (
          <button
            key={t}
            className={`px-4 py-1 rounded-full border text-sm font-semibold ${tab === t ? 'bg-[#5382E0] text-white border-[#5382E0]' : 'bg-white text-[#5382E0] border-[#5382E0]'}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {/* 시간표 */}
      <div className="px-4">
        {timetable.length === 0 ? (
          <div className="text-center text-gray-400 py-8">해당 노선의 시간표가 없습니다.</div>
        ) : (
          timetable.map((item, idx) => (
            <div key={idx} className="w-full max-w-md bg-[#5382E0] rounded-xl text-white flex flex-col items-center mb-6 py-3 px-4 relative">
              {/* 노선 헤더 */}
              <div className="text-lg font-bold mb-1 text-center w-full">
                {tab === "출근"
                  ? `${location} → 아이티센 타워`
                  : `아이티센 타워 → ${location}`}
              </div>
              {/* 승/하차 장소 안내 (카드 안쪽, 헤더 아래) */}
              <div className="text-xs text-blue-100 mb-8 w-full text-center">
                {tab === "출근"
                  ? `승차 장소: ${item.승차장소}`
                  : `하차 장소: ${item.하차장소}`}
              </div>
              {/* 소요시간 */}
              <div className="text-base font-semibold mb-2 w-full text-center">소요시간: {item.소요시간}</div>
              {/* 출발/도착/소요 카드형 2열 그리드 */}
              <div className="grid grid-cols-2 gap-3 w-full max-w-md mt-2">
                {item.출발시간
                  .map((t, i) => {
                    const depTime = Object.values(t)[0];
                    const isPast = isPastTime(depTime);
                    // 수정 중인지 확인
                    const isEditing = editIdx && editIdx.itemIdx === idx && editIdx.timeIdx === i;
                    return (
                      <div
                        key={i}
                        className={
                          `rounded-xl flex flex-col items-center py-3 shadow w-full relative ` +
                          ((isPast && !isEditMode)
                            ? 'bg-gray-200 text-gray-400'
                            : 'bg-white text-[#5382E0]')
                        }
                      >
                        {isEditing ? (
                          <>
                            <input
                              className="text-xl font-bold font-mono border rounded px-2 py-1 w-20 text-center text-[#5382E0]"
                              value={editValue}
                              onChange={e => handleTimeInput(e.target.value, setEditValue)}
                              maxLength={5}
                              placeholder="00:00"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              autoFocus
                            />
                            <div className="flex gap-2 mt-2">
                              <button
                                className={`px-2 py-1 text-xs rounded bg-white border border-[#5382E0] font-semibold ${/^\d{2}:\d{2}$/.test(editValue) ? 'text-[#5382E0]' : 'text-gray-300 border-gray-200 cursor-not-allowed'}`}
                                disabled={!/^\d{2}:\d{2}$/.test(editValue)}
                                onClick={() => {
                                  if (!/^\d{2}:\d{2}$/.test(editValue) || !editValue.trim()) {
                                    // 빈 값이거나 잘못된 값이면 해당 카드 삭제
                                    setTimetableData(prev => {
                                      const newData = JSON.parse(JSON.stringify(prev));
                                      const list = newData[tab].find((it: TimetableItem) => it.거점 === location);
                                      if (list) {
                                        const removeIdx = item.출발시간.findIndex(obj => Object.values(obj)[0] === '' || Object.values(obj)[0] === editValue);
                                        if (removeIdx !== -1) {
                                          list.출발시간.splice(removeIdx, 1);
                                        }
                                      }
                                      return newData;
                                    });
                                    setEditIdx(null);
                                    return;
                                  }
                                  setTimetableData(prev => {
                                    const newData = JSON.parse(JSON.stringify(prev));
                                    const list = newData[tab].find((it: TimetableItem) => it.거점 === location);
                                    if (list) {
                                      // 정렬 전 원본 인덱스 찾기
                                      const origIdx = item.출발시간.findIndex(obj => Object.values(obj)[0] === depTime || Object.values(obj)[0] === '');
                                      if (origIdx !== -1) {
                                        const key = Object.keys(item.출발시간[origIdx])[0];
                                        // 기존 key(회차)는 그대로, 값만 변경
                                        list.출발시간[origIdx][key] = editValue;
                                        // 정렬
                                        list.출발시간.sort((a: { [key: string]: string }, b: { [key: string]: string }) => {
                                          const tA = Object.values(a)[0] as string;
                                          const tB = Object.values(b)[0] as string;
                                          if (tA === "") return 1;
                                          if (tB === "") return -1;
                                          return tA.localeCompare(tB);
                                        });
                                      }
                                    }
                                    return newData;
                                  });
                                  setEditIdx(null);
                                }}
                              >확인</button>
                              <button
                                className="px-2 py-1 text-xs rounded bg-white border border-gray-300 text-gray-500"
                                onClick={() => {
                                  // 만약 depTime이 ''(빈 값)이면, 방금 추가한 임시 시간 삭제
                                  if (depTime === '') {
                                    setTimetableData(prev => {
                                      const newData = JSON.parse(JSON.stringify(prev));
                                      const list = newData[tab].find((it: TimetableItem) => it.거점 === location);
                                      if (list) {
                                        const removeIdx = item.출발시간.findIndex(obj => Object.values(obj)[0] === '');
                                        if (removeIdx !== -1) {
                                          list.출발시간.splice(removeIdx, 1);
                                        }
                                      }
                                      return newData;
                                    });
                                  }
                                  setEditIdx(null);
                                }}
                              >취소</button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-xl font-bold font-mono">{depTime}</div>
                            <div className="text-xs mt-1">도착: {getArrivalTime(depTime, item.소요시간)}</div>
                            {/* --- 더보기(⋮) 버튼: 수정 모드일 때만 --- */}
                            {isEditMode && !isEditing && (
                              <button
                                className={
                                  "absolute top-0 right-2 p-1 rounded hover:bg-gray-100" +
                                  (isAnyCardEditing ? " opacity-50 cursor-not-allowed" : "")
                                }
                                disabled={isAnyCardEditing}
                                onClick={() => {
                                  if (isAnyCardEditing) return;
                                  setOpenActionIdx(i);
                                }}
                              >
                                <span className="text-2xl font-bold">⋮</span>
                              </button>
                            )}
                            {/* --- 액션시트(수정/삭제) --- */}
                            {isEditMode && openActionIdx === i && !isEditing && (
                              <div
                                ref={actionSheetRef}
                                className="absolute top-8 right-2 bg-white border rounded shadow z-30 flex flex-col min-w-[80px]"
                              >
                                <button
                                  className="px-3 py-2 text-sm text-[#5382E0] hover:bg-blue-50 text-left"
                                  onClick={() => {
                                    setEditIdx({itemIdx: idx, timeIdx: i});
                                    setEditValue(depTime);
                                    setOpenActionIdx(null);
                                  }}
                                >수정</button>
                                <button
                                  className="px-3 py-2 text-sm text-red-500 hover:bg-red-50 text-left"
                                  onClick={() => {
                                    setTimetableData(prev => {
                                      const newData = JSON.parse(JSON.stringify(prev));
                                      const list = newData[tab].find((it: TimetableItem) => it.거점 === location);
                                      if (list) {
                                        // 정렬 전 원본 인덱스 찾기
                                        const origIdx = item.출발시간.findIndex(obj => Object.values(obj)[0] === depTime);
                                        if (origIdx !== -1) {
                                          list.출발시간.splice(origIdx, 1);
                                        }
                                      }
                                      return newData;
                                    });
                                    setOpenActionIdx(null);
                                  }}
                                >삭제</button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
              </div>
              {/* 카드 바깥에 출발시간 추가 버튼 복원 (수정 모드에서만) */}
              {isEditMode && (() => {
                // 출발시간 추가 인풋 또는 기존 시간 카드 수정 중인지 체크
                const isCurrentLocationEditing = Boolean(editIdx && editIdx.itemIdx === idx);
                return (
                  <div className="mt-6 w-full flex flex-col items-center">
                    <button
                      className={
                        "px-3 py-2 rounded-full border border-[#5382E0] text-[#5382E0] bg-white text-sm font-semibold hover:bg-blue-50" +
                        (isCurrentLocationEditing ? " opacity-50 cursor-not-allowed" : "")
                      }
                      disabled={isCurrentLocationEditing}
                      onClick={() => {
                        if (isCurrentLocationEditing) return;
                        setTimetableData(prev => {
                          const newData = JSON.parse(JSON.stringify(prev));
                          const list = newData[tab].find((it: TimetableItem) => it.거점 === location);
                          if (list) {
                            const nextNum = list.출발시간.length + 1;
                            list.출발시간.push({ [`${nextNum}회`]: '' });
                          }
                          return newData;
                        });
                        setEditIdx({ itemIdx: idx, timeIdx: timetable[idx].출발시간.length });
                        setEditValue('');
                      }}
                    >+ 출발시간 추가</button>
                  </div>
                );
              })()}
            </div>
          ))
        )}
      </div>
      {/* 하단바 */}
      <BottomBar />
      {/* 셔틀 시간표 내에서만 스크롤바 숨김 스타일 */}
      <style>{timetableScrollbarStyle}</style>
      {/* 하단 고정 완료/취소 바 (수정 모드에서만) */}
      {isEditMode && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white flex h-16 px-4 gap-3 items-center justify-center">
          <button
            className={
              "flex-1 h-11 rounded-lg border font-semibold text-base " +
              (isCurrentLocationEditing
                ? "bg-gray-200 border-gray-200 text-gray-400 cursor-not-allowed"
                : "border-gray-300 bg-white text-gray-600")
            }
            disabled={isCurrentLocationEditing}
            onClick={() => {
              if (isCurrentLocationEditing) return;
              if (originalTimetableData) setTimetableData(originalTimetableData);
              setIsEditMode(false);
              setOriginalTimetableData(null);
            }}
          >취소</button>
          <button
            className={
              "flex-1 h-11 rounded-lg font-semibold text-base " +
              (isCurrentLocationEditing
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-[#5382E0] text-white")
            }
            disabled={isCurrentLocationEditing}
            onClick={() => {
              if (isCurrentLocationEditing) return;
              setIsEditMode(false);
              setOriginalTimetableData(null);
            }}
          >수정 완료</button>
        </div>
      )}
    </div>
  );
}

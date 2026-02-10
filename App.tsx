
import React, { useState } from 'react';
import { JobRequirements, CandidateResult, HSEDesignation } from './types';
import { extractTextFromPdf, extractTextFromTxt } from './services/pdfService';
import { screenResume } from './services/geminiService';

const App: React.FC = () => {
  const [jobReqs, setJobReqs] = useState<JobRequirements>({
    minExperience: 5,
    requiredSkills: ['Safety Management', 'Risk Assessment', 'HSE Auditing'],
    certifications: { nebosh: true, level6: true, adosh: true },
    natureOfExperience: ['Rail', 'Infrastructure', 'Bridges', 'Villa', 'Building', 'Offshore', 'Onshore', 'Facility Management']
  });

  const [candidates, setCandidates] = useState<CandidateResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Logic refined based on user prompt: 
  // 4yr -> Inspector, 5-7 -> Officer, 10-15 -> Engineer, 15+ -> Manager
  const calculateDesignation = (years: number): HSEDesignation => {
    if (years >= 15) return 'HSE/Safety Manager';
    if (years >= 10) return 'HSE/Safety Engineer';
    if (years >= 5) return 'HSE/Safety Officer';
    if (years >= 0) return 'HSE/Safety Inspector';
    return 'Not Qualified';
  };

  const calculateMatchScore = (data: any): number => {
    let score = 0;
    // Weights: Certs (45%), Experience Nature (35%), Years (20%)
    if (data.hasNebosh) score += 15;
    if (data.hasLevel6) score += 15;
    if (data.hasAdosh) score += 15;

    const natureMatches = data.natureOfExperienceFound.filter((n: string) =>
      jobReqs.natureOfExperience.some(rn => n.toLowerCase().includes(rn.toLowerCase()))
    );
    score += Math.min(35, (natureMatches.length / 2) * 17.5);

    if (data.yearsOfExperience >= 5) score += 20;
    else score += (data.yearsOfExperience / 5) * 20;

    return Math.round(score);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setUploadProgress(0);

    const fileList: File[] = Array.from(files);
    const newCandidates: CandidateResult[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const id = Math.random().toString(36).substr(2, 9);
      
      try {
        let text = '';
        if (file.type === 'application/pdf') {
          text = await extractTextFromPdf(file);
        } else if (file.type === 'text/plain') {
          text = await extractTextFromTxt(file);
        } else { continue; }

        const extracted = await screenResume(text, jobReqs);
        const score = calculateMatchScore(extracted);
        const designation = calculateDesignation(extracted.yearsOfExperience);

        newCandidates.push({
          ...extracted,
          id,
          fileName: file.name,
          matchScore: score,
          designation,
          timestamp: Date.now(),
          status: 'completed'
        });
      } catch (error) {
        console.error("Error processing file:", file.name, error);
      }
      setUploadProgress(Math.round(((i + 1) / fileList.length) * 100));
    }

    setCandidates(prev => [...newCandidates, ...prev]);
    setIsProcessing(false);
  };

  const exportToCsv = () => {
    const headers = ["Designation", "Experience", "NEBOSH", "ADOSH", "LEVEL 6", "NATURE OF EXPERIENCE", "Full Name", "Email", "Phone", "Match Score"];
    const rows = candidates.map(c => [
      `"${c.designation}"`,
      `"${c.yearsOfExperience}Y"`,
      c.hasNebosh ? "YES" : "NO",
      c.hasAdosh ? "YES" : "NO",
      c.hasLevel6 ? "YES" : "NO",
      `"${c.natureOfExperienceFound.join(", ")}"`,
      `"${c.fullName}"`,
      `"${c.email}"`,
      `"${c.phone}"`,
      `"${c.matchScore}%"`
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `HSE_Screening_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-slate-50">
      <header className="max-w-full mx-auto mb-8 flex flex-col lg:flex-row justify-between items-center gap-6 print:hidden">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 text-white p-3 rounded-2xl shadow-xl">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 leading-tight">HSE Recruitment Screening</h1>
            <p className="text-slate-500 font-medium">Automatic designation & qualification verification</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <label className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold cursor-pointer transition-all shadow-lg active:scale-95 flex items-center gap-2 group">
            <svg className="w-5 h-5 group-hover:bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload Multiple Files
            <input type="file" multiple accept=".pdf,.txt" className="hidden" onChange={handleFileUpload} disabled={isProcessing} />
          </label>
          <div className="h-10 w-[1px] bg-slate-200 mx-2 hidden lg:block"></div>
          <button onClick={exportToCsv} className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-6 py-3 rounded-2xl font-bold transition shadow-sm flex items-center gap-2 active:scale-95">
            <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Excel (CSV)
          </button>
          <button onClick={() => window.print()} className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-6 py-3 rounded-2xl font-bold transition shadow-sm flex items-center gap-2 active:scale-95">
            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print PDF
          </button>
        </div>
      </header>

      <main className="max-w-full mx-auto space-y-8">
        {isProcessing && (
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 print:hidden overflow-hidden relative">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-ping"></div>
                <span className="text-sm font-bold text-slate-600 uppercase tracking-widest">Processing Candidates...</span>
              </div>
              <span className="text-lg font-black text-indigo-600">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3">
              <div 
                className="bg-indigo-600 h-3 rounded-full transition-all duration-500 shadow-sm shadow-indigo-200" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Unified Data Table as shown in the request image */}
        <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1200px]">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-800">
                  <th className="p-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Designation</th>
                  <th className="p-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Experience</th>
                  <th className="p-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">NEBOSH</th>
                  <th className="p-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">ADOSH</th>
                  <th className="p-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Level 6</th>
                  <th className="p-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Nature of Experience</th>
                  <th className="p-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">Candidate Details</th>
                  <th className="p-5 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {candidates.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="bg-slate-100 p-6 rounded-full">
                          <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <p className="text-slate-400 font-bold italic tracking-wide">No candidates processed. Please upload resumes.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  candidates.map((candidate) => (
                    <tr key={candidate.id} className="hover:bg-indigo-50/30 transition-colors group border-b border-slate-100">
                      <td className="p-5">
                        <Badge designation={candidate.designation} />
                      </td>
                      <td className="p-5 text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-lg font-black text-slate-800">{candidate.yearsOfExperience}Y</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Total</span>
                        </div>
                      </td>
                      <td className="p-5">
                        <StatusIcon active={candidate.hasNebosh} />
                      </td>
                      <td className="p-5">
                        <StatusIcon active={candidate.hasAdosh} />
                      </td>
                      <td className="p-5">
                        <StatusIcon active={candidate.hasLevel6} />
                      </td>
                      <td className="p-5">
                        <div className="flex flex-wrap gap-1.5 max-w-[280px]">
                          {candidate.natureOfExperienceFound.map((n, i) => (
                            <span key={i} className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 rounded-lg text-[10px] font-black uppercase tracking-tighter shadow-sm">
                              {n}
                            </span>
                          ))}
                          {candidate.natureOfExperienceFound.length === 0 && <span className="text-slate-300 italic text-xs">Not found</span>}
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-900 text-sm">{candidate.fullName}</span>
                          <span className="text-xs text-indigo-600 font-bold">{candidate.email}</span>
                          <span className="text-[10px] text-slate-400 font-medium">{candidate.phone}</span>
                        </div>
                      </td>
                      <td className="p-5 text-right">
                        <div className={`text-2xl font-black ${candidate.matchScore >= 70 ? 'text-emerald-600' : candidate.matchScore >= 40 ? 'text-amber-600' : 'text-rose-600'}`}>
                          {candidate.matchScore}%
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Classification Legend as per image */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 print:hidden">
          <LegendCard title="HSE Inspector" exp="0-5 Years" color="bg-amber-100" textColor="text-amber-800" />
          <LegendCard title="HSE Officer" exp="5-10 Years" color="bg-emerald-100" textColor="text-emerald-800" />
          <LegendCard title="HSE Engineer" exp="10-15 Years" color="bg-blue-100" textColor="text-blue-800" />
          <LegendCard title="HSE Manager" exp="15+ Years" color="bg-purple-100" textColor="text-purple-800" />
        </div>
      </main>
    </div>
  );
};

const Badge: React.FC<{ designation: HSEDesignation }> = ({ designation }) => {
  const getStyles = () => {
    switch(designation) {
      case 'HSE/Safety Manager': return 'bg-purple-600 text-white shadow-purple-200';
      case 'HSE/Safety Engineer': return 'bg-blue-600 text-white shadow-blue-200';
      case 'HSE/Safety Officer': return 'bg-emerald-600 text-white shadow-emerald-200';
      case 'HSE/Safety Inspector': return 'bg-amber-500 text-white shadow-amber-200';
      default: return 'bg-slate-400 text-white shadow-slate-200';
    }
  };
  return (
    <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg ${getStyles()}`}>
      {designation}
    </span>
  );
};

const StatusIcon: React.FC<{ active: boolean }> = ({ active }) => (
  <div className="flex flex-col items-center justify-center gap-1">
    {active ? (
      <>
        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
        <span className="text-[10px] font-black text-emerald-600 uppercase">Yes</span>
      </>
    ) : (
      <>
        <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-300 flex items-center justify-center shadow-inner">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <span className="text-[10px] font-black text-rose-300 uppercase">No</span>
      </>
    )}
  </div>
);

const LegendCard: React.FC<{ title: string; exp: string; color: string; textColor: string }> = ({ title, exp, color, textColor }) => (
  <div className={`${color} p-5 rounded-[1.5rem] border border-white/50 shadow-sm flex items-center justify-between`}>
    <div>
      <h4 className={`text-[10px] font-black uppercase tracking-widest ${textColor} opacity-60 mb-1`}>{title}</h4>
      <p className={`text-lg font-black ${textColor}`}>{exp}</p>
    </div>
    <div className={`w-8 h-8 rounded-full bg-white/40 flex items-center justify-center`}>
      <svg className={`w-5 h-5 ${textColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
      </svg>
    </div>
  </div>
);

export default App;

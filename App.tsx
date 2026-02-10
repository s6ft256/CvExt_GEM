
import React, { useState } from 'react';
import { JobRequirements, CandidateResult, HSEDesignation } from './types';
import { extractTextFromPdf, extractTextFromTxt } from './services/pdfService';
import { screenResume } from './services/geminiService';

const LOGO_URL = "https://www.multiply-marketing.com/trojan-wp/wp-content/uploads/2020/08/tgc-logo-300x300.png";

const App: React.FC = () => {
  const [jobReqs] = useState<JobRequirements>({
    minExperience: 5,
    requiredSkills: ['Safety Management', 'Risk Assessment', 'HSE Auditing', 'Site Supervision'],
    certifications: { nebosh: true, level6: true, adosh: true },
    natureOfExperience: ['Rail', 'Infrastructure', 'Bridges', 'Villa', 'Building', 'Offshore', 'Onshore', 'Facility Management']
  });

  const [candidates, setCandidates] = useState<CandidateResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const calculateDesignation = (years: number): HSEDesignation => {
    if (years >= 15) return 'HSE/Safety Manager';
    if (years >= 10) return 'HSE/Safety Engineer';
    if (years >= 5) return 'HSE/Safety Officer';
    return 'HSE/Safety Inspector';
  };

  const calculateMatchScore = (data: any): number => {
    let score = 0;
    if (data.hasNebosh) score += 20;
    if (data.hasLevel6) score += 20;
    if (data.hasAdosh) score += 20;
    const natureMatches = data.natureOfExperienceFound || [];
    if (natureMatches.length > 0) score += 20;
    if (data.yearsOfExperience >= 5) score += 20;
    return Math.min(100, score);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setUploadProgress(0);
    setErrorMessage(null);

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
      } catch (error: any) {
        console.error("Error processing file:", file.name, error);
        setErrorMessage(error.message || "An unexpected error occurred.");
        break;
      }
      setUploadProgress(Math.round(((i + 1) / fileList.length) * 100));
    }

    setCandidates(prev => [...newCandidates, ...prev]);
    setIsProcessing(false);
  };

  const exportToExcel = () => {
    const headers = ["Full Name", "Email", "Designation", "Exp (Yrs)", "NEBOSH", "ADOSH", "LEVEL 6", "Nature of Experience"];
    const rows = candidates.map(c => [
      c.fullName,
      c.email,
      c.designation,
      c.yearsOfExperience,
      c.hasNebosh ? "YES" : "NO",
      c.hasAdosh ? "YES" : "NO",
      c.hasLevel6 ? "YES" : "NO",
      (c.natureOfExperienceFound || []).join(", ")
    ]);

    const csvContent = [headers, ...rows].map(e => e.map(val => `"${val}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `TGC_HSE_Screening_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadPdf = () => {
    // @ts-ignore
    const jspdf = window.jspdf;
    if (!jspdf) return;
    const doc = new jspdf.jsPDF('landscape');
    doc.setFontSize(18);
    doc.text("TGC HSE Recruitment Matrix", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

    const headers = [["Full Name", "Email", "Designation", "Exp", "NEBOSH", "ADOSH", "L6", "Nature of Exp"]];
    const data = candidates.map(c => [
      c.fullName,
      c.email,
      c.designation,
      `${c.yearsOfExperience}Y`,
      c.hasNebosh ? "YES" : "NO",
      c.hasAdosh ? "YES" : "NO",
      c.hasLevel6 ? "YES" : "NO",
      (c.natureOfExperienceFound || []).slice(0, 3).join(", ")
    ]);

    // @ts-ignore
    doc.autoTable({
      head: headers,
      body: data,
      startY: 35,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 8 }
    });

    doc.save(`TGC_HSE_Report.pdf`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <nav className="bg-white border-b border-slate-200 py-4 px-6 lg:px-12 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-5">
            <img src={LOGO_URL} alt="TGC Logo" className="w-12 h-12 object-contain" />
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">TGC Recruitment</h1>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">HSE Verification Suite</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer transition-all shadow-lg flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              Upload Resumes
              <input type="file" multiple accept=".pdf,.txt" className="hidden" onChange={handleFileUpload} disabled={isProcessing} />
            </label>
            <button onClick={exportToExcel} disabled={candidates.length === 0} className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-emerald-600 font-bold text-xs disabled:opacity-30">EXCEL</button>
            <button onClick={downloadPdf} disabled={candidates.length === 0} className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-indigo-600 font-bold text-xs disabled:opacity-30">PDF</button>
          </div>
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto p-6 lg:p-12 space-y-8 flex-grow w-full">
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-start gap-3 text-red-700 animate-in fade-in slide-in-from-top-4">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            <div className="flex-grow">
              <p className="text-sm font-bold">Processing Error</p>
              <p className="text-xs mt-1">{errorMessage}</p>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-600">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            </button>
          </div>
        )}

        {isProcessing && (
          <div className="bg-white p-6 rounded-3xl shadow-xl border border-indigo-50 animate-pulse">
             <div className="flex justify-between items-center mb-4">
               <h2 className="text-lg font-bold text-slate-800">Processing Resumes...</h2>
               <span className="text-indigo-600 font-black">{uploadProgress}%</span>
             </div>
             <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
               <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
             </div>
          </div>
        )}

        <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left min-w-[1200px]">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Full Name</th>
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Email</th>
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Designation</th>
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Exp</th>
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">NEBOSH</th>
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">ADOSH</th>
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Level 6</th>
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Nature of Exp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {candidates.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-32 text-center text-slate-400 font-bold italic">
                      No candidates processed yet. Upload resumes to begin.
                    </td>
                  </tr>
                ) : (
                  candidates.map((candidate) => (
                    <tr key={candidate.id} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="p-6 font-bold text-slate-900">{candidate.fullName}</td>
                      <td className="p-6 text-indigo-600 text-xs font-medium">{candidate.email}</td>
                      <td className="p-6"><DesignationBadge designation={candidate.designation} /></td>
                      <td className="p-6 text-center font-black text-slate-700">{candidate.yearsOfExperience}Y</td>
                      <td className="p-6 text-center"><StatusCheck active={candidate.hasNebosh} /></td>
                      <td className="p-6 text-center"><StatusCheck active={candidate.hasAdosh} /></td>
                      <td className="p-6 text-center"><StatusCheck active={candidate.hasLevel6} /></td>
                      <td className="p-6">
                        <div className="flex flex-wrap gap-1">
                          {(candidate.natureOfExperienceFound || []).map((n, i) => (
                            <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-black uppercase">{n}</span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <footer className="py-6 border-t border-slate-200 bg-white text-center">
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">© 2026 TGC HSE RECRUITMENT PORTAL • DEVELOPED BY @ELIUS</p>
      </footer>
    </div>
  );
};

const DesignationBadge = ({ designation }: { designation: string }) => {
  const colors = designation.includes('Manager') ? 'bg-purple-100 text-purple-700' : 
                 designation.includes('Engineer') ? 'bg-blue-100 text-blue-700' :
                 designation.includes('Officer') ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700';
  return <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight ${colors}`}>{designation}</span>;
};

const StatusCheck = ({ active }: { active: boolean }) => (
  <span className={`text-[10px] font-black uppercase ${active ? 'text-emerald-600' : 'text-slate-300'}`}>
    {active ? 'Yes' : 'No'}
  </span>
);

export default App;

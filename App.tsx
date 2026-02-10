
import React, { useState } from 'react';
import { JobRequirements, CandidateResult, HSEDesignation } from './types';
import { extractTextFromPdf, extractTextFromTxt } from './services/pdfService';
import { screenResume } from './services/geminiService';

const LOGO_URL = "https://www.multiply-marketing.com/trojan-wp/wp-content/uploads/2020/08/tgc-logo-300x300.png";

const App: React.FC = () => {
  const [jobReqs, setJobReqs] = useState<JobRequirements>({
    minExperience: 5,
    requiredSkills: ['Safety Management', 'Risk Assessment', 'HSE Auditing', 'Site Supervision'],
    certifications: { nebosh: true, level6: true, adosh: true },
    natureOfExperience: ['Rail', 'Infrastructure', 'Bridges', 'Villa', 'Building', 'Offshore', 'Onshore', 'Facility Management']
  });

  const [candidates, setCandidates] = useState<CandidateResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Designation logic strictly based on prompt requirements:
  // 4yr -> Inspector
  // 5-7yr -> Officer
  // 10-15yr -> Engineer
  // 15yr+ -> Manager
  const calculateDesignation = (years: number): HSEDesignation => {
    if (years >= 15) return 'HSE/Safety Manager';
    if (years >= 10) return 'HSE/Safety Engineer';
    if (years >= 5) return 'HSE/Safety Officer';
    if (years >= 0) return 'HSE/Safety Inspector';
    return 'Not Qualified';
  };

  const calculateMatchScore = (data: any): number => {
    let score = 0;
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

  const exportToExcel = () => {
    // Order: Name, Email, Designation, Exp, NEBOSH, ADOSH, L6, Nature of Exp
    const headers = ["Full Name", "Email", "Designation", "Exp (Yrs)", "NEBOSH", "ADOSH", "LEVEL 6", "Nature of Experience"];
    const rows = candidates.map(c => [
      c.fullName,
      c.email,
      c.designation,
      c.yearsOfExperience,
      c.hasNebosh ? "YES" : "NO",
      c.hasAdosh ? "YES" : "NO",
      c.hasLevel6 ? "YES" : "NO",
      c.natureOfExperienceFound.join(", ")
    ]);

    const csvContent = [headers, ...rows].map(e => e.map(val => `"${val}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `TGC_Recruitment_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadPdf = () => {
    // @ts-ignore
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape');
    
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text("TGC HSE Recruitment Matrix", 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);

    // Order: Name, Email, Designation, Exp, NEBOSH, ADOSH, L6, Nature of Exp
    const headers = [["Full Name", "Email", "Designation", "Exp", "NEBOSH", "ADOSH", "L6", "Nature of Exp"]];
    const data = candidates.map(c => [
      c.fullName,
      c.email,
      c.designation.replace('HSE/Safety ', ''),
      `${c.yearsOfExperience}Y`,
      c.hasNebosh ? "YES" : "NO",
      c.hasAdosh ? "YES" : "NO",
      c.hasLevel6 ? "YES" : "NO",
      c.natureOfExperienceFound.slice(0, 3).join(", ")
    ]);

    // @ts-ignore
    doc.autoTable({
      head: headers,
      body: data,
      startY: 35,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 45 },
        2: { cellWidth: 35 },
        3: { cellWidth: 15, halign: 'center' },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 20, halign: 'center' },
        6: { cellWidth: 20, halign: 'center' },
      }
    });

    doc.save(`TGC_Recruitment_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 py-4 px-6 lg:px-12 sticky top-0 z-50 print:hidden shadow-sm">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="bg-white p-1 rounded-xl shadow-md border border-slate-100">
              <img src={LOGO_URL} alt="TGC Logo" className="w-14 h-14 object-contain" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">TGC Recruitment</h1>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">HSE Verification Suite</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="group bg-indigo-600 hover:bg-indigo-700 text-white px-7 py-3 rounded-2xl font-bold cursor-pointer transition-all shadow-xl shadow-indigo-100 flex items-center gap-3 active:scale-95">
              <svg className="w-5 h-5 transition-transform group-hover:-translate-y-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload Multiple Resumes
              <input type="file" multiple accept=".pdf,.txt" className="hidden" onChange={handleFileUpload} disabled={isProcessing} />
            </label>
            <div className="w-[1px] h-8 bg-slate-200 mx-2"></div>
            <button onClick={exportToExcel} disabled={candidates.length === 0} className="p-3 rounded-2xl border border-slate-200 bg-white text-slate-600 hover:text-emerald-600 hover:border-emerald-200 transition-all disabled:opacity-30 flex items-center gap-2 font-bold text-xs px-4" title="Download Excel">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              EXCEL
            </button>
            <button onClick={downloadPdf} disabled={candidates.length === 0} className="p-3 rounded-2xl border border-slate-200 bg-white text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all disabled:opacity-30 flex items-center gap-2 font-bold text-xs px-4" title="Download PDF">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              PDF
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto p-6 lg:p-12 space-y-10 flex-grow w-full">
        {/* Progress Tracker */}
        {isProcessing && (
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl shadow-indigo-100 border border-indigo-50 relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
             <div className="absolute top-0 left-0 w-full h-1.5 bg-indigo-50">
               <div className="h-full bg-indigo-600 transition-all duration-500" style={{ width: `${uploadProgress}%` }}></div>
             </div>
             <div className="flex justify-between items-end">
               <div>
                 <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block mb-1">Batch Processing</span>
                 <h2 className="text-xl font-extrabold text-slate-900">Validating HSE Credentials...</h2>
               </div>
               <div className="text-4xl font-black text-indigo-600">{uploadProgress}%</div>
             </div>
          </div>
        )}

        {/* Quick Stats */}
        {!isProcessing && candidates.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard label="Total Candidates" value={candidates.length} color="text-slate-900" />
            <StatCard label="Qualified Roles" value={candidates.filter(c => c.designation !== 'Not Qualified').length} color="text-indigo-600" />
            <StatCard label="Primary Locations Verified" value={Array.from(new Set(candidates.flatMap(c => c.natureOfExperienceFound))).length} color="text-emerald-600" />
          </div>
        )}

        {/* Results Matrix Table */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left min-w-[1300px]">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">Full Name</th>
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">Email</th>
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">Designation</th>
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 text-center">Exp</th>
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 text-center">NEBOSH</th>
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 text-center">ADOSH</th>
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100 text-center">Level 6</th>
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-100">Nature of Exp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {candidates.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-44 text-center">
                       <div className="flex flex-col items-center gap-6 opacity-30 grayscale">
                         <img src={LOGO_URL} alt="TGC" className="w-24 h-24 mb-4" />
                         <p className="text-xl font-bold text-slate-400">Secure Recruitment Verification Portal</p>
                         <p className="text-slate-400 text-xs font-medium max-w-md mx-auto leading-relaxed uppercase tracking-wider">
                           Upload resumes to automatically screen and categorize candidates into<br/> 
                           Inspector (0-5Y), Officer (5-10Y), Engineer (10-15Y), and Manager (15Y+).
                         </p>
                       </div>
                    </td>
                  </tr>
                ) : (
                  candidates.map((candidate) => (
                    <tr key={candidate.id} className="hover:bg-indigo-50/20 transition-all duration-300">
                      <td className="p-6">
                        <span className="font-extrabold text-slate-900 text-sm">{candidate.fullName}</span>
                      </td>
                      <td className="p-6">
                        <div className="flex flex-col">
                          <span className="text-[11px] text-indigo-600 font-bold leading-tight">{candidate.email}</span>
                          <span className="text-[9px] text-slate-400 font-medium">{candidate.phone}</span>
                        </div>
                      </td>
                      <td className="p-6">
                        <DesignationBadge designation={candidate.designation} />
                      </td>
                      <td className="p-6 text-center">
                        <div className="inline-flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-white border border-slate-100 shadow-sm">
                          <span className="text-sm font-black text-slate-800">{candidate.yearsOfExperience}</span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Yrs</span>
                        </div>
                      </td>
                      <td className="p-6">
                        <StatusPill active={candidate.hasNebosh} />
                      </td>
                      <td className="p-6">
                        <StatusPill active={candidate.hasAdosh} />
                      </td>
                      <td className="p-6">
                        <StatusPill active={candidate.hasLevel6} />
                      </td>
                      <td className="p-6">
                        <div className="flex flex-wrap gap-1 max-w-[280px]">
                          {candidate.natureOfExperienceFound.map((n, i) => (
                            <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[9px] font-black uppercase tracking-tight border border-slate-200">
                              {n}
                            </span>
                          ))}
                          {candidate.natureOfExperienceFound.length === 0 && <span className="text-slate-300 italic text-[10px]">Generalist</span>}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend / Info Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 print:hidden">
          <div className="bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl text-white">
             <div className="flex items-center gap-4 mb-8">
               <div className="bg-indigo-500/20 p-3 rounded-2xl">
                 <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                 </svg>
               </div>
               <h4 className="text-lg font-black uppercase tracking-widest text-slate-300">Category Mappings</h4>
             </div>
             <div className="grid grid-cols-2 gap-8">
               <LegendItem label="HSE Inspector" val="0 - 5 Years" color="bg-amber-500" />
               <LegendItem label="HSE Officer" val="5 - 10 Years" color="bg-emerald-500" />
               <LegendItem label="HSE Engineer" val="10 - 15 Years" color="bg-blue-500" />
               <LegendItem label="HSE Manager" val="15+ Years" color="bg-purple-500" />
             </div>
          </div>

          <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-100 flex flex-col justify-center">
             <div className="flex items-center gap-4 mb-6">
               <img src={LOGO_URL} alt="TGC" className="w-12 h-12" />
               <h4 className="text-xl font-extrabold text-slate-800">Recruitment Guidelines</h4>
             </div>
             <p className="text-slate-500 font-medium leading-relaxed text-sm">
               Verified credentials required: <span className="text-slate-900 font-bold">NEBOSH, Level 6 (NVQ/OTHM/Diploma), and ADOSH/OSHAD</span>. 
               Candidates are mapped based on verified experience in <span className="text-slate-900 font-bold">Rail, Infrastructure, Bridges, and Building Construction</span> sectors to ensure technical alignment for all TGC projects.
             </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-8 px-6 lg:px-12 bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
             <img src={LOGO_URL} alt="TGC" className="w-8 h-8 grayscale opacity-50" />
             <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">© 2026 TGC HSE RECRUITMENT PORTAL</span>
          </div>
          <div className="text-slate-400 text-sm font-bold tracking-tight">
            Developed by <span className="text-indigo-600 font-black">@Elius</span> 2026
          </div>
        </div>
      </footer>
    </div>
  );
};

const DesignationBadge: React.FC<{ designation: HSEDesignation }> = ({ designation }) => {
  const getStyles = () => {
    switch(designation) {
      case 'HSE/Safety Manager': return 'bg-purple-600 text-white shadow-purple-100';
      case 'HSE/Safety Engineer': return 'bg-blue-600 text-white shadow-blue-100';
      case 'HSE/Safety Officer': return 'bg-emerald-600 text-white shadow-emerald-100';
      case 'HSE/Safety Inspector': return 'bg-amber-500 text-white shadow-amber-100';
      default: return 'bg-slate-400 text-white shadow-slate-100';
    }
  };
  return (
    <div className={`px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-[0.1em] shadow-lg inline-flex items-center gap-2 whitespace-nowrap ${getStyles()}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-white opacity-50"></span>
      {designation}
    </div>
  );
};

const StatusPill: React.FC<{ active: boolean }> = ({ active }) => (
  <div className="flex flex-col items-center justify-center">
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
      active ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50/30 text-rose-200 border border-rose-50'
    }`}>
      {active ? (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="w-5 h-5 opacity-40" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      )}
    </div>
    <span className={`text-[8px] font-black uppercase mt-1 tracking-widest ${active ? 'text-emerald-700' : 'text-slate-300'}`}>{active ? 'Yes' : 'No'}</span>
  </div>
);

const StatCard: React.FC<{ label: string; value: string | number; color: string }> = ({ label, value, color }) => (
  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">{label}</span>
    <div className={`text-3xl font-black ${color}`}>{value}</div>
  </div>
);

const LegendItem: React.FC<{ label: string; val: string; color: string }> = ({ label, val, color }) => (
  <div className="flex items-center gap-4">
    <div className={`w-2.5 h-10 rounded-full ${color}`}></div>
    <div>
      <h5 className="text-sm font-black text-white leading-tight tracking-tight">{label}</h5>
      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{val}</p>
    </div>
  </div>
);

export default App;

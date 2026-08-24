import React from 'react';
import { 
  Download, 
  Trophy, 
  Scroll, 
  FileBarChart2, 
  Award, 
  GraduationCap,
  CheckCircle2
} from 'lucide-react';
import SchoolReport from "/IIT_Foundation_Analysis_MH2662.pdf";
import BatchReport from "/Performance_Analysis_GRADE-10-A1.pdf";
import ExamResult from "/Exam_Results_examwise_GRADE-10_A1_PART_TEST_1_2026-08-03.pdf";
import ExamAnalysis from "/Exam_Analysis_examwise_GRADE-10_A1_PART_TEST_1_2026-08-03.pdf";
import ReportCard from "/ReportCard_Aadesh_Santosh_Jadhao_2026-08-21.pdf";
import TeacherReport from "/Teacher_Report_MH266201_2026-08-21.pdf";
import Certificate1  from "/Certificate_CV_PRANAV_Rank1.pdf";
import Certificate2  from "/Certificate_O_UDAY_KUMAR_REDDY_Rank2.pdf";

// --- Types Definition ---
type ItemCategory = 'report' | 'certificate';

interface AwardItem {
  id: number;
  title: string;
  description: string;
  category: ItemCategory;
  icon: React.ReactNode;
  fileName: string; // The name the file will have when saved
  filePath: string; // path relative to the /public folder
  accentColor: string; // Tailwind color class prefix (e.g., 'blue', 'purple')
}

const AwardsCabinet: React.FC = () => {

  // --- Configuration Data ---
  // IMPORTANT: Update 'filePath' to match where you put PDFs in your /public folder
  const awardData: AwardItem[] = [
    // ---- Reports Section ----
    {
      id: 1,
      title: "School Performance Report",
      description: "Overall analysis of IIT Foundation metrics across the institution.",
      category: 'report',
      icon: <FileBarChart2 size={28} />,
      fileName: "IIT_School_Performance_Report.pdf",
      filePath: SchoolReport, // Placeholder path
      accentColor: "blue"
    },
    {
      id: 2,
      title: "Batch-Wise Performance",
      description: "Detailed breakdown of statistics categorized by specific batches.",
      category: 'report',
      icon: <FileBarChart2 size={28} />,
      fileName: "IIT_Batch_Wise_Performance.pdf",
      filePath: BatchReport, // Placeholder path
      accentColor: "blue"
    },
    {
      id: 3,
      title: "Exam Result Report",
      description: "Your official scores and standing from the latest examination.",
      category: 'report',
      icon: <CheckCircle2 size={28} />,
      fileName: "My_Exam_Result.pdf",
      filePath: ExamResult,
      accentColor: "green"
    },
    {
      id: 4,
      title: "Exam Analysis Report",
      description: "In-depth look at strengths and areas for improvement based on results.",
      category: 'report',
      icon: <FileBarChart2 size={28} />,
      fileName: "Exam_Analysis_Report.pdf",
      filePath: ExamAnalysis,
      accentColor: "indigo"
    },
    {
      id: 5,
      title: "Report Card",
      description: "A comprehensive summary of academic progress this term.",
      category: 'report',
      icon: <GraduationCap size={28} />,
      fileName: "Foundation_Report_Card.pdf",
      filePath: ReportCard,
      accentColor: "purple"
    },
    {
      id: 6,
      title: "Teacher Report ",
      description: "Personalized feedback and observations from your instructors.",
      category: 'report',
      icon: <FileBarChart2 size={28} />,
      fileName: "Teacher_Feedback_Report.pdf",
      filePath: TeacherReport,
      accentColor: "teal"
    },
    // ---- Certificates Section ----
    // Note: Renamed titles slightly to sound more impressive in the UI
    {
      id: 7,
      title: "Certificate of Excellence Rank1",
      description: "Official recognition of outstanding performance in the IIT Foundation program.",
      category: 'certificate',
      icon: <Award size={32} />,
      fileName: "Certificate_Excellence1.pdf",
      filePath: Certificate1,
      accentColor: "amber"
    },
    {
      id: 8,
      title: "Certificate of Excellence Rank2",
      description: "Official recognition of outstanding performance in the IIT Foundation program.",
      category: 'certificate',
      icon: <Award size={32} />,
      fileName: "Certificate_Excellence2.pdf",
      filePath: Certificate2,
      accentColor: "amber"
    },
  ];

  // --- Download Handler ---
  const handleDownload = (item: AwardItem) => {
    try {
      const link = document.createElement('a');
      link.href = item.filePath;
      // The 'download' attribute suggests the filename to save as
      link.download = item.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Download failed:", error);
      alert("Sorry, the document could not be downloaded at this time.");
    }
  };

  const reports = awardData.filter(item => item.category === 'report');
  const certificates = awardData.filter(item => item.category === 'certificate');

  return (
    <div className="w-full max-w-6xl mx-auto pb-12  max-h-[95vh] overflow-y-auto overflow-x-hidden">
      <div className="max-w-7xl mx-auto">
        
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-8 md:p-12 mb-12 shadow-xl text-white">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">
                Your Achievement Cabinet
              </h1>
              <p className="text-lg text-indigo-100 max-w-2xl">
                Access your official performance data, track your progress, and collect your well-earned certifications. Keep pushing the boundaries!
              </p>
            </div>
             {/* Big decorative icon */}
            <div className="hidden md:block bg-white/20 p-6 rounded-full backdrop-blur-sm text-yellow-300 shadow-inner">
              <Trophy size={80} strokeWidth={1.5} />
            </div>
          </div>
          {/* Decorative background circles */}
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-purple-500/30 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-60 h-60 bg-indigo-500/30 rounded-full blur-3xl"></div>
        </div>

        {/* Section: Performance Reports */}
        <SectionHeader title="Performance Insights & Reports" icon={<FileBarChart2 className="text-indigo-600"/>} />
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {reports.map((item) => (
            <AwardCard key={item.id} item={item} onDownload={handleDownload} />
          ))}
        </div>

        {/* Section: Certificates */}
        <SectionHeader title="Hall of Fame: Certificates" icon={<Award className="text-amber-500"/>} />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {certificates.map((item) => (
            <CertificateCard key={item.id} item={item} onDownload={handleDownload} />
          ))}
        </div>
        
        <div className="mt-12 text-center text-gray-400 text-sm">
          Ensure you have a PDF viewer installed to open these documents.
        </div>
      </div>
    </div>
  );
};

// --- Sub-components for styling ---

// Simple Section Header
const SectionHeader: React.FC<{title: string, icon: React.ReactNode}> = ({title, icon}) => (
  <div className="flex items-center gap-3 mb-6 pl-2">
    <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100">{icon}</div>
    <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
  </div>
);

// Design 1: Standard Report Card
const AwardCard: React.FC<{ item: AwardItem; onDownload: (item: AwardItem) => void }> = ({ item, onDownload }) => {
  // Dynamically generate Tailwind color classes based on the 'accentColor' prop
  const bgLight = `bg-${item.accentColor}-50`;
  const textColor = `text-${item.accentColor}-600`;
  const borderColor = `hover:border-${item.accentColor}-300`;
  const buttonBg = `bg-${item.accentColor}-600`;
  const buttonHover = `hover:bg-${item.accentColor}-700`;
  const ringFocus = `focus:ring-${item.accentColor}-500`;

  return (
    <div 
      className={`group bg-white rounded-2xl border border-gray-200 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${borderColor} flex flex-col justify-between`}
    >
      <div>
        <div className={`inline-flex p-3 rounded-xl ${bgLight} ${textColor} mb-4 group-hover:scale-110 transition-transform`}>
          {item.icon}
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
        <p className="text-gray-500 text-sm mb-6 leading-relaxed">{item.description}</p>
      </div>
      
      <button
        onClick={() => onDownload(item)}
        className={`w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-semibold text-sm transition-colors ${buttonBg} ${buttonHover} focus:outline-none focus:ring-2 focus:ring-offset-2 ${ringFocus}`}
      >
        <span>Download PDF</span>
        <Download size={18} />
      </button>
    </div>
  );
};

// Design 2: Premium Certificate Card (Wide format)
const CertificateCard: React.FC<{ item: AwardItem; onDownload: (item: AwardItem) => void }> = ({ item, onDownload }) => {
   return (
    <div className="group relative bg-white rounded-2xl overflow-hidden border border-amber-100 shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      {/* decorative background bar */}
      <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-amber-300 to-amber-500"></div>
      
      <div className="p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-6 pl-8">
        <div className="p-4 bg-gradient-to-br from-amber-100 to-yellow-50 text-amber-600 rounded-full border-4 border-white shadow-md group-hover:rotate-12 transition-transform">
          {item.icon}
        </div>
        
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">{item.title}</h3>
          <p className="text-gray-600 mb-6">{item.description}</p>
          
           <button
              onClick={() => onDownload(item)}
              className="inline-flex items-center gap-2 py-2.5 px-6 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-bold text-sm shadow-sm hover:shadow-md transition-all hover:from-amber-600 hover:to-yellow-600"
            >
              <Download size={18} />
              Claim Certificate
            </button>
        </div>
      </div>
    </div>
   )
}


export default AwardsCabinet;

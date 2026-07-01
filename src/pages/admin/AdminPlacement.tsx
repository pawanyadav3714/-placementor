import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';

export const companiesData = [
  {
    name: 'Google',
    logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQPcRbaJvhBgd0YgBp_8nLiSylsEjA-79JncguHiPaRBw&s',
    description: "Prepare for Google's coding rounds, system design, and more.",
    tags: ['DSA', 'System Design', 'HR'],
    mockInterviews: '120+',
  },
  {
    name: 'Amazon',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Amazon_icon.svg',
    description: "Master Amazon's leadership principles, DSA, and LP based rounds.",
    tags: ['DSA', 'System Design', 'LP'],
    mockInterviews: '150+',
  },
  {
    name: 'Adobe',
    logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSYwgbLPGIauG3Gjph_EERza0f_cxIB0K3hZCw9AKGeOA&s=10',
    description: "Practice Adobe's technical, behavioral and case-based rounds.",
    tags: ['DSA', 'Behavioral', 'Case'],
    mockInterviews: '80+',
  },
  {
    name: 'Apple',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg',
    description: "Prepare for Apple's unique interview process and technical depth.",
    tags: ['DSA', 'System Design', 'HR'],
    mockInterviews: '100+',
    darkLogo: true,
  },
  {
    name: 'Dell',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/4/48/Dell_Logo.svg',
    description: "Prepare for Dell's technical, coding and communication rounds.",
    tags: ['DSA', 'Coding', 'HR'],
    mockInterviews: '70+',
  },
  {
    name: 'Facebook',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Facebook_Logo_%282019%29.png',
    description: "Practice Facebook's coding interviews, system design & more.",
    tags: ['DSA', 'System Design', 'Behavioral'],
    mockInterviews: '110+',
  },
  {
    name: 'Flipkart',
    logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSPmTPqlHJAqy2bZ17t_YF1pc9pBmqt_2z7L-AfLRBmoA&s=10',
    description: "Prepare for Flipkart's technical, product and HR interviews.",
    tags: ['DSA', 'Product', 'HR'],
    mockInterviews: '90+',
  },
  {
    name: 'LinkedIn',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png',
    description: "Master LinkedIn's coding, system design and behavioral rounds.",
    tags: ['DSA', 'System Design', 'HR'],
    mockInterviews: '80+',
  },
  {
    name: 'Microsoft',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg',
    description: "Practice Microsoft's technical, behavioral and system design.",
    tags: ['DSA', 'System Design', 'HR'],
    mockInterviews: '150+',
  },
  {
    name: 'Myntra',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/b/bc/Myntra_Logo.png',
    description: "Prepare for Myntra's engineering, product and HR interviews.",
    tags: ['DSA', 'Product', 'HR'],
    mockInterviews: '60+',
  },
  {
    name: 'Paytm',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/2/24/Paytm_Logo_%28standalone%29.svg',
    description: "Practice Paytm's coding, system and behavioral interview rounds.",
    tags: ['DSA', 'System Design', 'HR'],
    mockInterviews: '70+',
  },
  {
    name: 'Samsung',
    logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT8B1TcHuGgrDXF8o__I_LqtKyJXIHAANU9gK3x9qtHyg&s=10',
    description: "Prepare for Samsung's technical, coding and problem solving rounds.",
    tags: ['DSA', 'Coding', 'HR'],
    mockInterviews: '90+',
  },
  {
    name: 'Snapdeal',
    logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQwVvHfMml4xQwBWWgIQ332YKaSTO3EpKmOVa_vlhLHmQ&s=10',
    description: "Practice Snapdeal's technical, analytical and HR rounds.",
    tags: ['DSA', 'Analytical', 'HR'],
    mockInterviews: '50+',
  },
  {
    name: 'Twitter',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Logo_of_Twitter.svg',
    description: "Prepare for Twitter's coding, system design and behavioral rounds.",
    tags: ['DSA', 'System Design', 'HR'],
    mockInterviews: '90+',
  },
  {
    name: 'Uber',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/c/cc/Uber_logo_2018.png',
    description: "Master Uber's coding, system design and behavioral interviews.",
    tags: ['DSA', 'System Design', 'HR'],
    mockInterviews: '100+',
    darkLogo: true,
  },
  {
    name: 'Yahoo',
    logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRqDnAJDlqXBDD0wkDGQovUub7berukS908GrbSC14uJA&s=10',
    description: "Prepare for Yahoo's technical, coding and HR interview rounds.",
    tags: ['DSA', 'Coding', 'HR'],
    mockInterviews: '60+',
  }
];

export default function AdminPlacement() {
  const navigate = useNavigate();

  return (
    <AppLayout activeTab="admin-placement">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-8 pb-20">
        <div className="bg-[#0d1326] -mx-4 md:-mx-8 -mt-4 md:-mt-8 p-5 md:p-8 border-b border-white/5 mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold text-white mb-2 md:mb-3">Companies</h1>
          <p className="text-xs md:text-lg text-gray-400 max-w-3xl leading-relaxed">
            Manage company-specific interview materials, parse PDFs/Images using AI and provide content to students.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {companiesData.map((company, index) => (
            <motion.div
              key={company.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-[#151B2B] border border-white/5 hover:border-indigo-500/30 rounded-xl md:rounded-2xl p-4 md:p-6 transition-all duration-300 group hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.4)] hover:shadow-indigo-500/10 flex flex-col cursor-pointer"
              onClick={() => navigate(`/admin/placement/${company.name.toLowerCase()}`)}
            >
              <div className="flex gap-3 md:gap-4 mb-3 md:mb-4">
                <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center shrink-0 bg-white ${company.darkLogo ? 'p-1.5 md:p-2' : 'p-2 md:p-3'} shadow-inner`}>
                  <img src={company.logo} alt={company.name} className="w-full h-full object-contain" />
                </div>
                <div>
                  <h3 className="text-base md:text-xl font-bold text-white mb-0.5 md:mb-1 group-hover:text-indigo-400 transition-colors">{company.name}</h3>
                  <div className="flex items-center gap-1 md:gap-1.5 text-[10px] md:text-xs text-gray-400">
                     <Briefcase className="w-3 h-3 md:w-3 md:h-3" /> Content Admin
                  </div>
                </div>
              </div>

              <div className="mt-auto">
                <div className="grid grid-cols-2 gap-2 text-xs md:text-sm text-gray-400 mb-3 md:mb-4 px-1">
                  <div>
                    <span className="font-bold text-white">450+</span><br/>DSA Probs
                  </div>
                  <div>
                    <span className="font-bold text-white">{company.mockInterviews}</span><br/>Interviews
                  </div>
                </div>
                
                <button className="w-full py-2 px-3 md:py-3 md:px-4 text-xs md:text-sm bg-[#2563EB]/10 hover:bg-[#2563EB] text-[#3B82F6] hover:text-white border border-[#3B82F6]/30 hover:border-[#2563EB] rounded-lg md:rounded-xl font-semibold flex items-center justify-center gap-1.5 md:gap-2 transition-all duration-300 cursor-pointer">
                  Manage Content
                  <ArrowRight className="w-3 h-3 md:w-4 md:h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

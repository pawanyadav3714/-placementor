import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/AppLayout';
import { motion } from 'framer-motion';
import { ExternalLink, ArrowRight, Briefcase, Code, Brain } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';

export const companiesList = [
  {
    name: 'Google',
    logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQPcRbaJvhBgd0YgBp_8nLiSylsEjA-79JncguHiPaRBw&s',
    description: "Prepare for Google's coding rounds, system design, and more.",
    tags: ['DSA', 'System Design', 'HR'],
  },
  {
    name: 'Amazon',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Amazon_icon.svg',
    description: "Master Amazon's leadership principles, DSA, and LP based rounds.",
    tags: ['DSA', 'System Design', 'LP'],
  },
  {
    name: 'Adobe',
    logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSYwgbLPGIauG3Gjph_EERza0f_cxIB0K3hZCw9AKGeOA&s=10',
    description: "Practice Adobe's technical, behavioral and case-based rounds.",
    tags: ['DSA', 'Behavioral', 'Case'],
  },
  {
    name: 'Apple',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg',
    description: "Prepare for Apple's unique interview process and technical depth.",
    tags: ['DSA', 'System Design', 'HR'],
    darkLogo: true,
  },
  {
    name: 'Dell',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/4/48/Dell_Logo.svg',
    description: "Prepare for Dell's technical, coding and communication rounds.",
    tags: ['DSA', 'Coding', 'HR'],
  },
  {
    name: 'Facebook',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Facebook_Logo_%282019%29.png',
    description: "Practice Facebook's coding interviews, system design & more.",
    tags: ['DSA', 'System Design', 'Behavioral'],
  },
  {
    name: 'Flipkart',
    logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSPmTPqlHJAqy2bZ17t_YF1pc9pBmqt_2z7L-AfLRBmoA&s=10',
    description: "Prepare for Flipkart's technical, product and HR interviews.",
    tags: ['DSA', 'Product', 'HR'],
  },
  {
    name: 'LinkedIn',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png',
    description: "Master LinkedIn's coding, system design and behavioral rounds.",
    tags: ['DSA', 'System Design', 'HR'],
  },
  {
    name: 'Microsoft',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg',
    description: "Practice Microsoft's technical, behavioral and system design.",
    tags: ['DSA', 'System Design', 'HR'],
  },
  {
    name: 'Myntra',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/b/bc/Myntra_Logo.png',
    description: "Prepare for Myntra's engineering, product and HR interviews.",
    tags: ['DSA', 'Product', 'HR'],
  },
  {
    name: 'Paytm',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/2/24/Paytm_Logo_%28standalone%29.svg',
    description: "Practice Paytm's coding, system and behavioral interview rounds.",
    tags: ['DSA', 'System Design', 'HR'],
  },
  {
    name: 'Samsung',
    logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT8B1TcHuGgrDXF8o__I_LqtKyJXIHAANU9gK3x9qtHyg&s=10',
    description: "Prepare for Samsung's technical, coding and problem solving rounds.",
    tags: ['DSA', 'Coding', 'HR'],
  },
  {
    name: 'Snapdeal',
    logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQwVvHfMml4xQwBWWgIQ332YKaSTO3EpKmOVa_vlhLHmQ&s=10',
    description: "Practice Snapdeal's technical, analytical and HR rounds.",
    tags: ['DSA', 'Analytical', 'HR'],
  },
  {
    name: 'Twitter',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Logo_of_Twitter.svg',
    description: "Prepare for Twitter's coding, system design and behavioral rounds.",
    tags: ['DSA', 'System Design', 'HR'],
  },
  {
    name: 'Uber',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/c/cc/Uber_logo_2018.png',
    description: "Master Uber's coding, system design and behavioral interviews.",
    tags: ['DSA', 'System Design', 'HR'],
    darkLogo: true,
  },
  {
    name: 'Yahoo',
    logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRqDnAJDlqXBDD0wkDGQovUub7berukS908GrbSC14uJA&s=10',
    description: "Prepare for Yahoo's technical, coding and HR interview rounds.",
    tags: ['DSA', 'Coding', 'HR'],
  }
];

export default function CompanyPrep() {
  const navigate = useNavigate();
  const [counts, setCounts] = useState<Record<string, { dsa: number, aptitude: number }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      setLoading(true);
      const newCounts: Record<string, { dsa: number, aptitude: number }> = {};
      
      try {
        // Fetch all company_prep docs to get DSA counts
        const companyPrepSnap = await getDocs(collection(db, 'company_prep'));
        companyPrepSnap.forEach(doc => {
          const data = doc.data();
          const companyName = doc.id.toLowerCase();
          newCounts[companyName] = {
            ...newCounts[companyName],
            dsa: (data.dsa || []).length
          };
        });

        // Fetch all aptitude questions to get counts per company
        const aptSnap = await getDocs(collection(db, 'technical_aptitude'));
        let globalAptCount = 0;
        const companySpecificAptCounts: Record<string, number> = {};

        aptSnap.forEach(doc => {
          const data = doc.data();
          if (data.global === true) {
            globalAptCount++;
          } else {
            const companyName = data.company;
            if (companyName && companyName !== 'General Practice') {
              const lowerName = companyName.toLowerCase();
              companySpecificAptCounts[lowerName] = (companySpecificAptCounts[lowerName] || 0) + 1;
            }
          }
        });

        // Combine counts
        companiesList.forEach(c => {
          const lowerName = c.name.toLowerCase();
          if (!newCounts[lowerName]) newCounts[lowerName] = { dsa: 0, aptitude: 0 };
          newCounts[lowerName].aptitude = globalAptCount + (companySpecificAptCounts[lowerName] || 0);
        });

        setCounts(newCounts);
      } catch (err) {
        console.error("Error fetching company counts:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCounts();
  }, []);

  return (
    <AppLayout activeTab="companies">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-white mb-1.5 md:mb-2">Company-wise Placement Preparation</h1>
          <p className="text-[10px] md:text-sm text-gray-400 max-w-3xl leading-relaxed">
            Master company-specific interview patterns with real-world DSA and Technical Aptitude questions curated from actual interview experiences.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {companiesList.map((company, index) => {
            const companyCounts = counts[company.name.toLowerCase()] || { dsa: 0, aptitude: 0 };
            return (
              <motion.div
                key={company.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-[#151B2B] border border-white/5 hover:border-indigo-500/30 rounded-xl md:rounded-2xl p-4 md:p-6 transition-all duration-300 group hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.4)] hover:shadow-indigo-500/10 flex flex-col h-full"
              >
                <div className="flex gap-3 md:gap-4 mb-3 md:mb-4">
                  <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center shrink-0 bg-white ${company.darkLogo ? 'p-1.5 md:p-2' : 'p-2 md:p-3'} shadow-inner`}>
                    <img src={company.logo} alt={company.name} className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <h3 className="text-base md:text-xl font-bold text-white mb-0.5 md:mb-1 group-hover:text-indigo-400 transition-colors">{company.name}</h3>
                    <p className="text-[10px] md:text-xs text-gray-400 leading-snug line-clamp-3">{company.description}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 md:gap-2 mb-4 md:mb-6">
                  {company.tags.map(tag => (
                    <span key={tag} className="text-[9px] md:text-[10px] font-medium px-2 py-0.5 md:px-2.5 md:py-1 rounded md:rounded-md bg-[#1F2937] text-gray-300 border border-white/5">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="mt-auto space-y-2 mb-4">
                  <div className="flex items-center justify-between text-[10px] md:text-xs text-gray-400 px-1">
                    <div className="flex items-center gap-1.5">
                      <Code className="w-3 h-3 text-indigo-400" />
                      <span>DSA & Dev Questions</span>
                    </div>
                    <span className="font-bold text-white bg-white/5 px-1.5 py-0.5 rounded">{companyCounts.dsa}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] md:text-xs text-gray-400 px-1">
                    <div className="flex items-center gap-1.5">
                      <Brain className="w-3 h-3 text-emerald-400" />
                      <span>Technical Aptitude</span>
                    </div>
                    <span className="font-bold text-white bg-white/5 px-1.5 py-0.5 rounded">{companyCounts.aptitude}</span>
                  </div>
                </div>
                
                <button 
                  onClick={() => navigate(`/companies/${company.name.toLowerCase()}`)}
                  className="w-full py-2 px-3 md:py-3 md:px-4 text-xs md:text-sm bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-600/30 hover:border-indigo-600 rounded-lg md:rounded-xl font-semibold flex items-center justify-center gap-1.5 md:gap-2 transition-all duration-300 cursor-pointer"
                >
                  Start Practice
                  <ArrowRight className="w-3 h-3 md:w-4 md:h-4" />
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}

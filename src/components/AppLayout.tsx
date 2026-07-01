import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { UserAvatar } from "./UserAvatar";
import {
  Home,
  ClipboardList,
  Code,
  FileText,
  Mic,
  Menu,
  Briefcase,
  Compass,
  Sparkles,
} from "lucide-react";
import clsx from "clsx";
import { ReactNode, useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";

export default function AppLayout({
  children,
  activeTab,
}: {
  children: ReactNode;
  activeTab: string;
}) {
  const { profile } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [testAlertState, setTestAlertState] = useState<
    "none" | "upcoming" | "live"
  >("none");
  const [releasedTests, setReleasedTests] = useState<any[]>([]);

  const isDemoAdmin = localStorage.getItem("demo_admin_bypass") === "true";
  const role = isDemoAdmin ? "admin" : profile?.role || "student";

  useEffect(() => {
    if (role !== "student") return;
    const q = query(
      collection(db, "released_tests"),
      where("active", "==", true),
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReleasedTests(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      );
    });
    return () => unsubscribe();
  }, [role]);

  useEffect(() => {
    if (role !== "student" || releasedTests.length === 0) {
      setTestAlertState("none");
      return;
    }

    const checkTestStatus = () => {
      const now = new Date();
      let hasLive = false;
      let hasUpcoming = false;

      for (const test of releasedTests) {
        if (test.assignDate && test.assignTime) {
          const assignDateTime = new Date(
            `${test.assignDate}T${test.assignTime}`,
          );
          const endTime = new Date(
            assignDateTime.getTime() + (test.duration || 60) * 60000,
          );

          if (now >= assignDateTime && now <= endTime) {
            hasLive = true;
            break;
          } else if (now < assignDateTime) {
            hasUpcoming = true;
          }
        } else {
          // If a test is assigned 'Anytime' and is active, maybe consider it live?
          // The prompt says "upcoming test assigned, and at the time of test running".
          // If no specific time, we can just call it live or upcoming depending on preference.
          // Let's call it upcoming so it shows red, and when they start it they are in the workspace.
          hasUpcoming = true;
        }
      }

      if (hasLive) {
        setTestAlertState("live");
      } else if (hasUpcoming) {
        setTestAlertState("upcoming");
      } else {
        setTestAlertState("none");
      }
    };

    checkTestStatus();
    const interval = setInterval(checkTestStatus, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [releasedTests, role]);

  const navItems =
    role === "admin"
      ? [
          {
            name: "Admin Dashboard",
            shortName: "Admin",
            path: "/dashboard/admin",
            icon: Home,
            value: "admin-dashboard",
          },
          {
            name: "Question Banks",
            shortName: "Questions",
            path: "/admin/questions",
            icon: ClipboardList,
            value: "admin-questions",
          },
          {
            name: "Companies",
            shortName: "Companies",
            path: "/admin/placement",
            icon: Briefcase,
            value: "admin-placement",
          },
          {
            name: "Test Papers",
            shortName: "Tests",
            path: "/admin/tests",
            icon: FileText,
            value: "admin-tests",
          },
        ]
      : [
          {
            name: "Dashboard",
            shortName: "Dashboard",
            path: "/dashboard/student",
            icon: Home,
            value: "dashboard",
          },
          {
            name: "Companies",
            shortName: "Companies",
            path: "/companies",
            icon: Briefcase,
            value: "companies",
          },
          {
            name: "LeetCode",
            shortName: "Code",
            path: "/code/two-sum",
            icon: Code,
            value: "code",
          },
          {
            name: "Tests",
            shortName: "Tests",
            path: "/tests",
            icon: ClipboardList,
            value: "tests",
            alertState: testAlertState,
          },
          {
            name: "Resume",
            shortName: "Resume",
            path: "/resume",
            icon: FileText,
            value: "resume",
          },
          {
            name: "Roadmaps",
            shortName: "Roadmaps",
            path: "/roadmaps",
            icon: Compass,
            value: "roadmaps",
          },
          {
            name: "Interview with AI Models",
            shortName: "AI Interview",
            path: "/interview/session",
            icon: Sparkles,
            value: "interview",
          },
        ];

  return (
    <div className="min-h-screen bg-[#0A0F1E] flex text-gray-100 font-sans">
      {/* Sidebar Desktop */}
      <aside
        className={clsx(
          "border-r border-white/10 hidden md:flex flex-col bg-[#111827]/80 backdrop-blur-xl transition-all duration-300",
          isCollapsed ? "w-[80px]" : "w-64",
        )}
      >
        <div
          className={clsx(
            "p-6 flex items-center",
            isCollapsed ? "justify-center" : "justify-between",
          )}
        >
          {!isCollapsed && (
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-500 to-cyan-400 bg-clip-text text-transparent truncate flex-1">
              Placements
            </h1>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Menu className="w-7 h-7 cursor-pointer" />
          </button>
        </div>
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {navItems.map((item: any) => (
            <Link
              key={item.value}
              to={item.path}
              title={isCollapsed ? item.name : undefined}
              className={clsx(
                "relative flex items-center gap-3 py-3 rounded-xl transition-all duration-200",
                activeTab === item.value
                  ? "bg-indigo-500/20 text-indigo-400 font-medium"
                  : "text-gray-400 hover:text-white hover:bg-white/5",
                isCollapsed ? "justify-center px-0" : "px-4",
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && (
                <span className="truncate flex-1">{item.name}</span>
              )}

              {item.alertState && item.alertState !== "none" && (
                <span
                  className={clsx(
                    "absolute top-3 flex h-3 w-3",
                    isCollapsed ? "right-2" : "right-4",
                  )}
                >
                  <span
                    className={clsx(
                      "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                      item.alertState === "live"
                        ? "bg-green-400"
                        : "bg-red-400",
                    )}
                  ></span>
                  <span
                    className={clsx(
                      "relative inline-flex rounded-full h-3 w-3",
                      item.alertState === "live"
                        ? "bg-green-500"
                        : "bg-red-500",
                    )}
                  ></span>
                </span>
              )}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-[#111827] border-t border-white/10 flex items-center justify-around px-1 z-50">
        {navItems.map((item) => (
          <Link
            key={item.value}
            to={item.path}
            className={clsx(
              "flex flex-col items-center justify-center gap-1 p-1 w-full text-center",
              activeTab === item.value ? "text-indigo-400" : "text-gray-500",
            )}
          >
            <item.icon className="w-4 h-4" />
            <span className="text-[10px] leading-tight font-medium">
              {item.shortName}
            </span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

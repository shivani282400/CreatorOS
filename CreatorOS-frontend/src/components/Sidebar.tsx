import {
    LayoutDashboard,
    Wand2,
    Library,
    Calendar,
    Settings,
    BarChart3,
    Rocket,
    Cpu
  } from "lucide-react"
  
  import { NavLink } from "react-router-dom"
  
export default function Sidebar() {

  const navClass =
      "flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-gray-300 hover:bg-white/[0.05] hover:text-white transition-all duration-200"

  const activeClass =
      "bg-white/[0.08] text-white"
  
    return (
  
      <div className="w-72 border-r border-white/5 bg-[var(--bg-secondary)]/90 p-6 backdrop-blur-xl">
  
        {/* Logo */}
  
        <div className="mb-10">
  
          <h1 className="text-2xl font-semibold tracking-tight">
            CreatorOS
          </h1>

          <p className="mt-1 text-xs uppercase tracking-[0.24em] text-gray-500">
            AI Creator System
          </p>
  
        </div>
  
        {/* Main Navigation */}
  
        <div className="space-y-2">
  
          <NavLink
            to="/dashboard"
            className={({isActive}) =>
              `${navClass} ${isActive ? activeClass : ""}`
            }
          >
            <LayoutDashboard size={18}/>
            Dashboard
          </NavLink>
  
          <NavLink
            to="/generate"
            className={({isActive}) =>
              `${navClass} ${isActive ? activeClass : ""}`
            }
          >
            <Wand2 size={18}/>
            Generate
          </NavLink>
  
          <NavLink
            to="/library"
            className={({isActive}) =>
              `${navClass} ${isActive ? activeClass : ""}`
            }
          >
            <Library size={18}/>
            Library
          </NavLink>
  
          <NavLink
            to="/calendar"
            className={({isActive}) =>
              `${navClass} ${isActive ? activeClass : ""}`
            }
          >
            <Calendar size={18}/>
            Calendar
          </NavLink>
  
          <NavLink
            to="/settings"
            className={({isActive}) =>
              `${navClass} ${isActive ? activeClass : ""}`
            }
          >
            <Settings size={18}/>
            Settings
          </NavLink>
  
        </div>
  
        {/* Future Modules */}
  
        <div className="mt-10">
  
          <p className="mb-3 text-xs uppercase tracking-[0.24em] text-gray-500">
            Future Modules
          </p>

          <div className="space-y-3 text-sm text-gray-500">

            <div className="flex items-center gap-3 rounded-[10px] px-3 py-2">
              <Rocket size={16}/>
              Strategy
            </div>

            <div className="flex items-center gap-3 rounded-[10px] px-3 py-2">
              <BarChart3 size={16}/>
              Performance
            </div>

            <div className="flex items-center gap-3 rounded-[10px] px-3 py-2">
              <Cpu size={16}/>
              Automation
            </div>
  
          </div>
  
        </div>
  
        {/* Bottom Button */}
  
        <div className="mt-auto">
  
          <NavLink
            to="/generate"
            className="block text-center btn-primary transition-all duration-200 hover:scale-[1.02] active:scale-95"
          >
            + Create Content
          </NavLink>
  
        </div>
  
      </div>
  
    )
  
  }

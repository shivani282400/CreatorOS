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
      "flex items-center gap-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-[#1D212B] hover:text-white transition"
  
    const activeClass =
      "bg-[#1D212B] text-white"
  
    return (
  
      <div className="w-64 glass-panel p-6 flex flex-col border-r border-gray-800">
  
        {/* Logo */}
  
        <div className="mb-10">
  
          <h1 className="text-xl font-bold tracking-wide">
            CreatorOS
          </h1>
  
          <p className="text-xs text-gray-400">
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
  
          <p className="text-xs text-gray-500 mb-3 uppercase tracking-wide">
            Future Modules
          </p>
  
          <div className="space-y-2 text-gray-500 text-sm">
  
            <div className="flex items-center gap-3">
              <Rocket size={16}/>
              Strategy
            </div>
  
            <div className="flex items-center gap-3">
              <BarChart3 size={16}/>
              Performance
            </div>
  
            <div className="flex items-center gap-3">
              <Cpu size={16}/>
              Automation
            </div>
  
          </div>
  
        </div>
  
        {/* Bottom Button */}
  
        <div className="mt-auto">
  
          <NavLink
            to="/generate"
            className="block text-center btn-primary"
          >
            + Create Content
          </NavLink>
  
        </div>
  
      </div>
  
    )
  
  }
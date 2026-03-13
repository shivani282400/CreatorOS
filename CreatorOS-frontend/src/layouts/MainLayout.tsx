import Sidebar from "../components/Sidebar"
import AIPanel from "../components/AIPanel"
import Topbar from "../components/Topbar"

export default function MainLayout({ children }: any) {

  return (

    <div className="flex h-screen bg-[#0E0F13] text-white">

      <Sidebar />

      <div className="flex flex-col flex-1">

        <Topbar />

        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>

      </div>

      <AIPanel />

    </div>

  )

}
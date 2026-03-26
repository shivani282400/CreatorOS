import Sidebar from "../components/Sidebar"

export default function MainLayout({ children }: any) {

  return (

    <div className="flex min-h-screen bg-[var(--bg-primary)] text-white">

      <Sidebar />

      <div className="flex flex-col flex-1">
        <main className="flex-1 overflow-y-auto px-6 py-8 lg:px-10 xl:px-12">
          {children}
        </main>

      </div>

    </div>

  )

}

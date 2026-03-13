import { BrowserRouter, Routes, Route } from "react-router-dom"

import Dashboard from "./pages/Dashboard"
import Generate from "./pages/Generate"
import Onboarding from "./pages/Onboarding"
import Library from "./pages/Library"
import Calendar from "./pages/Calendar"
import Login from "./pages/Login"
function App() {

  return (
    <BrowserRouter>

<Routes>

<Route path="/" element={<Login />} />
<Route path="/onboarding" element={<Onboarding />} />
<Route path="/dashboard" element={<Dashboard />} />
<Route path="/generate" element={<Generate />} />
<Route path="/library" element={<Library />} />
<Route path="/calendar" element={<Calendar />} />

</Routes>

    </BrowserRouter>
  )

}

export default App
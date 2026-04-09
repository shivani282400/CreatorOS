import { BrowserRouter, Routes, Route } from "react-router-dom"

import Dashboard from "./pages/Dashboard"
import Generate from "./pages/Generate"
import Onboarding from "./pages/Onboarding"
import Library from "./pages/Library"
import Calendar from "./pages/Calendar"
import Uploaded from "./pages/Uploaded"
import Login from "./pages/Login"
import Profile from "./pages/Profile"
function App() {

  return (
    <BrowserRouter>

<Routes>

<Route path="/" element={<Login />} />
<Route path="/login" element={<Login />} />
<Route path="/onboarding" element={<Onboarding />} />
<Route path="/dashboard" element={<Dashboard />} />
<Route path="/generate" element={<Generate />} />
<Route path="/library" element={<Library />} />
<Route path="/library/:id" element={<Library />} />
<Route path="/calendar" element={<Calendar />} />
<Route path="/uploaded" element={<Uploaded />} />
<Route path="/settings" element={<Profile />} />
<Route path="/profile" element={<Profile />} />

</Routes>

    </BrowserRouter>
  )

}

export default App

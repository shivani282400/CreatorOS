import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "./index.css"
import { Toaster } from "sonner"

import { ContentProvider } from "./store/contentStore"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
  <ContentProvider>
  <App />
  <Toaster richColors position="top-right" />
</ContentProvider>
  </React.StrictMode>
)
import { useState } from 'react'
import Header from './components/Header'
import MainContent from './components/MainContent'
import { Sidebar } from './components/Sidebar'
import './App.css'

function App() {
  const [sidebarVisible, setSidebarVisible] = useState(true)

  return (
    <div className="app-layout">
      <Sidebar visible={sidebarVisible} />
      <div className="app-content">
        <Header onMenuToggle={() => setSidebarVisible((visible) => !visible)} />
        <MainContent />
      </div>
    </div>
  )
}

export default App

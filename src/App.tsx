import { useState } from 'react'

import './App.css'
import Onboarding from './stages/Onboarding'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <Onboarding />
    </>
  )
}

export default App

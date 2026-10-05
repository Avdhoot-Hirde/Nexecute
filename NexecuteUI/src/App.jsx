import Navbar from './components/Navbar'
import { Outlet } from 'react-router-dom'

function App() {

  return (
    <>
      <Navbar style='fixed top-0'/>
      <Outlet/>
    </>
  )
}

export default App

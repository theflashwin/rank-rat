import { Routes, Route } from "react-router-dom"
import Home from "./pages/Home"
import Game from "./pages/Game"
import NotFound from "./pages/NotFound"
import Navbar from "./components/Navbar"
import CreateGame from "./pages/CreateGame/CreateGame"
import ErrorPage from "./pages/Error"
import LeaderboardWrapper from "./components/LeaderboardWrapper"
import Leaderboard from "./pages/Leaderboard"
import QuestionLeaderboard from "./pages/QuestionLeaderboard"
import LeaderboardForm from "./pages/LeaderboardForm"

function App() {
  return (
    <div>
      <Navbar/>
      <Routes>
      
      <Route path="/" element={<Home/>} index/>
      <Route path="/game/:room_id" element={<Game/>} />
      <Route path="/create-game" element={<CreateGame/>} />
      <Route path="/error" element={<ErrorPage />} />

      <Route path="/leaderboard" element={<LeaderboardForm/>} />

      {/* Leaderboard (wrap in context) */}
      <Route element={<LeaderboardWrapper/>}>
        <Route path="/leaderboard/:room_id" element={<Leaderboard/>} />
        <Route path="/leaderboard/:room_id/:q_id" element={<QuestionLeaderboard/>} />
      </Route>

      {/* catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
    </div>
  )
}

export default App

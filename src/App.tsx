import { useEffect } from "react";
import {
  HashRouter as Router,
  Routes,
  Route,
} from "react-router-dom";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import MatchDetail from "@/pages/MatchDetail";
import Ranking from "@/pages/Ranking";
import Profile from "@/pages/Profile";
import { useUserStore } from "@/store/userStore";

export default function App() {
  const init = useUserStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/match/:id" element={<MatchDetail />} />
          <Route path="/ranking" element={<Ranking />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Home />} />
        </Route>
      </Routes>
    </Router>
  );
}

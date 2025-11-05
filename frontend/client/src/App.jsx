import React, { useEffect, useState } from "react";
import ChatPage from "./pages/ChatPage";
import SplashScreen from "./components/SplashScreen";

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <SplashScreen show={showSplash} logoSrc="/logo.png" />
      <div className={`${showSplash ? "opacity-0" : "opacity-100"} transition-opacity duration-500`}>
        <ChatPage />
      </div>
    </>
  );
}

import Whiteboard from "../components/Whiteboard";
import { ThemeProvider } from "@/contexts/ThemeContext";

function App() {
  return (
    <ThemeProvider>
      <Whiteboard />
    </ThemeProvider>
  );
}

export default App;

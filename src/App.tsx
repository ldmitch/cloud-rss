import { Box } from "@chakra-ui/react";
import LandingPage from "./pages/LandingPage";
import Navbar from "./components/Navbar";

function App() {
  return (
    <>
      <Navbar />
      <Box mt="80px">
        <LandingPage />
      </Box>
    </>
  );
}

export default App;

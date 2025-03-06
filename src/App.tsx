import { Box } from '@chakra-ui/react';
import LandingPage from './pages/LandingPage';
import Navbar from './components/Navbar';
import { ArticlesProvider } from './context/ArticlesContext';
import { Toaster } from './components/ui/toaster';

function App() {
  return (
    <ArticlesProvider>
      <Navbar />
      <Box mt="80px">
        <LandingPage />
      </Box>
      <Toaster />
    </ArticlesProvider>
  );
}

export default App;

import { useEffect, useState } from 'react';
import { Box, Flex, Text, Spinner, Button } from '@chakra-ui/react';
import { useArticles } from '../context/ArticlesContext';

interface RefreshStatus {
  lastUpdate: string;
  nextRefresh: string;
}

const Navbar = () => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [refreshStatus, setRefreshStatus] = useState<RefreshStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastCheckedUpdate, setLastCheckedUpdate] = useState<string | null>(null);
  
  // Get articles context
  const { hasNewArticles, loadNewArticles, checkForNewArticles } = useArticles();

  // Fetch refresh status
  const fetchRefreshStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/refresh_status');
      if (!response.ok) {
        throw new Error('Failed to fetch refresh status');
      }

      const data = await response.json();
      console.log('Refresh status:', data);
      
      // Check if this is a new update compared to our last checked time
      if (lastCheckedUpdate && data.lastUpdate !== lastCheckedUpdate) {
        // A refresh has occurred since we last checked
        console.log('Refresh detected, checking for new articles');
        await checkForNewArticles();
      }
      
      // Update our last checked time
      setLastCheckedUpdate(data.lastUpdate);
      setRefreshStatus(data);
      setError(null);

    } catch (err) {
      console.error('Error fetching refresh status:', err);
      setError('Failed to load refresh status');

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch of refresh status
    fetchRefreshStatus();

    // Set up intervals
    const timeTimer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    const refreshTimer = setInterval(() => {
      fetchRefreshStatus();
    }, 30000);

    return () => {
      clearInterval(timeTimer);
      clearInterval(refreshTimer);
    };
  }, [lastCheckedUpdate]);

  // Format countdown time
  const formatNextRefresh = () => {
    if (!refreshStatus) return 'Loading...';
    const nextRefresh = new Date(refreshStatus.nextRefresh);
    const now = new Date();

    // Calculate time remaining
    const diffMs = nextRefresh.getTime() - now.getTime();
    if (diffMs <= 0) {
      return 'Refresh in progress...';
    }

    // Calculate minutes and seconds
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffSeconds = Math.floor((diffMs % 60000) / 1000);

    return `Next refresh in ${diffMinutes}m ${diffSeconds}s`;
  };

  return (
    <Box
      position="fixed"
      top="20px"
      left="50%"
      transform="translateX(-50%)"
      bg="white"
      boxShadow="md"
      borderRadius="md"
      px={4}
      py={3}
      zIndex={1000}
      width="550px"
    >
      <Flex align="center">
        <Box width="250px" flexShrink={0}>
          <Text fontSize="lg" fontWeight="semibold" color="black">
            {`${currentTime.toLocaleDateString("en-GB")} 
            ${currentTime.toLocaleTimeString("en-GB", { hour12: false })}`}
          </Text>
        </Box>

        {hasNewArticles && (
          <Box mx={2}>
            <Button 
              colorScheme="blue" 
              size="sm"
              onClick={loadNewArticles}
            >
              New articles available
            </Button>
          </Box>
        )}

        <Box width={hasNewArticles ? "200px" : "250px"} flexShrink={0} textAlign="right" ml="auto">
          {loading ? (
            <Flex align="center" justify="flex-end">
              <Spinner size="sm" mr={2} />
              <Text fontSize="lg" color="gray.600">Loading...</Text>
            </Flex>
          ) : error ? (
            <Text fontSize="lg" color="red.500">{error}</Text>
          ) : (
            <Box width="100%" textAlign="center">
              <Text
                fontSize="lg"
                color="blue.600"
                fontWeight="medium"
                display="inline-block"
                minWidth="200px"
              >
                {formatNextRefresh()}
              </Text>
            </Box>
          )}
        </Box>
      </Flex>
    </Box>
  );
};

export default Navbar;

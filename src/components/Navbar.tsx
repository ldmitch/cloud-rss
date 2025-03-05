import { useEffect, useState } from 'react';
import { Box, Flex, Text, Spinner } from '@chakra-ui/react';

interface RefreshStatus {
  lastUpdate: string;
  nextRefresh: string;
}

const Navbar = () => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [refreshStatus, setRefreshStatus] = useState<RefreshStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
  }, []);

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
      px={2}
      py={3}
      zIndex={1000}
    >
      <Flex align="center" justify="space-between">
        <Text fontSize="lg" fontWeight="semibold" width="400px" textAlign="left" color="black">
          {`${currentTime.toLocaleDateString("en-GB")} ${currentTime.toLocaleTimeString("en-GB", { hour12: false })}`}
        </Text>

        <Box>
          {loading ? (
            <Flex align="center">
              <Spinner size="sm" mr={2} />
              <Text fontSize="sm" color="gray.600">Loading...</Text>
            </Flex>
          ) : error ? (
            <Text fontSize="sm" color="red.500">{error}</Text>
          ) : (
            <Text fontSize="sm" color="blue.600" fontWeight="medium">
              {formatNextRefresh()}
            </Text>
          )}
        </Box>
      </Flex>
    </Box>
  );
};

export default Navbar;

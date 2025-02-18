import { useEffect, useState } from 'react';
import { Box, Flex, Text } from '@chakra-ui/react';

const Navbar = () => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  return (
    <Box
      position="fixed"
      top="20px"
      left="50%"
      transform="translateX(-50%)"
      bg="white"
      boxShadow="md"
      borderRadius="md"
      px={6}
      py={3}
      zIndex={1000}
    >
      <Flex align="center" justify="space-between">
        <Text fontSize="lg" fontWeight="semibold" width="400px" textAlign="left" color="black">
          {`${currentTime.toLocaleDateString("en-GB")} ${currentTime.toLocaleTimeString("en-GB", { hour12: false })}`}
        </Text>
        {/* Future options placeholder */}
        <Box>
          {/* Additional nav items can be added here */}
        </Box>
      </Flex>
    </Box>
  );
};

export default Navbar;

import { useEffect, useState } from "react";
import { Box, Flex, Text } from "@chakra-ui/react";

const Navbar = () => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timeTimer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      clearInterval(timeTimer);
    };
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
      px={4}
      py={3}
      zIndex={1000}
    >
      <Flex align="center" justify="center">
        <Box width="250px" textAlign="center">
          <Text fontSize="lg" fontWeight="semibold" color="black">
            {`${currentTime.toLocaleDateString("en-GB")}
            ${currentTime.toLocaleTimeString("en-GB", { hour12: false })}`}
          </Text>
        </Box>
      </Flex>
    </Box>
  );
};

export default Navbar;

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

  const year = currentTime.getFullYear();
  const month = String(currentTime.getMonth() + 1).padStart(2, "0");
  const day = String(currentTime.getDate()).padStart(2, "0");
  const hours = String(currentTime.getHours()).padStart(2, "0");
  const minutes = String(currentTime.getMinutes()).padStart(2, "0");
  const seconds = String(currentTime.getSeconds()).padStart(2, "0");

  // Construct the desired format "yyyy/mm/dd hh:mm:ss"
  const formattedTime = `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;

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
            {formattedTime}
          </Text>
        </Box>
      </Flex>
    </Box>
  );
};

export default Navbar;

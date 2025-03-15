import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

const config = defineConfig({
  theme: {
    tokens: {
      fonts: {
        body: { value: "Menlo" },
        heading: { value: "Menlo" },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);

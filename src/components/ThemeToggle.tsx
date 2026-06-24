import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/ThemeContext";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="relative w-10 h-10 rounded-xl overflow-hidden hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer border border-transparent dark:border-gray-800"
    >
      <motion.div
        initial={false}
        animate={{ rotate: theme === "dark" ? 0 : 90, scale: theme === "dark" ? 1 : 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="absolute"
      >
        <Sun size={20} className="text-yellow-400 fill-yellow-400" />
      </motion.div>
      <motion.div
        initial={false}
        animate={{ rotate: theme === "dark" ? -90 : 0, scale: theme === "dark" ? 0 : 1 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="absolute"
      >
        <Moon size={20} className="text-gray-500 hover:text-primary" />
      </motion.div>
    </Button>
  );
};

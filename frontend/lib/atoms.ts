import React, { useState } from "react";

// 在组件中使用 useEffect 初始化
export const useInitializeApiKey = (): [string, React.Dispatch<React.SetStateAction<string>>] => {
  const [apiKey, setApiKey] = useState('');

  React.useEffect(() => {
    // 从 localStorage 中读取初始值
    const storedApiKey = localStorage.getItem("API_KEY") || "";
    setApiKey(storedApiKey);
  }, []);

  return [apiKey, setApiKey];
};
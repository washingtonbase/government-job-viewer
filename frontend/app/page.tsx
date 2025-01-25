"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useInitializeApiKey } from "@/lib/atoms";

const ArrowUpIcon = ({ size = 16 }: { size?: number }) => {
  return (
    <svg
      height={size}
      strokeLinejoin="round"
      viewBox="0 0 16 16"
      width={size}
      style={{ color: "currentcolor" }}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.70711 1.39644C8.31659 1.00592 7.68342 1.00592 7.2929 1.39644L2.21968 6.46966L1.68935 6.99999L2.75001 8.06065L3.28034 7.53032L7.25001 3.56065V14.25V15H8.75001V14.25V3.56065L12.7197 7.53032L13.25 8.06065L14.3107 6.99999L13.7803 6.46966L8.70711 1.39644Z"
        fill="currentColor"
      />
    </svg>
  );
};

const SERVER_URL = "ws://localhost:8080/ws";

export default function MainPage() {
  const [api_key, setApiKey] = useInitializeApiKey(); // 初始化 API_KEY
  const [userPrompt, setUserPrompt] = useState("");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!userPrompt.trim()) {
      alert("请输入你的情况描述");
      return;
    }

    setIsCalculating(true);
    setProgress(1);
    setResult(null);

    const ws = new WebSocket(SERVER_URL);

    ws.onopen = () => {
      ws.send(JSON.stringify({ user_prompt: userPrompt, api_key: api_key }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "progress") {
        setProgress((prevProgress) => Math.max(prevProgress, message.message));
      } else if (message.type === "result") {
        setResult(JSON.stringify(message.qualified, null, 2));
        setIsCalculating(false);
        ws.close();
      } else if (message.type === "error") {
        console.log(message.error);
        if (message.error === "ALL API KEYS FAILED") {
          setDialogOpen(true);
        } else {
          toast({
            variant: "destructive",
            title: message.error,
            description: "中途出现错误，但仍有部分结果返回",
            duration: 20000,
          });
        }
        setResult(JSON.stringify(message.result, null, 2));
        setIsCalculating(false);
      }
    };

    ws.onclose = (event) => {
      if (event.code != 1000) {
        toast({
          variant: "destructive",
          title: "连接断开",
          description: "通常是由于服务器错误或过载，导致连接断开，计算结果全部丢失，请向作者反映",
          duration: 20000,
        });
      }
      setIsCalculating(false);
    };

    ws.onerror = () => {
      toast({
        variant: "destructive",
        title: "建立网络连接失败",
        description: "请检查你的网络",
      });
      setIsCalculating(false);
    };
  };

  const handleConfirm = () => {
    localStorage.setItem("API_KEY", api_key);
    setDialogOpen(false);
  };

  return (
    <div className="pt-8">
      <Dialog open={dialogOpen}>
        <DialogContent className="sm:max-w-[425px]" dialog_onclick={() => setDialogOpen(false)}>
          <div className="font-bold text-center">若您要免费使用，则要进行下面步骤</div>
          <span>请你打开这个网站 </span>
          <a href="https://platform.deepseek.com" target="_blank" className="text-blue-400">
            https://platform.deepseek.com
          </a>
          <span>注册创建一个 API key，复制粘贴到这里，然后点确定即可继续使用</span>

          <div className="grid gap-4 py-4">
            <div className="grid items-center gap-4">
              <Input
                id="api-key"
                placeholder="请输入 Key 比如 sk-43437784f4d04795af090b62117aa688"
                value={api_key as string}
                onChange={(e) => setApiKey(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleConfirm}>确定</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
      <h1 className="font-bold text-center text-xl md:text-4xl -tracking-tighter">
        AI 公务员岗位筛选
      </h1>

      <div className="w-full flex justify-center pt-[20px] md:pt-[30px]">
        <div className="relative w-[90%] md:w-[50%]">
          <Textarea
            className="min-h-[220px] md:min-h-[150px] overflow-y-auto rounded-2xl !text-base bg-muted"
            placeholder={
              `官方的岗位检索系统太过简陋，每个人情况不同，找到符合报名条件的岗位非常麻烦。

不如让 AI 帮你，只需像下面这样描述一下, AI 自动过一遍所有岗位，智能匹配：

如: "我2021年数学本科毕业，群众身份，要个佛山或者肇庆的岗位"`
            }
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
          />
          <div className="absolute bottom-0 right-0 p-2 w-fit flex flex-row justify-end">
            <Button
              className="rounded-full p-1.5 h-fit border"
              onClick={handleSubmit}
            >
              <ArrowUpIcon size={14} />
            </Button>
          </div>
        </div>
      </div>

      {isCalculating && (
        <div className="mt-8 text-center flex-grow-0 transition-opacity duration-300">
          <div>进度</div>
          <Progress value={progress} className="h-2 max-w-[90%] md:max-w-[800px] bg-gray-200 rounded-full mx-auto mt-2" />
          <div className="mt-2 text-center">{progress}%</div>
        </div>
      )}

      {result && (
        <div className="mt-8 p-4 bg-gray-100 rounded-lg max-w-[90%] md:max-w-[800px] overflow-scroll mx-auto max-h-[1000px]">
          <pre>{result}</pre>
        </div>
      )}
    </div>
  );
}
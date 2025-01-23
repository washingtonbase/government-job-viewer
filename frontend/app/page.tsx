"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useState } from "react"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"


const ArrowUpIcon = ({ size = 16 }: { size?: number }) => {
  return (
    <svg
      height={size}
      strokeLinejoin="round"
      viewBox="0 0 16 16"
      width={size}
      style={{ color: 'currentcolor' }}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.70711 1.39644C8.31659 1.00592 7.68342 1.00592 7.2929 1.39644L2.21968 6.46966L1.68935 6.99999L2.75001 8.06065L3.28034 7.53032L7.25001 3.56065V14.25V15H8.75001V14.25V3.56065L12.7197 7.53032L13.25 8.06065L14.3107 6.99999L13.7803 6.46966L8.70711 1.39644Z"
        fill="currentColor"
      />
    </svg>
  )
}

// const SERVER_URL = 'wss://func-ccba-whirddnmxd.cn-hangzhou.fcapp.run/ws' // WebSocket 服务器地址
const SERVER_URL = 'ws://localhost:8080/ws'

export default function DataTable() {
  const [userPrompt, setUserPrompt] = useState("")
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<string | null>(null)
  const [isCalculating, setIsCalculating] = useState(false) // 新增状态：是否正在计算
  const { toast } = useToast()

  const handleSubmit = () => {
    if (!userPrompt.trim()) {
      alert("请输入你的情况描述")
      return
    }

    setIsCalculating(true) // 开始计算
    setProgress(1) // 初始进度设置为 1%
    setResult(null)

    const ws = new WebSocket(SERVER_URL)

    ws.onopen = () => {
      ws.send(JSON.stringify({ user_prompt: userPrompt }))
    }

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      if (message.type === 'progress') {
        // 确保进度条只能递增
        setProgress((prevProgress) => Math.max(prevProgress, message.message))
      } else if (message.type === 'result') {
        setResult(JSON.stringify(message.qualified, null, 2))
        setIsCalculating(false)
        ws.close()
      } else if (message.type === 'error'){
        toast({
          variant: "destructive",
          title: message.error,
          description: "中途出现错误，但仍有部分结果返回",
          duration: 20000
        })
        setResult(JSON.stringify(message.result, null, 2))
        setIsCalculating(false)
      }
    }

    ws.onclose = (event) => {
      if (event.code != 1000) {
        toast({
          variant: 'destructive',
          title: '连接断开',
          description: '通常是由于服务器错误或过载，导致连接断开，计算结果全部丢失，请向作者反映',
          duration: 20000
        })
      }
      setIsCalculating(false) // 计算结束
    }

    ws.onerror = (error) => {
      toast({
        variant: "destructive",
        title: "建立网络连接失败",
        description: '请检查你的网络'
      })
      setIsCalculating(false) // 计算结束
    }
  }

  return (
    <div className="pt-8">
      <Toaster></Toaster>
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

如: "我2021年数学本科毕业，群众身份，要个佛山或者肇庆的岗位"
`}
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

      {/* 条件渲染：只有在计算过程中显示进度条和百分比 */}
      {isCalculating && (
        <div className="mt-8 text-center flex-grow-0 transition-opacity duration-300">
          <div>进度</div>
          <Progress value={progress} className="h-2 max-w-[90%] md:max-w-[800px] bg-gray-200 rounded-full mx-auto mt-2" />
          <div className="mt-2 text-center">{progress}%</div>
        </div>
      )}

      {/* 显示最终结果 */}
      {result && (
        <div className="mt-8 p-4 bg-gray-100 rounded-lg max-w-[90%] md:max-w-[800px] overflow-scroll mx-auto max-h-[1000px]">
          <pre>{result}</pre>
        </div>
      )}
    </div>
  )
}
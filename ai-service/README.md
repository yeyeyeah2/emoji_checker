# AI 情绪推理服务

该服务从摄像头、视频文件或 RTSP 流采样画面，在内存中完成人脸检测和情绪分类，将超过阈值的匿名结果写入后端 `/api/v1/ai/emoji-results`。服务不会保存或上传原始帧、人脸截图和视频。

## 推理后端

- `onnx`：默认生产路径。使用 OpenCV Haar 检测人脸，并加载 FER2013 风格 ONNX 分类模型。模型输入应为 `1×1×48×48` 灰度图，输出顺序为 `angry, disgust, fear, happy, sad, surprise, neutral`。
- `fer`：安装 `pip install '.[fer]'` 后可使用 FER 库。
- `mock`：只用于自动化测试和接口演示，必须显式配置 `AI_ALLOW_MOCK=true`，不得用于真实课堂结论。

模型文件不进入代码仓库。部署时应从课程批准的来源取得模型并挂载到容器，记录模型名称、版本、许可证和校验值。

## 运行

```sh
python -m venv .venv
. .venv/bin/activate
pip install -e '.[dev]'
cp .env.example .env
# 修改后端地址、独立 AI 令牌、课堂 ID、视频源和模型路径
emoji-ai
```

也可用命令行覆盖非敏感参数：

```sh
emoji-ai --session-id <UUID> --source 0 --source-id classroom-camera-01 \
  --backend onnx --model /models/emotion.onnx --threshold 0.60 --sample-interval 2
```

AI 令牌应通过环境变量或秘密管理器注入，避免出现在命令历史。每个采样帧和人脸位置生成确定性事件 ID，网络重试不会制造重复记录；后端的幂等检查仍是最终保障。

## 局限性

表情分类不能可靠代表个人的真实情绪，光照、遮挡、姿态、肤色、文化表达和模型训练数据都会造成偏差。系统仅适合课堂级聚合趋势，不应用于个体评价、考勤、纪律处分或其他高风险决策。默认匿名化；如需改变数据用途或保存媒体，必须另行完成告知、授权和隐私评审。

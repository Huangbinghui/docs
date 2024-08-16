---
title: ManimGL工具使用笔记
titleTemplate: ManimGL 代码生成演示视频和图片
description: ManimGL 代码生成演示视频和图片
editLink: true
---

# 快速入门 

首先，根据如下结构创建一个新的 `.py` 文件（如 `start.py` ）：

```text
manim/
├── manimlib/
│   ├── animation/
│   ├── ...
│   ├── default_config.yml
│   └── window.py
├── (custom_config.yml)
└── start.py
```

然后粘贴如下代码（稍后我会详细解释其每行的作用）：

```python
from manimlib import *

class SquareToCircle(Scene):
    def construct(self):
        circle = Circle()
        circle.set_fill(BLUE, opacity=0.5)
        circle.set_stroke(BLUE_E, width=4)

        self.add(circle)
```

运行这个命令：

```shell
manimgl start.py SquareToCircle
```

屏幕上会弹出一个窗口，这时你可以：

*   滚动鼠标中键来上下移动画面
*   按住键盘上`z`键的同时滚动鼠标中键来缩放画面
*   按住键盘上`f` 键的同时移动鼠标来平移画面
*   按住键盘上` d `键的同时移动鼠标来改变三维视角
*   按下键盘上` r `键恢复到最初的视角

最后，你可以通过按 `q `来关闭窗口并退出程序.

生成图片：

```shell
manimgl start.py SquareToCircle -os
```

这时将没有窗口弹出，当程序运行结束后，会自动打开这张渲染得到的图片 （默认位于同级目录的子目录 `images/` 中）

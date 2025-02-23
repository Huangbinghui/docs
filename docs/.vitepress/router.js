/**
 * {
 *     text: string,
 *     items?: Array<TypeRouter>,
 *     link?: string,
 *     collapsed?: boolean
 *     base?: string
 *     docFooterText?: string
 *     rel?: string
 *     target?: string
 *     activeMatch?: string
 * }
 */
// 前端
export const frontend = [
    {
        text: "scss", collapsed: true, items: [
            {
                text: "scss",
                link: "/前端/SCSS"
            }
        ]
    }
]
// 后端
export const backend = [
    {
        text: "Linux", collapsed: true,
        items: [
            {text: "pgrep", link: "/后端/Linux/pgrep"},
            {text: "xargs", link: "/后端/Linux/xargs"},
        ],
    },
    {
        text: "操作系统", collapsed: true, items: [
            {text: "GDB", link: "/后端/操作系统/GDB"},
        ]
    },
    {
        text: "数据库", collapsed: true, items: [
            {
                text: "oracle", collapsed: true, items: [
                    {text: "dump", link: "/后端/数据库/oracle/dump命令"},
                    {text: "服务启停", link: "/后端/数据库/oracle/服务启停"},
                ]
            },

        ]
    },
    {
        text: "设计模式", collapsed: true,
        items: [
            {text: "SOLID原则", link: "/后端/设计模式/SOLID原则"},
        ],
    },
    {
        text: "Spring Boot", collapsed: true,
        items: [
            {
                text: "基础", collapsed: true, items: [
                    {text: "CommandLineRunner", link: "/后端/Spring Boot/CommandLineRunner"},
                    {text: "BeanPostProcessor", link: "后端/Spring Boot/BeanPostProcessor"},
                    {text: "InitializingBean", link: "后端/Spring Boot/InitializingBean"},
                ]
            }
        ]
    },
    {
        text: "Netty", collapsed: true,
        items: [
            {
                text: "Netty的概念及体系结构", collapsed: true, items: [
                    {text: "第1章 Netty 异步和事件驱动", link: "/后端/Netty/1、Netty异步和事件驱动.md"},
                    {text: "第2章 你的第一个Netty应用程序", link: "/后端/Netty/2、你的第一个Netty应用程序.md"},
                    {text: "第3章 Netty的组件和设计", link: "/后端/Netty/3、Netty的组件和设计.md"},
                    {text: "第4章 传输", link: "/后端/Netty/4、传输.md"},
                    {text: "第5章 ByteBuf", link: "/后端/Netty/5、ByteBuf"},
                    {text: "第5章 ChannelHandler和ChannelPipeline", link: "/后端/Netty/6、ChannelHandler和ChannelPipeline"},
                    {text: "第6章 EventLoop和线程模型", link: "后端/Netty/7、EventLoop和线程模型"},
                    {text: "第7章 引导", link: "/后端/Netty/8、引导"},
                    {text: "第8章 单元测试", link: "/后端/Netty/9、单元测试"},
                ]
            },
            {
                text: "编解码器", collapsed: true, items: [
                    {text: "第10章 编解码器框架", link: "/后端/Netty/10、编解码器.md"},
                    {text: "第11章 预置的 ChannelHandler 和编解码器", link: "/后端/Netty/11、预置的ChannelHandler和编解码器.md"},
                ]
            },
            {
                text: "网络协议", collapsed: true, items: [
                    {text: "第12章 WebSocket", link: "/后端/Netty/13、WebSocket.md"},
                    {text: "第13章 使用UDP广播事件", link: "/后端/Netty/14、使用UDP广播事件.md"},
                ]
            }
        ]
    },
]


export const tools = [
    {
        text: "sketch", collapsed: true,
        items: [
            {text: "基本操作", link: "/工具/sketch/基本操作"},
        ],
    },
    {
        text: "ManimGL", collapsed: true,
        items: [
            {text: "manim", link: "/工具/manim/index"},
        ],
    },
    {
        text: "Vim", collapsed: true, items: [
            {
                text: "vim基本使用", link: "/工具/vim/VIM使用"
            }
        ],
    },
    {
        text: "typora", collapsed: true, items: [
            {
                text: "yaml-front-matter",
                link: "/工具/typora/yaml-front-matter.md"
            }
        ]
    },
    {
        text: "vitepress", collapsed: true, items: [
            {
                text: "开始",
                link: "/工具/vitepress/开始.md"
            },
            {
                text: "Markdown",
                link: "/工具/vitepress/Markdown.md"
            },
            {
                text: "在Markdown使用Vue",
                link: "/工具/vitepress/在Markdown使用Vue.md"
            },
        ]
    }
]

export const interest = []


// 侧边栏
export const sidebar = {
    "/前端/": [{
        text: "前端",
        items: frontend
    }],
    "/后端/": [
        {
            text: "后端",
            items: backend,
        },
    ],
    "/兴趣/": [{
        text: "兴趣",
        items: interest,
    }],
    "/工具/": [
        {
            text: "工具",
            items: tools,
        },
    ]
}
// 顶部导航栏
export const nav = [
    {text: "主页", link: "/"},
    {text: "后端", link: "/后端/index"},
    {text: "前端", link: "/前端/SCSS"},
    {text: "兴趣", link: "/兴趣/"},
    {text: "工具", link: "/工具/index"},
]
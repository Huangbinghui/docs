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
        text: "vitepress", collapsed: true, items: [
            {
                text: "开始",
                link: "/前端/vitepress/开始"
            }
        ]
    },
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
    }
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
    }
]

export const interest = []

export const about = [
    {
        text: "关于【我】", collapsed: true, items: [
            {
                text: "关于",
                link: "/关于/me"
            }
        ]
    }
]

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
    ],
    "/关于/": [
        {
            text: "关于",
            items: about,
        }
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
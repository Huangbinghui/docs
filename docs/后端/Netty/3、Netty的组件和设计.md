---
typora-copy-images-to: ../../public
typora-root-url: /Volumes/硬盘/Code/docs/docs/public
---

[toc]

# Channel、EventLoop 和 ChannelFuture

Netty 网络抽象的代表:

*   Channel—Socket;
*   EventLoop—控制流、多线程处理、并发;
*   ChannelFuture—异步通知。

## Channel 接口

基本的 I/O 操作(`bind()`、`connect()`、`read()`和 `write()`)依赖于底层网络传输所提供的原语。在基于 Java 的网络编程中,其基本的构造是`Socket`。Netty 的 Channel 接口所提供的 API,<u>大大地降低了直接使用 Socket 类的复杂性</u>。此外,Channel 也是拥有许多预定义的、专门化实现的广泛类层次结构的根,下面是一个简短的部分清单:

*   EmbeddedChannel;
*   LocalServerChannel;
*   NioDatagramChannel;
*   NioSctpChannel;
*   NioSocketChannel。

## EventLoop 接口

EventLoop 定义了 Netty 的核心抽象,用于处理连接的生命周期中所发生的事件。我们将在第 7 章中结合 Netty 的线程处理模型的上下文对 EventLoop 进行详细的讨论。目前,图 3-1 在高层次上说明了 Channel、EventLoop、Thread 以及 EventLoopGroup 之间的关系。

<img src="/Netty实战_page_55_1.png" alt="Netty实战_page_55_1" style="zoom:20%;" />

这些关系是:

*   一个 EventLoopGroup 包含一个或者多个 EventLoop;
*   一个 EventLoop 在它的生命周期内只和一个 Thread 绑定;
*   所有由 EventLoop 处理的 I/O 事件都将在它专有的 Thread 上被处理;
*   一个 Channel 在它的生命周期内只注册于一个 EventLoop;
*   一个 EventLoop 可能会被分配给一个或多个 Channel。

## ChannelFuture 接口

# ChannelHandler 和 ChannelPipeline

## ChannelHandler 接口

## ChannelPipeline 接口

## 更加深入地了解 ChannelHandler

## 编码器和解码器

## 抽象类 SimpleChannelInboundHandler


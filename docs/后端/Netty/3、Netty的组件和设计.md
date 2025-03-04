---
typora-copy-images-to: ../../public
typora-root-url: /Volumes/硬盘/Code/docs/docs/public
---
# Channel、EventLoop 和 ChannelFuture

Netty 网络抽象的代表:

*   Channel—Socket;
*   EventLoop—控制流、多线程处理、并发;
*   ChannelFuture—异步通知。

## Channel 接口

基本的 I/O 操作(`bind()`、`connect()`、`read()`和 `write()`)依赖于底层网络传输所提供的原语。在基于 Java 的网络编程中,其基本的构造是`Socket`。Netty 的 Channel 接口所提供的 API,<mark>大大地降低了直接使用 Socket 类的复杂性</mark>。此外,Channel 也是拥有许多预定义的、专门化实现的广泛类层次结构的根,下面是一个简短的部分清单:

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

ChannelFuture 接口,其 addListener()方法注册了一个 ChannelFutureListener, 以便在某个操作完成时(无论是否成功)得到通知。

# ChannelHandler 和 ChannelPipeline

## ChannelHandler 接口

从应用程序开发人员的角度来看,Netty 的主要组件是 ChannelHandler,它充当了所有处理入站和出站数据的应用程序逻辑的容器。事实上,ChannelHandler 可专门用于几乎任何类型的动作,例如将数据从一种格式转换为另外一种格式,或者处理转换过程中所抛出的异常。

举例来说,ChannelInboundHandler 是一个你将会经常实现的子接口。这种类型的ChannelHandler 接收入站事件和数据,这些数据随后将会被你的应用程序的业务逻辑所处理。当你要给连接的客户端发送响应时,也可以从 ChannelInboundHandler 冲刷数据。你的应用程序的业务逻辑通常驻留在一个或者多个 ChannelInboundHandler 中。

## ChannelPipeline 接口

<mark>`ChannelPipeline` 提供了 `ChannelHandler` 链的容器</mark>,并定义了用于在该链上传播入站和出站事件流的 API。 当Channel 被创建时, 它会被自动地分配到它专属的ChannelPipeline。

ChannelHandler 安装到 ChannelPipeline 中的过程如下所示:

*   一个`ChannelInitializer`的实现被注册到了ServerBootstrap中(或者用于客户端的 Bootstrap);
*   当 `ChannelInitializer.initChannel()`方法被调用时,`ChannelInitializer` 将在 `ChannelPipeline` 中安装一组自定义的 `ChannelHandler`;
*   `ChannelInitializer` 将它自己从 `ChannelPipeline` 中移除。

ChannelHandler 是专为支持广泛的用途而设计的,可以将它看作是处理往来 ChannelPipeline 事件 (包括数据) 的任何代码的通用容器。 图 3-2 说明了这一点, 其展示了从ChannelHandler 派生的ChannelInboundHandler 和ChannelOutboundHandler 接口。

<img src="/Netty实战_page_57_1.png" alt="Netty实战_page_57_1" style="zoom:25%;" />

<mark>使得事件流经 ChannelPipeline 是 ChannelHandler 的工作</mark>,它们是在应用程序的初始化或者引导阶段被安装的。这些对象接收事件、执行它们所实现的处理逻辑,并将数据传递给链中的下一个 ChannelHandler。它们的执行顺序是由它们被添加的顺序所决定的。<mark>实际上, 被我们称为 ChannelPipeline 的是这些 ChannelHandler 的编排顺序。</mark>

下图说明了一个 Netty 应用程序中入站和出站数据流之间的区别。从一个客户端应用程序的角度来看,如果事件的运动方向是从客户端到服务器端,那么我们称这些事件为出站的,反之则称为入站的。

<img src="/Netty实战_page_57_2.png" alt="Netty实战_page_57_2" style="zoom:25%;" />

上图也显示了入站和出站 ChannelHandler 可以被安装到同一个 ChannelPipeline 中。如果一个消息或者任何其他的入站事件被读取,那么它会从 ChannelPipeline 的头部开始流动,并被传递给第一个 ChannelInboundHandler。这个 ChannelHandler 不一定会实际地修改数据,具体取决于它的具体功能,在这之后,数据将会被传递给链中的下一个ChannelInboundHandler。最终,数据将会到达 ChannelPipeline 的尾端,届时,所有处理就都结束了。

数据的出站运动(即正在被写的数据)在概念上也是一样的。在这种情况下,数据将从ChannelOutboundHandler 链的尾端开始流动,直到它到达链的头部为止。在这之后,出站数据将会到达网络传输层,这里显示为 Socket。通常情况下,这将触发一个写操作。

>   [!NOTE]
>
>   **关于入站和出站 ChannelHandler 的更多讨论** 
>
>   通过使用作为参数传递到每个方法的 ChannelHandlerContext,事件可以被传递给当前ChannelHandler 链中的下一个 ChannelHandler。 因为你有时会忽略那些不感兴趣的事件, 所以 Netty 提供了抽象基类 ChannelInboundHandlerAdapter 和 ChannelOutboundHandlerAdapter。通过调用 ChannelHandlerContext上的对应方法, 每个都提供了简单地将事件传递给下一个ChannelHandler 的方法的实现。随后,你可以通过重写你所感兴趣的那些方法来扩展这些类。



鉴于出站操作和入站操作是不同的,你可能会想知道如果将两个类别的 ChannelHandler 都混合添加到同一个 ChannelPipeline 中会发生什么。虽然 ChannelInboundHandle 和ChannelOutboundHandle 都扩展自 ChannelHandler,但是 <mark>Netty 能区分 ChannelInboundHandler 实现和 ChannelOutboundHandler 实现,并确保数据只会在具有相同定向类型的两个 ChannelHandler 之间传递</mark>。

在 Netty 中, 有两种发送消息的方式。 你可以直接写到Channel中, 也可以写到和ChannelHandler相关联的ChannelHandlerContext对象中。 前一种方式将会导致消息从ChannelPipeline 的尾端开始流动,而后者将导致消息从 ChannelPipeline 中的下一个 ChannelHandler 开始流动。

## 更加深入地了解 ChannelHandler

正如我们之前所说的,有许多不同类型的 ChannelHandler,它们各自的功能主要取决于它们的超类。Netty 以适配器类的形式提供了大量默认的 ChannelHandler 实现,其旨在简化应用程序处理逻辑的开发过程。

>   [!TIP]
>
>   **为什么需要适配器类** 
>
>   有一些适配器类可以将编写自定义的 ChannelHandler 所需要的努力降到最低限度,因为它们提供了定义在对应接口中的所有方法的默认实现。 
>   下面这些是编写自定义 ChannelHandler 时经常会用到的适配器类:
>
>   *   ChannelHandlerAdapter
>   *   ChannelInboundHandlerAdapter
>   *   ChannelOutboundHandlerAdapter
>   *   ChannelDuplexHandler

接下来我们将研究 3 个 ChannelHandler 的子类型: 编码器、 解码器和 SimpleChannelInboundHandler —— ChannelInboundHandlerAdapter 的一个子类。

## 编码器和解码器

当你通过 Netty 发送或者接收一个消息的时候,就将会发生一次数据转换。入站消息会被解码;也就是说,从字节转换为另一种格式,通常是一个 Java 对象。如果是出站消息,则会发生相反方向的转换:它将从它的当前格式被编码为字节。这两种方向的转换的原因很简单:网络数据总是一系列的字节。

对应于特定的需要,Netty 为编码器和解码器提供了不同类型的抽象类。例如,你的应用程序可能使用了一种中间格式,而不需要立即将消息转换成字节。你将仍然需要一个编码器,但是它将派生自一个不同的超类。为了确定合适的编码器类型,你可以应用一个简单的命名约定。 

通常来说,这些基类的名称将类似于 `ByteToMessageDecoder` 或 `MessageToByteEncoder`。 对于特殊的类型, 你可能会发现类似于 `ProtobufEncoder` 和 `ProtobufDecoder` 这样的名称——预置的用来支持 Google 的 Protocol Buffers。

严格地说,其他的处理器也可以完成编码器和解码器的功能。但是,正如有用来简化ChannelHandler 的创建的适配器类一样,<mark>所有由 Netty 提供的编码器/解码器适配器类都实现了 ChannelOutboundHandler 或者 ChannelInboundHandler接口</mark>。

## 抽象类 SimpleChannelInboundHandler

最常见的情况是,你的应用程序会利用一个 ChannelHandler 来接收解码消息,并对该数据应用业务逻辑。 要创建一个这样的 ChannelHandler, 你只需要扩展基类 SimpleChannelInboundHandler\<T\>, 其中 T 是你要处理的消息的 Java 类 型 。 在这个 ChannelHandler 中, 你将需要重写基类的一个或者多个方法,并且获取一个到 ChannelHandlerContext 的引用, 这个引用将作为输入参数传递给 ChannelHandler 的所有方法。 

在这种类型 的 ChannelHandler 中, 最重要的方法是 channelRead0(ChannelHandlerContext,T)。除了要求不要阻塞当前的 I/O 线程之外,其具体实现完全取决于你。我们稍后将对这一主题进行更多的说明。

# 引导

Netty 的引导类为应用程序的网络层配置提供了容器,这涉及将一个进程绑定到某个指定的端口,或者将一个进程连接到另一个运行在某个指定主机的指定端口上的进程。

通常来说,我们把前面的用例称作引导一个服务器,后面的用例称作引导一个客户端。虽然这个术语简单方便,但是它略微掩盖了一个重要的事实,即<mark>“服务器”和“客户端”实际上表示了不同的网络行为</mark>;换句话说,是监听传入的连接还是建立到一个或者多个进程的连接。

>   [!CAUTION]
>
>   **面向连接的协议**
>
>   请记住,严格来说, “连接”这个术语仅适用于面向连接的协议,如 TCP,其保证了两个连接端点之间消息的有序传递。

因此,有两种类型的引导:<mark>一种用于客户端(简单地称为 Bootstrap) ,而另一种(ServerBootstrap) 用于服务器</mark>。 无论你的应用程序使用哪种协议或者处理哪种类型的数据, 唯一决定它使用哪种引导类的是它是作为一个客户端还是作为一个服务器。 表 3-1 比较了这两种类型的引导类。

|       类    别       |      Bootstrap       |  ServerBootstrap   |
| :------------------: | :------------------: | :----------------: |
|   网络编程中的作用   | 连接到远程主机和端口 | 绑定到一个本地端口 |
| EventLoopGroup的数目 |          1           |       2[^1]        |

第二个区别可能更加明显。引导一个客户端只需要一个 EventLoopGroup,但是一个ServerBootstrap 则需要两个(也可以是同一个实例) 。为什么呢?

<mark>因为服务器需要两组不同的 Channel</mark>。第一组将只包含一个 ServerChannel,代表服务器自身的已绑定到某个本地端口的正在监听的套接字。 而第二组将包含所有已创建的用来处理传入客户端连接(对于每个服务器已经接受的连接都有一个)的 Channel。图 3-4 说明了这个模型,并且展示了为何需要两个不同的 EventLoopGroup。

<img src="/Netty实战_page_61_1.png" alt="Netty实战_page_61_1" style="zoom:25%;" />

与 ServerChannel 相关联的 EventLoopGroup 将分配一个负责为传入连接请求创建Channel 的 EventLoop。一旦连接被接受,第二个 EventLoopGroup 就会给它的 Channel 分配一个 EventLoop。

---

[^1]:实际上,ServerBootstrap类也可以只使用一个EventLoopGroup,此时其将在两个场景下共用同一个EventLoopGroup。

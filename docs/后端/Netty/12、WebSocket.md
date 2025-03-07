---
typora-copy-images-to: ../../public
typora-root-url: /Volumes/硬盘/Code/docs/docs/public
---

 

## 简介

WebSocket 协议[^1]是完全重新设计的协议,<u>旨在为 Web 上的双向数据传输问题提供一个切实可行的解决方案,使得客户端和服务器之间可以在任意时刻传输消息,因此,这也就要求它们异步地处理消息回执。</u> (作为 HTML5 客户端 API 的一部分, 大部分最新的浏览器都已经支持了 WebSocket。 ) 

Netty 对于 WebSocket 的支持包含了所有正在使用中的主要实现, 因此在你的下一个应用程序中采用它将是简单直接的。和往常使用 Netty 一样,你可以完全使用该协议,而无需关心它内部的实现细节。我们将通过创建一个基于 WebSocket 的实时聊天应用程序来演示这一点。

## 示例程序

为了让示例应用程序展示它的实时功能, 我 们 将通过使用 WebSocket 协议来实现一个基于浏览器的聊天应用程序,就像你可能在 Facebook 的文本消息功能中见到过的那样。我们将通过使得多个用户之间可以同时进行相互通信,从而更进一步。 
图 12-1 说明了该应用程序的逻辑: 

​	(1)客户端发送一个消息; 

​	(2)该消息将被广播到所有其他连接的客户端。

<img src="/Netty实战_page_185_1.png" alt="图 12-1  WebSocket 应用程序逻辑" style="zoom:20%;" />

<TableCaption title='图 12-1  WebSocket 应用程序逻辑' />

这正如你可能会预期的一个聊天室应当的工作方式: 所有的人都可以和其他的人聊天。 在示例中,我们将只实现服务器端,而客户端则是通过 Web 页面访问该聊天室的浏览器。正如同你将在接下来的几页中所看到的,WebSocket 简化了编写这样的服务器的过程。

## 添加WebSocket支持

在从标准的HTTP或者HTTPS协议切换到WebSocket时,将会使用一种称为升级握手[^2]的机制。因此,使用WebSocket的应用程序将始终以HTTP/S作为开始,然后再执行升级。这个升级动作发生的确切时刻特定于应用程序; 它可能会发生在启动时, 也可能会发生在请求了某个特定的URL之后。 

我们的应用程序将采用下面的约定:如果被请求的 URL 以/ws 结尾,那么我们将会把该协议升级为 WebSocket;否则,服务器将使用基本的 HTTP/S。在连接已经升级完成之后,所有数据都将会使用 WebSocket 进行传输。图 12-2 说明了该服务器逻辑,一如在 Netty 中一样,它由一组 ChannelHandler 实现。我们将会在下一节中,解释用于处理 HTTP 以及 WebSocket 协议的技术时,描述它们。

<img src="/Netty实战_page_186_1.png" alt="图 12-2  服务器逻辑" style="zoom:15%;" />

### 处理HTTP请求

首先, 我们将实现该处理 HTTP 请求的组件。 这个组件将提供用于访问聊天室并显示由连接的客户端发送的消息的网页。代码清单 12-1 给出了这个 HttpRequestHandler 对应的代码, 其扩展了 SimpleChannelInboundHandler 以处理 FullHttpRequest 消息。需要注意的是,channelRead0()方法的实现是如何转发任何目标 URI 为/ws 的请求的。

```java [代码清单 12-1  HTTPRequestHandler]
public class HttpRequestHandler extends SimpleChannelInboundHandler < FullHttpRequest > {
    private final String wsUri;
    private static final File INDEX;
    static {
        URL location = HttpRequestHandler.class.getProtectionDomain().getCodeSource().getLocation();
        try {
            String path = location.toURI() + "index.html";
            path = !path.contains("file:") ? path : path.substring(5);
            INDEX = new File(path);
        } catch (URISyntaxException e) {
            throw new IllegalStateException("Unable to locate index.html", e);
        }
    }
    public HttpRequestHandler(String wsUri) {
        this.wsUri = wsUri;
    }
    @Override
    public void channelRead0(ChannelHandlerContext ctx, FullHttpRequest request) throws Exception {
        if (wsUri.equalsIgnoreCase(request.getUri())) {❶
            ctx.fireChannelRead(request.retain());
        } else {
            if (HttpHeaders.is100ContinueExpected(request)) {❷
                send100Continue(ctx);
            }
            RandomAccessFile file = new RandomAccessFile(INDEX, "r");
            HttpResponse response = new DefaultHttpResponse(request.getProtocolVersion(), HttpResponseStatus.OK);
            response.headers().set(HttpHeaders.Names.CONTENT_TYPE, "text/plain; charset=UTF-8");
            boolean keepAlive = HttpHeaders.isKeepAlive(request);
            if (keepAlive) {
                response.headers().set(HttpHeaders.Names.CONTENT_LENGTH, file.length());
                response.headers().set(HttpHeaders.Names.CONNECTION, HttpHeaders.Values.KEEP_ALIVE);
            }
            ctx.write(response);❸
            if (ctx.pipeline().get(SslHandler.class) == null) {❹
                ctx.write(new DefaultFileRegion(file.getChannel(), 0, file.length()));
            } else {
                ctx.write(new ChunkedNioFile(file.getChannel()));
            }
            ChannelFuture future = ctx.writeAndFlush(LastHttpContent.EMPTY_LAST_CONTENT);❺
            if (!keepAlive) {❻
                future.addListener(ChannelFutureListener.CLOSE);
            }
        }
    }
    private static void send100Continue(ChannelHandlerContext ctx) {
        FullHttpResponse response = new DefaultFullHttpResponse(HttpVersion.HTTP_1_1, HttpResponseStatus.CONTINUE);
        ctx.writeAndFlush(response);
    }
    @Override
    public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) throws Exception {
        cause.printStackTrace();
        ctx.close();
    }
}
```

如果该 HTTP 请求指向了地址为/ws 的 URI,那么HttpRequestHandler 将调用FullHttpRequest 对象上的retain()方法, 并通过调用fireChannelRead(msg)方法将它转发给下一个ChannelInboundHandler ❶。 之所以需要调用 retain()方法, 是因为调用channelRead() 方法完成之后,它将调用FullHttpRequest 对象上的 release()方法以释放它的资源。 (参见我们在第 6 章中对于 SimpleChannelInboundHandler 的讨论。 ) 

如果客户端发送了 HTTP 1.1 的 HTTP 头信息 Expect: 100-continue,那么 HttpRequestHandler 将会发送一个 100 Continue ❷响应。 在该 HTTP 头信息被设置之后, HttpRequestHandler 将 会 写回一 个 HttpResponse ❸给客户端。 这不是 一 个 FullHttpResponse,因为它只是响应的第一个部分。此外,这里也不会调用 writeAndFlush()方法, 在结束的时候才会调用。 

如果不需要加密和压缩,那么可以通过将 index.html ❹的内容存储到 DefaultFileRegion中来达到最佳效率。 这将会利用零拷贝特性来进行内容的传输。 为此, 你可以检查一下, 是否有 SslHandler 存在于在 ChannelPipeline 中。 否则, 你可以使用 ChunkedNioFile。  

HttpRequestHandler 将写一个 LastHttpContent❺ 来标记响应的结束。如果没有请求 keep-alive ❻,那么 HttpRequestHandler 将会添加一个 ChannelFutureListener 到最后一次写出动作的ChannelFuture, 并关闭该连接。 在这里, 你将调用writeAndFlush() 方法以冲刷所有之前写入的消息。 

这部分代码代表了聊天服务器的第一个部分,它管理纯粹的 HTTP 请求和响应。接下来,我们将处理传输实际聊天消息的 WebSocket 帧。

:::tip WEBSOCKET帧  

WebSocket 以帧的方式传输数据, 每一帧代表消息的一部分。 一个完整的消息可能会包含许多帧。

:::

### 处理WebSocket帧

由 IETF 发布的 WebSocket RFC, 定义 了 6 种帧, Netty 为它们每种都提供了一个 POJO 实现。
表 12-1 列出了这些帧类型,并描述了它们的用法。

<TableCaption title='表 12-1  WebSocketFrame的类型' />
|帧  类  型 |描    述 |
|--|--|
|BinaryWebSocketFrame| 包含了二进制数据 |
|TextWebSocketFrame |包含了文本数据 |
|ContinuationWebSocketFrame |包含属于上一个BinaryWebSocketFrame或TextWebSocketFrame的文本数据或者二进制数据 |
|CloseWebSocketFrame |表示一个CLOSE请求,包含一个关闭的状态码和关闭的原因 |
|PingWebSocketFrame |请求传输一个PongWebSocketFrame|
|PongWebSocketFrame |作为一个对于PingWebSocketFrame的响应被发送|

我们的聊天应用程序将使用下面几种帧类型: 

*   CloseWebSocketFrame; 
*   PingWebSocketFrame; 
*   PongWebSocketFrame; 
*   TextWebSocketFrame。 

TextWebSocketFrame 是我们唯一真正需要处理的帧类型。为了符合 WebSocket RFC, Netty 提供了 WebSocketServerProtocolHandler 来处理其他类型的帧。 
代码清单 12-2 展示了我们用于处理TextWebSocketFrame 的ChannelInboundHandler, 其还将在它的ChannelGroup 中跟踪所有活动的 WebSocket 连接。

```java [代码清单 12-2  处理文本帧]
public class TextWebSocketFrameHandler extends SimpleChannelInboundHandler < TextWebSocketFrame > {
    private final ChannelGroup group;
    public TextWebSocketFrameHandler(ChannelGroup group) {
        this.group = group;
    }
    @Override
    public void userEventTriggered(ChannelHandlerContext ctx, Object evt) throws Exception {
        if (evt == WebSocketServerProtocolHandler.ServerHandshakeStateEvent.HANDSHAKE_COMPLETE) {
            ctx.pipeline().remove(HttpRequestHandler.class);
            group.writeAndFlush(new TextWebSocketFrame("Client " + ctx.channel() + " joined"));❶
            group.add(ctx.channel());❷
        } else {
            super.userEventTriggered(ctx, evt);
        }
    }
    @Override
    public void channelRead0(ChannelHandlerContext ctx, TextWebSocketFrame msg) throws Exception {
        group.writeAndFlush(msg.retain());❸
    }
}
```

TextWebSocketFrameHandler 只有一组非常少量的责任。当和新客户端的 WebSocket 握手成功完成之后❶,它将通过把通知消息写到 ChannelGroup 中的所有 Channel 来通知所有已经连接的客户端,然后它将把这个新 Channel 加入到该 ChannelGroup 中❷。 

如果接收到了 TextWebSocketFrame 消息❸,TextWebSocketFrameHandler 将调用TextWebSocketFrame 消息上的 retain()方法,并使用 writeAndFlush()方法来将它传输给 ChannelGroup,以便所有已经连接的 WebSocket Channel 都将接收到它。 

和之前一样,对于retain()方法的调用是必需的,因为当channelRead0()方法返回时, TextWebSocketFrame 的引用计数将会被减少。 由于所有的操作都是异步的, 因此, writeAndFlush()方法可能会在 channelRead0()方法返回之后完成, 而且它绝对不能访问一个已经失效的引用。 

因为 Netty 在内部处理了大部分剩下的功能, 所以现在剩下唯一需要做的事情就是为每个新创建的Channel 初始化其ChannelPipeline。为此,我们将需要一个ChannelInitializer。

### 初始化ChannelPipeline

正如你已经学习到的,为了将 ChannelHandler 安装到 ChannelPipeline 中,你扩展了 ChannelInitializer,并实现了 initChannel()方法。代码清单 12-3 展示了由此生成的 ChatServerInitializer 的代码。

```java [代码清单 12-3  初始化 ChannelPipeline]
public class ChatServerInitializer extends ChannelInitializer < Channel > {
    private final ChannelGroup group;
    public ChatServerInitializer(ChannelGroup group) {
        this.group = group;
    }
    @Override
    protected void initChannel(Channel ch) throws Exception {
        ChannelPipeline pipeline = ch.pipeline();
        pipeline.addLast(new HttpServerCodec());
        pipeline.addLast(new ChunkedWriteHandler());
        pipeline.addLast(new HttpObjectAggregator(64 * 1024));
        pipeline.addLast(new HttpRequestHandler("/ws"));
        pipeline.addLast(new WebSocketServerProtocolHandler("/ws"));
        pipeline.addLast(new TextWebSocketFrameHandler(group));
    }
}
```

对于 initChannel()方法的调用, 通过安装所有必需的 ChannelHandler 来设置该新注册的 Channel 的 ChannelPipeline。 这些 ChannelHandler 以及它们各自的职责都被总结在了表 12-2 中。

表 12-2  基于 WebSocket 聊天服务器的ChannelHandler

|ChannelHandler| 职    责 |
|--|--|
|HttpServerCodec| 将字节解码为HttpRequest、 HttpContent和LastHttpContent。并将 HttpRequest、HttpContent 和 LastHttpContent编码为字节 |
|ChunkedWriteHandler |写入一个文件的内容 |
|HttpObjectAggregator| 将一个HttpMessage和跟随它的多个HttpContent聚合为单个FullHttpRequest或者FullHttpResponse (取决于它是被用来处理请求还是响应) 。安装了这个之后, ChannelPipeline中的下一个ChannelHandler将只会收到完整的 HTTP 请求或响应 |
|HttpRequestHandler| 处理FullHttpRequest(那些不发送到/ws URI 的请求)  |
|WebSocketServerProtocolHandler |按照 WebSocket 规范的要求,处理 WebSocket 升级握手、PingWebSocketFrame 、 PongWebSocketFrame 和CloseWebSocketFrame |
|TextWebSocketFrameHandler |处理TextWebSocketFrame和握手完成事件|

Netty 的 WebSocketServerProtocolHandler 处理了所有委托管理的 WebSocket 帧类型以及升级握手本身。 如果握手成功, 那么所需的ChannelHandler 将会被添加到ChannelPipeline 中,而那些不再需要的ChannelHandler 则将会被移除。

:::tip 

WebSocket 协议升级之前的 ChannelPipeline 的状态如图 12-3 所示。这代表了刚刚被ChatServerInitializer 初始化之后的 ChannelPipeline。

:::

<img src="/Netty实战_page_192_1.png" alt="图 12-3  WebSocket 协议升级之前的 ChannelPipeline" style="zoom:20%;" />

当 WebSocket 协议升级完成之后,WebSocketServerProtocolHandler 将会把 HttpRequestDecoder 替换为 WebSocketFrameDecoder,把 HttpResponseEncoder 替换为WebSocketFrameEncoder。为了性能最大化,它将移除任何不再被 WebSocket 连接所需要的ChannelHandler。这也包括了图 12-3 所示的 HttpObjectAggregator 和 HttpRequestHandler。 
图 12-4 展示了这些操作完成之后的ChannelPipeline。 需要注意的是, Netty目前支持 4 个版本的WebSocket协议,它们每个都具有自己的实现类。Netty将会根据客户端(这里指浏览器)所支持的版本[^3],自动地选择正确版本的WebSocketFrameDecoder和WebSocketFrameEncoder。

<img src="/Netty实战_page_192_2.png" alt="图 12-4  WebSocket 协议升级完成之后的 ChannelPipeline" style="zoom:20%;" />

### 引导

这幅拼图最后的一部分是引导该服务器, 并安装 ChatServerInitializer 的代码。 这将由 ChatServer 类处理,如代码清单 12-4 所示。

```java [代码清单 12-4  引导服务器]
public class ChatServer {
    private final ChannelGroup channelGroup = new DefaultChannelGroup(ImmediateEventExecutor.INSTANCE);
    private final EventLoopGroup group = new NioEventLoopGroup();
    private Channel channel;
    public ChannelFuture start(InetSocketAddress address) {
        ServerBootstrap bootstrap = new ServerBootstrap();
        bootstrap.group(group).channel(NioServerSocketChannel.class).childHandler(createInitializer(channelGroup));
        ChannelFuture future = bootstrap.bind(address);
        future.syncUninterruptibly();
        channel = future.channel();
        return future;
    }
    protected ChannelInitializer < Channel > createInitializer(ChannelGroup group) {
        return new ChatServerInitializer(group);
    }
    public void destroy() {
        if (channel != null) {
            channel.close();
        }
        channelGroup.close();
        group.shutdownGracefully();
    }
    public static void main(String[] args) throws Exception {
        if (args.length != 1) {
            System.err.println("Please give port as argument");
            System.exit(1);
        }
        int port = Integer.parseInt(args[0]);
        final ChatServer endpoint = new ChatServer();
        ChannelFuture future = endpoint.start(new InetSocketAddress(port));
        Runtime.getRuntime().addShutdownHook(new Thread() {
            @Override
            public void run() {
                endpoint.destroy();
            }
        });
        future.channel().closeFuture().syncUninterruptibly();
    }
}
```

## 测试应用程序

目录 chapter12 中的示例代码包含了你需要用来构建并运行该服务器的所有资源。 (如果你还没有设置好你的包括 Apache Maven 在内的开发环境,参见第 2 章中的操作说明。 ) 我们将使用下面的 Maven 命令来构建和启动服务器:  

```sh [mvn]
mvn -PChatServer clean package exec:exec 
```


项目文件 pom.xml 被配置为在端口 9999 上启动服务器。如果要使用不同的端口,可以通过编辑文件中对应的值,或者使用一个 System 属性来对它进行重写:  

```sh [mvn]
mvn -PChatServer -Dport=1111 clean package exec:exec
```

你通过将自己的浏览器指向 http://localhost:9999 来访问该应用程序。图 12-5 展示了其在Chrome 浏览器中的 UI。 

图中展示了两个已经连接的客户端。 第一个客户端是使用上面的界面连接的, 第二个客户端则是通过底部的 Chrome 浏览器的命令行工具连接的。你会注意到,两个客户端都发送了消息, 并且每个消息都显示在两个客户端中。 

这是一个非常简单的演示,演示了 WebSocket 如何在浏览器中实现实时通信。

<img src="/Netty实战_page_195_2.png" alt="图 12-5  基于 WebSocket 的 ChatServer 的演示" style="zoom:25%;" />

### 如何进行加密

在真实世界的场景中,你将很快就会被要求向该服务器添加加密。使用 Netty,这不过是将一个 SslHandler 添加到 ChannelPipeline 中,并配置它的问题。代码清单 12-6 展示了如何通过扩展我们的ChatServerInitializer来创建一个SecureChatServerInitializer以完成这个需求。

::: code-group

```java [代码清单 12-6  为 ChannelPipeline 添加加密]
public class SecureChatServerInitializer extends ChatServerInitializer {
    private final SslContext context;
    public SecureChatServerInitializer(ChannelGroup group, SslContext context) {
        super(group);
        this.context = context;
    }
    @Override
    protected void initChannel(Channel ch) throws Exception {
        super.initChannel(ch);
        SSLEng.ine engine = context.newEngine(ch.alloc());
        engine.setUseClientMode(false);
        ch.pipeline().addFirst(new SslHandler(engine));
    }
}
```

```java [代码清单 12-7  向 ChatServer 添加加密]
public class SecureChatServer extends ChatServer {
    private final SslContext context;
    public SecureChatServer(SslContext context) {
        this.context = context;
    }
    @Override
    protected ChannelInitializer < Channel > createInitializer(ChannelGroup group) {
        return new SecureChatServerInitializer(group, context);
    }
    public static void main(String[] args) throws Exception {
        if (args.length != 1) {
            System.err.println("Please give port as argument");
            System.exit(1);
        }
        int port = Integer.parseInt(args[0]);
        SelfSignedCertificate cert = new SelfSignedCertificate();
        SslContext context = SslContext.newServerContext(cert.certificate(), cert.privateKey());
        final SecureChatServer endpoint = new SecureChatServer(context);
        ChannelFuture future = endpoint.start(new InetSocketAddress(port));
        Runtime.getRuntime().addShutdownHook(new Thread() {
            @Override
            public void run() {
                endpoint.destroy();
            }
        });
        future.channel().closeFuture().syncUninterruptibly();
    }
}
```

:::

最后一步是调整ChatServer以使用SecureChatServerInitializer, 以便在ChannelPipeline 中安装SslHandler。这给了我们代码清单 12-7 中所展示的SecureChatServer。

这就是为所有的通信启用 SSL/TLS 加密需要做的全部。 和之前一样, 可以使用 Apache Maven 来运行该应用程序,如代码清单 12-8 所示。它还将检索任何所需的依赖。

[^1]:IETF RFC 6455, The WebSocket Protocol: http://tools.ietf.org/html/rfc6455。
[^2]:Mozilla 开发者网络, “Protocol upgrade mechanism” :https://developer.mozilla.org/en-US/docs/HTTP/ Protocol_upgrade_mechanism。
[^3]:在这个例子中,我们假设使用了 13 版的 WebSocket 协议,所以图中展示的是 WebSocketFrameDecoder13 和 WebSocketFrameEncoder13。

---
typora-copy-images-to: ../../public
typora-root-url: /Volumes/硬盘/Code/docs/docs/public
---

## 通过SSL/TLS保护Netty应用程序

如今, 数据隐私是一个非常值得关注的问题, 作为开发人员, 我们需要准备好应对它。 至少, 我们应该熟悉像SSL和TLS [^1]。 这样的安全协议,它们层叠在其他协议之上,用以实现数据安全。我们在访问安全网站时遇到过这些协议,但是它们也可用于其他不是基于HTTP的应用程序,如安全SMTP(SMTPS)邮件服务器甚至是关系型数据库系统。

为了支持 SSL/TLS,Java 提供了 javax.net.ssl 包,它的 SSLContext 和 SSLEngine 类使得实现解密和加密相当简单直接。Netty 通过一个名为 SslHandler 的 ChannelHandler 实现利用了这个 API,其中 SslHandler 在内部使用 SSLEngine 来完成实际的工作。 
图 11-1 展示了使用 SslHandler 的数据流

:::tip Netty 的 OpenSSL/SSLEngine 实现

Netty 还提供了使用 OpenSSL 工具包(www.openssl.org)的 SSLEngine 实现。这个 OpenSslEngine 类提供了比 JDK 提供的 SSLEngine 实现更好的性能。 

如果OpenSSL库可用, 可以将 Netty 应用程序 (客户端和服务器) 配置为默认使用OpenSslEngine。
如果不可用,Netty 将会回退到 JDK 实现。有关配置 OpenSSL 支持的详细说明,参见 Netty 文档: http://netty.io/wiki/forked-tomcat-native.html#wikih2-1。 

注意,无论你使用 JDK 的 SSLEngine 还是使用 Netty 的 OpenSslEngine,SSL API 和数据流都是一致的。

:::

<img src="/Netty实战_page_162_3.png" alt="Netty实战_page_162_3" style="zoom:20%;" />

<TableCaption title='图 11-1  通过 SslHandler 进行解密和加密的数据流' />

代码清单11-1展示了如何使用ChannelInitializer来将SslHandler添加到ChannelPipeline 中。回想一下,ChannelInitializer 用于在 Channel 注册好时设置 ChannelPipeline。

```java [代码清单 11-1  添加 SSL/TLS 支持]
public class SslChannelInitializer extends ChannelInitializer < Channel > {
    private final SslContext context;
    private final boolean startTls;
    public SslChannelInitializer(SslContext context, boolean startTls) {
        this.context = context;
        this.startTls = startTls;
    }
    @Override 
    protected void initChannel(Channel ch) throws Exception {
        SSLEngine engine = context.newEngine(ch.alloc());
        ch.pipeline().addFirst("ssl", new SslHandler(engine, startTls));
    }
}
```

在大多数情况下, SslHandler 将是 ChannelPipeline 中的第一个 ChannelHandler。这确保了只有在所有其他的 ChannelHandler 将它们的逻辑应用到数据之后,才会进行加密。  

SslHandler 具有一些有用的方法,如表 11-1 所示。例如,在握手阶段,两个节点将相互验证并且商定一种加密方式。你可以通过配置 SslHandler 来修改它的行为,或者在 SSL/TLS 握手一旦完成之后提供通知,握手阶段完成之后,所有的数据都将会被加密。SSL/TLS 握手将会被自动执行。

<TableCaption title='表 11-1  SslHandler的方法' />

| 方 法 名 称                                                  | 描    述                                                     |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| setHandshakeTimeout (long,TimeUnit)<br/>setHandshakeTimeoutMillis (long)<br/>getHandshakeTimeoutMillis() | 设置和获取超时时间,超时之后,握手ChannelFuture将会被通知失败  |
| setCloseNotifyTimeout(long,TimeUnit)<br/>setCloseNotifyTimeoutMillis(long)<br/>getCloseNotifyTimeoutMillis() | 设置和获取超时时间,超时之后,将会触发一个关闭通知并关闭连接。 这也将会导致通知该ChannelFuture失败 |
| handshakeFuture()                                            | 返回一个在握手完成后将会得到通知的ChannelFuture。如果握手先前已经执行过了, 则返回一个包含了先前的握手结果的ChannelFuture |
| close()<br/>close(ChannelPromise)<br/>close(ChannelHandlerContext,ChannelPromise) | 发送close_notify以请求关闭并销毁底层的SslEngine              |

## 构建基于Netty的HTTP/HTTPS应用程序

HTTP/HTTPS 是最常见的协议套件之一,并且随着智能手机的成功,它的应用也日益广泛。 这些协议也被用于其他方面。许多组织导出的用于和他们的商业合作伙伴通信的 WebService API 一般也是基于HTTP(S)的。 

接下来,我们来看看 Netty 提供的 ChannelHandler,你可以用它来处理 HTTP 和 HTTPS 协议,而不必编写自定义的编解码器。

### HTTP解码器、编码器和编解码器

HTTP 是基于请求/响应模式的: 客户端向服务器发送一个 HTTP 请求, 然后服务器将会返回一个 HTTP 响应。Netty 提供了多种编码器和解码器以简化对这个协议的使用。图 11-2 和图 11-3 分别展示了生产和消费 HTTP 请求和 HTTP 响应的方法。

<img src="/Netty实战_page_164_1.png" alt="Netty实战_page_164_1" style="zoom:20%;" />

<TableCaption title='图 11-2  HTTP 请求的组成部分' />

<img src="/Netty实战_page_164_2.png" alt="Netty实战_page_164_2" style="zoom:20%;" />

<TableCaption title='图 11-3  HTTP 响应的组成部分' />

如图 11-2 和图 11-3 所示,一个 HTTP 请求/响应可能由多个数据部分组成,并且它总是以一个 LastHttpContent 部分作为结束。FullHttpRequest 和 FullHttpResponse 消息是特殊的子类型,分别代表了完整的请求和响应。所有类型的 HTTP 消息(FullHttpRequest、LastHttpContent 以及代码清单 11-2 中展示的那些)都实现了 HttpObject 接口。 
表 11-2 概要地介绍了处理和生成这些消息的 HTTP 解码器和编码器。

<TableCaption title='表 11-2  HTTP 解码器和编码器' />

| 名    称            | 描    述                                                   |
| ------------------- | ---------------------------------------------------------- |
| HttpRequestEncoder  | 将HttpRequest、HttpContent和LastHttpContent消息编码为字节  |
| HttpResponseEncoder | 将HttpResponse、HttpContent和LastHttpContent消息编码为字节 |
| HttpRequestDecoder  | 将字节解码为HttpRequest、HttpContent和LastHttpContent消息  |
| HttpResponseDecoder | 将字节解码为HttpResponse、HttpContent和LastHttpContent消息 |

代码清单 11-2 中的 HttpPipelineInitializer 类展示了将 HTTP 支持添加到你的应用程序是多么简单—几乎只需要将正确的 ChannelHandler 添加到 ChannelPipeline 中。

```java [代码清单 11-2  添加 HTTP 支持]
public class HttpPipelineInitializer extends ChannelInitializer < Channel > {
    private final boolean client;
    public HttpPipelineInitializer(boolean client) {
        this.client = client;
    }
    @Override 
  	protected void initChannel(Channel ch) throws Exception {
        ChannelPipeline pipeline = ch.pipeline();
        if (client) {
            pipeline.addLast("decoder", new HttpResponseDecoder()); //如果是客户端,则添加 HttpResponseDecoder 以 处理来自服务器的响应
            pipeline.addLast("encoder", new HttpRequestEncoder()); // 如果是客户端,则添加 HttpRequestEncoder 以向服务器发送请求
        } else {
            pipeline.addLast("decoder", new HttpRequestDecoder()); // 如果是服务器,则添加 HttpRequestDecoder 以接收来自客户端的请求
            pipeline.addLast("encoder", new HttpResponseEncoder()); // 如果是服务器, 则添加 HttpResponseEncoder 以向客户端发送响应
        }
    }
}
```

### 聚合HTTP消息

在 ChannelInitializer 将 ChannelHandler 安装到 ChannelPipeline 中之后,你便可以处理不同类型的 HttpObject 消息了。但是由于 HTTP 的请求和响应可能由许多部分组成,因此你需要聚合它们以形成完整的消息。为了消除这项繁琐的任务,Netty 提供了一个聚合器,它可以将多个消息部分合并为 FullHttpRequest 或者 FullHttpResponse 消息。通过这样的方式,你将总是看到完整的消息内容。 

由于消息分段需要被缓冲,直到可以转发一个完整的消息给下一个 ChannelInboundHandler,所以这个操作有轻微的开销。其所带来的好处便是你不必关心消息碎片了。 

引入这种自动聚合机制只不过是向 ChannelPipeline 中添加另外一个 ChannelHandler 罢了。代码清单 11-3 展示了如何做到这一点。

```java
public class HttpAggregatorInitializer extends ChannelInitializer < Channel > {
    private final boolean isClient;
  	public HttpAggregatorInitializer(boolean isClient) {
        this.isClient = isClient;
    }
    @Override 
  	protected void initChannel(Channel ch) throws Exception {
        ChannelPipeline pipeline = ch.pipeline();
        if (isClient) {
            pipeline.addLast("codec", new HttpClientCodec()); // 如果是客户端, 则添加 HttpClientCodec
        } else {
            pipeline.addLast("codec", new HttpServerCodec()); // 如果是服务器,则添 加 HttpServerCodec
        }
        pipeline.addLast("aggregator", new HttpObjectAggregator(512 * 1024)); // 将最大的消息大小为 512 KB 的 HttpObjectAggregator 添加 到 ChannelPipeline
    }
}
```



### HTTP压缩

当使用 HTTP 时, 建议开启压缩功能以尽可能多地减小传输数据的大小。 虽然压缩会带来一些 CPU 时钟周期上的开销,但是通常来说它都是一个好主意,特别是对于文本数据来说。 
Netty 为压缩和解压缩提供了 ChannelHandler 实现, 它们同时支持 gzip 和 deflate 编码。

:::tip HTTP 请求的头部信息

客户端可以通过提供以下头部信息来指示服务器它所支持的压缩格式:   

>   GET /encrypted-area HTTP/1.1 Host: www.example.com Accept-Encoding: gzip, deflate  

然而,需要注意的是,服务器没有义务压缩它所发送的数据。

:::

代码清单 11-4 展示了一个例子。

```java [代码清单 11-4  自动压缩 HTTP 消息]
public class HttpCompressionInitializer extends ChannelInitializer < Channel > {
    private final boolean isClient;
  	public HttpCompressionInitializer(boolean isClient) {
        this.isClient = isClient;
    }
    @Override 
  	protected void initChannel(Channel ch) throws Exception {
        ChannelPipeline pipeline = ch.pipeline();
        if (isClient) {
            pipeline.addLast("codec", new HttpClientCodec());
            pipeline.addLast("decompressor", new HttpContentDecompressor()); // 如果是客户端,则添加 HttpContentDecompressor 以 处理来自服务器的压缩内容
        } else {
            pipeline.addLast("codec", new HttpServerCodec());
            pipeline.addLast("compressor", new HttpContentCompressor()); // 如果是服务器,则添加HttpContentCompressor 来压缩数据(如果客户端支持它)
        }
    }
}
```

::: tip 压缩及其依赖

如果你正在使用的是 JDK 6 或者更早的版本,那么你需要将 JZlib(www.jcraft.com/jzlib/)添加到CLASSPATH 中以支持压缩功能。 
对于 Maven,请添加以下依赖项:   

```xml
<dependency>
    <groupId>com.jcraft</groupId>
    <artifactId>jzlib</artifactId>
    <version>1.1.3</version>
</dependency>
```

:::

### 使用HTTPS

代码清单 11-5 显示,启用 HTTPS 只需要将 SslHandler 添加到 ChannelPipeline 的ChannelHandler 组合中。

```java [代码清单 11-5  使用 HTTPS] {12}
public class HttpsCodecInitializer extends ChannelInitializer < Channel > {
    private final SslContext context;
  	private final boolean isClient;
  	public HttpsCodecInitializer(SslContext context, boolean isClient) {
        this.context = context;
        this.isClient = isClient;
    }
    @Override
  	protected void initChannel(Channel ch) throws Exception {
        ChannelPipeline pipeline = ch.pipeline();
        SSLEngine engine = context.newEngine(ch.alloc());
        pipeline.addFirst("ssl", new SslHandler(engine)); // 将 SslHandler 添加到ChannelPipeline 中以使用 HTTPS
        if (isClient) {
            pipeline.addLast("codec", new HttpClientCodec());
        } else {
            pipeline.addLast("codec", new HttpServerCodec());
        }
    }
}
```

前面的代码是一个很好的例子, 说明了 Netty 的架构方式是如何将代码重用变为杠杆作用的。
只需要简单地将一个 ChannelHandler 添加到 ChannelPipeline 中,便可以提供一项新功能,甚至像加密这样重要的功能都能提供。

### WebSocket

Netty 针对基于 HTTP 的应用程序的广泛工具包中包括了对它的一些最先进的特性的支持。在这一节中,我们将探讨 WebSocket ——一种在 2011 年被互联网工程任务组(IETF)标准化的协议。 

WebSocket解决了一个长期存在的问题:既然底层的协议(HTTP)是一个请求/响应模式的交互序列,那么如何实时地发布信息呢?AJAX提供了一定程度上的改善,但是数据流仍然是由客户端所发送的请求驱动的。还有其他的一些或多或少的取巧方式[^2],但是最终它们仍然属于扩展性受限的变通之法。

WebSocket规范以及它的实现代表了对一种更加有效的解决方案的尝试。简单地说, WebSocket提供了“在一个单个的TCP连接上提供双向的通信……结合WebSocket API……它为网页和远程服务器之间的双向通信提供了一种替代HTTP轮询的方案。 ”[^3]。

也就是说,<mark>WebSocket 在客户端和服务器之间提供了真正的双向数据交换</mark>。我们不会深入地描述太多的内部细节,但是我们还是应该提到,尽管最早的实现仅限于文本数据,但是现在已经不是问题了;WebSocket 现在可以用于传输任意类型的数据,很像普通的套接字。 

图 11-4 给出了 WebSocket 协议的一般概念。在这个场景下,通信将作为普通的 HTTP 协议开始,随后升级到双向的 WebSocket 协议。 

要想向你的应用程序中添加对于 WebSocket 的支持,你需要将适当的客户端或者服务器WebSocket ChannelHandler 添加到 ChannelPipeline 中。 这个类将处理由 WebSocket 定义的称为帧的特殊消息类型。 如表 11-3 所示, WebSocketFrame 可以被归类为数据帧或者控制帧。

<img src="/Netty实战_page_169_1.png" alt="Netty实战_page_169_1" style="zoom:20%;" />

<TableCaption title='图 11-4  WebSocket 协议' />

<br/>

<TableCaption title='表 11-3  WebSocketFrame类型' />

| 名    称                   | 描    述                                                     |
| -------------------------- | ------------------------------------------------------------ |
| BinaryWebSocketFrame       | 数据帧:二进制数据                                            |
| TextWebSocketFrame         | 数据帧:文本数据                                              |
| ContinuationWebSocketFrame | 数据帧: 属于上一个BinaryWebSocketFrame或者TextWebSocketFrame的文本的或者二进制数据 |
| CloseWebSocketFrame        | 控制帧:一个CLOSE请求、关闭的状态码以及关闭的原因             |
| PingWebSocketFrame         | 控制帧:请求一个PongWebSocketFrame                            |
| PongWebSocketFrame         | 控制帧:对PingWebSocketFrame请求的响应                        |

因为Netty主要是一种服务器端的技术,所以在这里我们重点创建WebSocket服务器[^4]                           。代码清单 11-6 展示了一个使用WebSocketServerProtocolHandler的简单示例,这个类处理协议升级握手,以及 3 种控制帧——Close、Ping和Pong。Text和Binary数据帧将会被传递给下一个(由你实现的)ChannelHandler进行处理。

```java [代码清单 11-6  在服务器端支持 WebSocket]
public class WebSocketServerInitializer extends ChannelInitializer < Channel > {
    @Override
    protected void initChannel(Channel ch) throws Exception {
        ch.pipeline().addLast(
            new HttpServerCodec(),
            new HttpObjectAggregator(65536), // 为握手提供聚合的HttpRequest
            new WebSocketServerProtocolHandler("/websocket"), // 如果被请求 的端点是 "/websocket", 则处理该 升级握手
            new TextFrameHandler(), // TextFrameHandler 处理 TextWebSocketFrame
            new BinaryFrameHandler(), // BinaryFrameHandler 处理BinaryWebSocketFrame
            new ContinuationFrameHandler()); // ContinuationFrameHandler 处理 ContinuationWebSocketFrame
    }
    public static final class TextFrameHandler extends 
        SimpleChannelInboundHandler < TextWebSocketFrame > {
        @Override
        public void channelRead0(ChannelHandlerContext ctx, TextWebSocketFrame msg) throws Exception {
            // Handle text frame 
        }
    }
    public static final class BinaryFrameHandler extends 
        SimpleChannelInboundHandler < BinaryWebSocketFrame > {
        @Override
        public void channelRead0(ChannelHandlerContext ctx, BinaryWebSocketFrame msg) throws Exception {
            // Handle binary frame
        }
    }
    public static final class ContinuationFrameHandler extends 
        SimpleChannelInboundHandler < ContinuationWebSocketFrame > {
        @Override
        public void channelRead0(ChannelHandlerContext ctx, ContinuationWebSocketFrame msg) throws Exception {
            // Handle continuation frame
        }
    }
}
```

::: tip保护 WebSocket

要想为 WebSocket 添加安全性,只需要将 SslHandler 作为第一个 ChannelHandler 添加到ChannelPipeline 中。

:::

更加全面的示例参见[第 12 章](./12、WebSocket.md),那一章会深入探讨实时 WebSocket 应用程序的设计。

## 空闲的连接和超时

检测空闲连接以及超时对于及时释放资源来说是至关重要的。由于这是一项常见的任务, Netty 特地为它提供了几个 ChannelHandler 实现。表 11-4 给出了它们的概述。

<TableCaption title='表 11-4  用于空闲连接以及超时的ChannelHandler'/>

|      名    称       | 描    述                                                     |
| :-----------------: | ------------------------------------------------------------ |
|  IdleStateHandler   | 当连接空闲时间太长时,将会触发一个IdleStateEvent事件。然后, 你可以通过在你的 ChannelInboundHandler 中重写 userEventTriggered()方法来处理该IdleStateEvent事件 |
| ReadTimeoutHandler  | 如果在指定的时间间隔内没有收到任何的入站数据,则抛出一个 ReadTimeoutException 并关闭对应的 Channel。可以通 过重写你的ChannelHandler 中的 exceptionCaught()方法来检测该 ReadTimeoutException |
| WriteTimeoutHandler | 如果在指定的时间间隔内没有任何出站数据写入,则抛出一个 WriteTimeoutException 并 关 闭 对 应 的 Channel。 可 以 通 过 重 写 你 的ChannelHandler的exceptionCaught()方法检测该WriteTimeoutException |

让我们仔细看看在实践中使用得最多的 IdleStateHandler 吧。代码清单 11-7 展示了当使用通常的发送心跳消息到远程节点的方法时, 如果在 60 秒之内没有接收或者发送任何的数据, 我们将如何得到通知;如果没有响应,则连接会被关闭。

```java [代码清单 11-7  发送心跳]
public class IdleStateHandlerInitializer extends ChannelInitializer < Channel > {
    @Override 
  	protected void initChannel(Channel ch) throws Exception {
        ChannelPipeline pipeline = ch.pipeline();
        pipeline.addLast(new IdleStateHandler(0, 0, 60, TimeUnit.SECONDS)); // IdleStateHandler 将在被触发时发送一个IdleStateEvent 事件
        pipeline.addLast(new HeartbeatHandler());
    }
    public static final class HeartbeatHandler extends ChannelInboundHandlerAdapter {
        private static final ByteBuf HEARTBEAT_SEQUENCE = 
          Unpooled.unreleasableBuffer(Unpooled.copiedBuffer("HEARTBEAT", CharsetUtil.ISO_8859_1));
        @Override 
      	public void userEventTriggered(ChannelHandlerContext ctx, Object evt) throws Exception {
            if (evt instanceof IdleStateEvent) {
                ctx.writeAndFlush(HEARTBEAT_SEQUENCE.duplicate()).addListener(ChannelFutureListener.CLOSE_ON_FAILURE);
            } else {
                super.userEventTriggered(ctx, evt);
            }
        }
    }
}
```

这个示例演示了如何使用 IdleStateHandler 来测试远程节点是否仍然还活着, 并且在它失活时通过关闭连接来释放资源。 

如果连接超过 60 秒没有接收或者发送任何的数据,那么IdleStateHandler 将会使用一个IdleStateEvent 事件来调用fireUserEventTriggered()方法。HeartbeatHandler 实现了 userEventTriggered()方法,如果这个方法检测到 IdleStateEvent 事件,它将会发送心跳消息,并且添加一个将在发送操作失败时关闭该连接的ChannelFutureListener 。

## 解码基于分隔符的协议和基于长度的协议

在使用 Netty 的过程中,你将会遇到需要解码器的基于分隔符和帧长度的协议。下一节将解释 Netty 所提供的用于处理这些场景的实现。

### 基于分隔符的协议

基于分隔符的(delimited)消息协议使用定义的字符来标记的消息或者消息段(通常被称为帧) 的开头或者结尾。 由RFC文档正式定义的许多协议 (如SMTP、 POP3、 IMAP以及Telnet[^5]) 都是这样的。此外,当然,私有组织通常也拥有他们自己的专有格式。无论你使用什么样的协议,表 11-5 中列出的解码器都能帮助你定义可以提取由任意标记(token)序列分隔的帧的自定义解码器。

<TableCaption title='表 11-5  用于处理基于分隔符的协议和基于长度的协议的解码器'/>

| 名    称                   | 描    述                                                     |
| -------------------------- | ------------------------------------------------------------ |
| DelimiterBasedFrameDecoder | 使用任何由用户提供的分隔符来提取帧的通用解码器               |
| LineBasedFrameDecoder      | 提取由行尾符(\n或者\r\n)分隔的帧的解码器。这个解码器比DelimiterBasedFrameDecoder更快 |

图 11-5 展示了当帧由行尾序列\r\n(回车符+换行符)分隔时是如何被处理的。

<img src="/Netty实战_page_173_2.png" alt="图 11-5  由行尾符分隔的帧" style="zoom:25%;" />

<TableCaption title='图 11-5  由行尾符分隔的帧'/>

如果你正在使用除了行尾符之外的分隔符分隔的帧,那么你可以以类似的方式使用DelimiterBasedFrameDecoder,只需要将特定的分隔符序列指定到其构造函数即可。 

这些解码器是实现你自己的基于分隔符的协议的工具。作为示例,我们将使用下面的协议规范:

*   传入数据流是一系列的帧,每个帧都由换行符(\n)分隔;
*   每个帧都由一系列的元素组成,每个元素都由单个空格字符分隔;
*   一个帧的内容代表一个命令,定义为一个命令名称后跟着数目可变的参数。 
    我们用于这个协议的自定义解码器将定义以下类:
*   Cmd—将帧(命令)的内容存储在 ByteBuf 中,一个 ByteBuf 用于名称,另一个用于参数; 
*   CmdDecoder—从被重写了的 decode()方法中获取一行字符串,并从它的内容构建一个 Cmd 的实例;
*   CmdHandler —从 CmdDecoder 获取解码的 Cmd 对象,并对它进行一些处理;
*   CmdHandlerInitializer —为了简便起见,我们将会把前面的这些类定义为专门的 ChannelInitializer 的嵌套类, 其将会把这些 ChannelInboundHandler 安装到 ChannelPipeline 中。

正如将在代码清单 11-9 中所能看到的那样,这个解码器的关键是扩展 LineBasedFrameDecoder。

```java [代码清单 11-9  使用 ChannelInitializer 安装解码器]
public class CmdHandlerInitializer extends ChannelInitializer < Channel > {
    final byte SPACE = (byte)' ';
    @Override
    protected void initChannel(Channel ch) throws Exception {
        ChannelPipeline pipeline = ch.pipeline();
        pipeline.addLast(new CmdDecoder(64 * 1024));
        pipeline.addLast(new CmdHandler());
    }
    public static final class Cmd {
        private final ByteBuf name;
        private final ByteBuf args;
        public Cmd(ByteBuf name, ByteBuf args) {
            this.name = name;
            this.args = args;
        }
        public ByteBuf name() {
            return name;
        }
        public ByteBuf args() {
            return args;
        }
    }
    public static final class CmdDecoder extends LineBasedFrameDecoder {
        public CmdDecoder(int maxLength) {
            super(maxLength);
        }
        @Override
        protected Object decode(ChannelHandlerContext ctx, ByteBuf buffer) throws Exception {
            ByteBuf frame = (ByteBuf) super.decode(ctx, buffer);
            if (frame == null) {
                return null;
            }
            int index = frame.indexOf(frame.readerIndex(), frame.writerIndex(), SPACE);
            return new Cmd(frame.slice(frame.readerIndex(), index), frame.slice(index + 1, frame.writerIndex()));
        }
    }
    public static final class CmdHandler extends SimpleChannelInboundHandler < Cmd > {
        @Override
        public void channelRead0(ChannelHandlerContext ctx, Cmd msg) throws Exception {
            // Do something with the command 
        }
    }
}
```



### 基于长度的协议

基于长度的协议通过将它的长度编码到帧的头部来定义帧, 而不是使用特殊的分隔符来标记它的结束。[^6]表 11-6 列出了Netty提供的用于处理这种类型的协议的两种解码器。

<TableCaption title='表 11-6  用于基于长度的协议的解码器'/>

| 名    称                     | 描    述                                                     |
| ---------------------------- | ------------------------------------------------------------ |
| FixedLengthFrameDecoder      | 提取在调用构造函数时指定的定长帧                             |
| LengthFieldBasedFrameDecoder | 根据编码进帧头部中的长度值提取帧; 该字段的偏移量以及长度在构造函数中指定 |

图 11-6 展示了 FixedLengthFrameDecoder 的功能,其在构造时已经指定了帧长度为 8 字节。

<img src="/Netty实战_page_175_1.png" alt="图 11-6  解码长度为 8 字节的帧" style="zoom:25%;" />

<TableCaption title='图 11-6  解码长度为 8 字节的帧'/>

你将经常会遇到被编码到消息头部的帧大小不是固定值的协议。 为了处理这种变长帧, 你可以使用 LengthFieldBasedFrameDecoder, 它将从头部字段确定帧长, 然后从数据流中提取指定的字节数。 

图 11-7 展示了一个示例,其中长度字段在帧中的偏移量为 0,并且长度为 2 字节。

<img src="/Netty实战_page_176_2.png" alt="图 11-7  将变长帧大小编码进头部的消息" style="zoom:20%;" />

<TableCaption title='图 11-7  将变长帧大小编码进头部的消息'/>

LengthFieldBasedFrameDecoder 提供了几个构造函数来支持各种各样的头部配置情况。 代码清单 11-10 展示了如何使用其 3 个构造参数分别为 maxFrameLength、 lengthFieldOffset 和 lengthFieldLength 的构造函数。 在这个场景中, 帧的长度被编码到了帧起始的前8 个字节中。

```java [代码清单 11-10  使用 LengthFieldBasedFrameDecoder 解码器基于长度的协议]
public class LengthBasedInitializer extends ChannelInitializer < Channel > {
    @Override
    protected void initChannel(Channel ch) throws Exception {
        ChannelPipeline pipeline = ch.pipeline();
        pipeline.addLast(new LengthFieldBasedFrameDecoder(64 * 1024, 0, 8));
        pipeline.addLast(new FrameHandler());
    }
    public static final class FrameHandler extends SimpleChannelInboundHandler < ByteBuf > {
        @Override
        public void channelRead0(ChannelHandlerContext ctx, ByteBuf msg) throws Exception {
            // Do something with the frame         
        }
    }
}
```



## 写大型数据

因为网络饱和的可能性, 如何在异步框架中高效地写大块的数据是一个特殊的问题。 由于写操作是非阻塞的,所以即使没有写出所有的数据,写操作也会在完成时返回并通知 ChannelFuture。当这种情况发生时,如果仍然不停地写入,就有内存耗尽的风险。所以在写大型数据时,需要准备好处理到远程节点的连接是慢速连接的情况,这种情况会导致内存释放的延迟。让我们考虑下将一个文件内容写出到网络的情况。 

在我们讨论传输([见 4.2 节](./4、传输.md#传输API))的过程中,提到了 NIO 的零拷贝特性,这种特性消除了将文件的内容从文件系统移动到网络栈的复制过程。所有的这一切都发生在 Netty 的核心中,所以应用程序所有需要做的就是使用一个 FileRegion 接口的实现, 其在 Netty 的 API 文档中的定义是: “通过支持零拷贝的文件传输的 Channel 来发送的文件区域。 ” 

代码清单 11-11 展示了如何通过从FileInputStream创建一个DefaultFileRegion, 并将其写入Channel[^7]，从而利用零拷贝特性来传输一个文件的内容。

```java [代码清单 11-11  使用 FileRegion 传输文件的内容]
FileInputStream in = new FileInputStream(file);
FileRegion region = new DefaultFileRegion(in.getChannel(), 0, file.length());
channel.writeAndFlush(region).addListener(new ChannelFutureListener() {
    @Override
    public void operationComplete(ChannelFuture future) throws Exception {
        if (!future.isSuccess()) {
            Throwable cause = future.cause();
            // Do something 
        }
    }
});
```

这个示例只适用于文件内容的直接传输, 不包括应用程序对数据的任何处理。 在需要将数据从文件系统复制到用户内存中时,可以使用 ChunkedWriteHandler,它支持异步写大型数据流,而又不会导致大量的内存消耗。 

关键是 `interface ChunkedInput<B>`,其中类型参数 B 是 readChunk()方法返回的类型。 Netty 预置了该接口的 4 个实现, 如表 11-7 中所列出的。 每个都代表了一个将由 ChunkedWriteHandler 处理的不定长度的数据流。 

代码清单 11-12 说明了 ChunkedStream 的用法, 它是实践中最常用的实现。 所示的类使用了一个 File 以及一个 SslContext 进行实例化。当 initChannel()方法被调用时,它将使用所示的 ChannelHandler 链初始化该 Channel。

表 11-7  ChunkedInput的实现

| 名    称 | 描    述 |
| -------- | -------- |
|ChunkedFile| 从文件中逐块获取数据,当你的平台不支持零拷贝或者你需要转换数据时使用 |
|ChunkedNioFile |和ChunkedFile类似,只是它使用了FileChannel |
|ChunkedStream| 从InputStream中逐块传输内容 |
|ChunkedNioStream| 从ReadableByteChannel中逐块传输内容|

当 Channel 的状态变为活动的时,WriteStreamHandler 将会逐块地把来自文件中的数据作为 ChunkedStream 写入。数据在传输之前将会由 SslHandler 加密。

```java [代码清单 11-12  使用 ChunkedStream 传输文件内容]
public class ChunkedWriteHandlerInitializer extends ChannelInitializer < Channel > {
        private final File file;private final SslContext sslCtx;
        public ChunkedWriteHandlerInitializer(File file, SslContext sslCtx) {
            this.file = file;
            this.sslCtx = sslCtx;
        }
        @Override
        protected void initChannel(Channel ch) throws Exception {
            ChannelPipeline pipeline = ch.pipeline();
            pipeline.addLast(new SslHandler(sslCtx.newEngine(ch.alloc());
                                           pipeline.addLast(new ChunkedWriteHandler());
                                      pipeline.addLast(new WriteStreamHandler());
                }
                public final class WriteStreamHandler extends ChannelInboundHandlerAdapter {
                    @Override
                    public void channelActive(ChannelHandlerContext ctx) throws Exception {
                        super.channelActive(ctx);
                        ctx.writeAndFlush(new ChunkedStream(new FileInputStream(file)));
                    }
                }
            }
        }
```

::: tip 逐块输入

要使用你自己的 ChunkedInput 实现,请在 ChannelPipeline 中安装一个ChunkedWriteHandler。

:::

在本节中,我们讨论了如何通过使用零拷贝特性来高效地传输文件,以及如何通过使用ChunkedWriteHandler 来写大型数据而又不必冒着导致 OutOfMemoryError 的风险。在下一节中,我们将仔细研究几种序列化 POJO 的方法。

## 序列化数据

JDK 提供了 ObjectOutputStream 和 ObjectInputStream,用于通过网络对 POJO 的基本数据类型和图进行序列化和反序列化。该 API 并不复杂,而且可以被应用于任何实现了java.io.Serializable 接口的对象。但是它的性能也不是非常高效的。在这一节中,我们将看到 Netty 必须为此提供什么。

### JDK序列化

如果你的应用程序必须要和使用了ObjectOutputStream和ObjectInputStream的远程节点交互,并且兼容性也是你最关心的,那么JDK序列化将是正确的选择[^8]。表 11-8 中列出了Netty提供的用于和JDK进行互操作的序列化类。

表 11-8  JDK 序列化编解码器

| 名    称                    | 描    述                                                     |
| --------------------------- | ------------------------------------------------------------ |
| CompatibleObjectDecoder[^9] | 和使用 JDK 序列化的非基于 Netty 的远程节点进行互操作的解码器 |
| CompatibleObjectEncoder     | 和使用 JDK 序列化的非基于 Netty 的远程节点进行互操作的编码器 |
| ObjectDecoder               | 构建于 JDK 序列化之上的使用自定义的序列化来解码的解码器;当没有其他的外部依赖时, 它提供了速度上的改进。 否则其他的序列化实现更加可取 |
| ObjectEncoder               | 构建于 JDK 序列化之上的使用自定义的序列化来编码的编码器;当没有其他的外部依赖时, 它提供了速度上的改进。 否则其他的序列化实现更加可取 |

### 使用JBoss Marshalling进行序列化

如果你可以自由地使用外部依赖,那么JBoss Marshalling将是个理想的选择:它比JDK序列化最多快 3 倍,而且也更加紧凑。在JBoss Marshalling官方网站主页[^10]上的概述中对它是这么定义的:

::: info

JBoss Marshalling 是一种可选的序列化 API, 它修复了在 JDK 序列化 API 中所发现的许多问题,同时保留了与 java.io.Serializable 及其相关类的兼容性,并添加了几个新的可调优参数以及额外的特性, 所有的这些都是可以通过工厂配置 (如外部序列化器、类/实例查找表、类解析以及对象替换等)实现可插拔的。

:::

Netty 通过表 11-9 所示的两组解码器/编码器对为 Boss Marshalling 提供了支持。第一组兼容只使用 JDK 序列化的远程节点。第二组提供了最大的性能,适用于和使用 JBoss Marshalling 的远程节点一起使用。

表 11-9  JBoss Marshalling 编解码器

|                                                              |                                                          |
| ------------------------------------------------------------ | -------------------------------------------------------- |
| CompatibleMarshallingDecoder<Br/>CompatibleMarshallingEncoder | 与只使用 JDK 序列化的远程节点兼容                        |
| MarshallingDecoder<br/>MarshallingEncoder                    | 适用于使用 JBoss Marshalling 的节点。 这些类必须一起使用 |

代码清单 11-13 展示了如何使用 MarshallingDecoder 和 MarshallingEncoder。 同样,几乎只是适当地配置 ChannelPipeline 罢了。

```java [代码清单 11-13  使用 JBoss Marshalling]
public class MarshallingInitializer extends ChannelInitializer < Channel > {
    private final MarshallerProvider marshallerProvider;
    private final UnmarshallerProvider unmarshallerProvider;
    public MarshallingInitializer(UnmarshallerProvider unmarshallerProvider, MarshallerProvider marshallerProvider) {
        this.marshallerProvider = marshallerProvider;
        this.unmarshallerProvider = unmarshallerProvider;
    }
    @Override
    protected void initChannel(Channel channel) throws Exception {
        ChannelPipeline pipeline = channel.pipeline();
        pipeline.addLast(new MarshallingDecoder(unmarshallerProvider));
        pipeline.addLast(new MarshallingEncoder(marshallerProvider));
        pipeline.addLast(new ObjectHandler());
    }
    public static final class ObjectHandler extends SimpleChannelInboundHandler < Serializable > {
        @Override
        public void channelRead0(ChannelHandlerContext channelHandlerContext, Serializable serializable) throws Exception {
            // Do something      
        }
    }
}
```

### 通过Protocol Buffers序列化

Netty序列化的最后一个解决方案是利用Protocol Buffers[^11]的编解码器,它是一种由Google公司开发的、现在已经开源的数据交换格式。可以在https://github.com/google/protobuf找到源代码。 
Protocol Buffers 以一种紧凑而高效的方式对结构化的数据进行编码以及解码。 它具有许多的编程语言绑定,使得它很适合跨语言的项目。表 11-10 展示了 Netty 为支持 protobuf 所提供的ChannelHandler 实现。

表 11-10  Protobuf 编解码器

|                                      |                                                              |
| ------------------------------------ | ------------------------------------------------------------ |
| ProtobufDecoder                      | 使用 protobuf 对消息进行解码                                 |
| ProtobufEncoder                      | 使用 protobuf 对消息进行编码                                 |
| ProtobufVarint32FrameDecoder         | 根据消息中的 Google Protocol Buffers 的“Base 128 Varints”[^a] 整型长度字段值动态地分割所接收到的ByteBuf |
| ProtobufVarint32LengthFieldPrepender | 向ByteBuf前追加一个 Google Protocal Buffers 的 “Base 128 Varints”整型的长度字段值 |

[^a]:参见 Google 的 Protocol Buffers 编码的开发者指南: https://developers.google.com/protocol-buffers/docs/encoding。

在这里我们又看到了,使用 protobuf 只不过是将正确的 ChannelHandler 添加到 ChannelPipeline 中,如代码清单 11-14 所示。

```java [代码清单 11-14  使用 protobuf]
public class ProtoBufInitializer extends ChannelInitializer < Channel > {
    private final MessageLite lite;
    public ProtoBufInitializer(MessageLite lite) {
        this.lite = lite;
    }
    @Override
    protected void initChannel(Channel ch) throws Exception {
        ChannelPipeline pipeline = ch.pipeline();
        pipeline.addLast(new ProtobufVarint32FrameDecoder());
        pipeline.addLast(new ProtobufEncoder());
        1 pipeline.addLast(new ProtobufDecoder(lite));
        pipeline.addLast(new ObjectHandler());
    }
    public static final class ObjectHandler extends SimpleChannelInboundHandler < Object > {
        @Override
        public void channelRead0(ChannelHandlerContext ctx, Object msg) throws Exception {
            // Do something with the object    
        }
    }
}
```

在这一节中,我们探讨了由 Netty 专门的解码器和编码器所支持的不同的序列化选项:标准JDK 序列化、JBoss Marshalling 以及 Google 的 Protocol Buffers。

[^1]:传输层安全(TLS)协议,1.2 版:http://tools.ietf.org/html/rfc5246
[^2]:Comet 就是一个例子:http://en.wikipedia.org/wiki/Comet_%28programming%29。
[^3]:RFC 6455,WebSocket 协议,http://tools.ietf.org/html/rfc6455。
[^4]:关于 WebSocket 的客户端示例, 请参考 Netty源代码中所包含的例子: https://github.com/netty/netty/tree/4.1/example/src/main/java/io/netty/example/http/websocketx/client。
[^5]:有关这些协议的 RFC 可以在 IETF 的网站上找到: SMTP 在 www.ietf.org/rfc/rfc2821.txt, POP3 在 www.ietf.org/rfc/rfc1939.txt, IMAP 在 http://tools.ietf.org/html/rfc3501, 而 Telnet 在 http://tools.ietf.org/search/rfc854。
[^6]:对于固定帧大小的协议来说,不需要将帧长度编码到头部。
[^7]:我们甚至可以利用 io.netty.channel.ChannelProgressivePromise 来实时获取传输的进度。
[^8]:参见 Oracle 的 Java SE 文档中的 “JavaObject Serialization” 部分: http://docs.oracle.com/javase/8/docs/technotes/guides/serialization/。
[^9]:这个类已经在 Netty 3.1 中废弃,并不存在于 Netty 4.x 中:https://issues.jboss.org/browse/NETTY-136。
[^10]:“About JBoss Marshalling” :www.jboss.org/jbossmarshalling。
[^11]:有关 Protocol Buffers 的描述请参考 https://developers.google.com/protocol-buffers/?hl=zh。

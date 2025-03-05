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



## 解码基于分隔符的协议和基于长度的协议

### 基于分隔符的协议

### 基于长度的协议

## 写大型数据

## 序列化数据

### JDK序列化

### 使用JBoss Marshalling进行序列化

### 通过Protocol Buffers序列化

[^1]:传输层安全(TLS)协议,1.2 版:http://tools.ietf.org/html/rfc5246
[^2]:Comet 就是一个例子:http://en.wikipedia.org/wiki/Comet_%28programming%29。
[^3]:RFC 6455,WebSocket 协议,http://tools.ietf.org/html/rfc6455。
[^4]:关于 WebSocket 的客户端示例, 请参考 Netty源代码中所包含的例子: https://github.com/netty/netty/tree/4.1/example/src/main/java/io/netty/example/http/websocketx/client。 

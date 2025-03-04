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

HTTP/HTTPS 是最常见的协议套件之一,并且随着智能手机的成功,它的应用也日益广泛, 因为对于任何公司来说, 拥有一个可以被移动设备访问的网站几乎是必须的。 这些协议也被用于其他方面。许多组织导出的用于和他们的商业合作伙伴通信的 WebService API 一般也是基于HTTP(S)的。 

接下来,我们来看看 Netty 提供的 ChannelHandler,你可以用它来处理 HTTP 和 HTTPS 协议,而不必编写自定义的编解码器。

### HTTP解码器、编码器和编解码器

<img src="/Netty实战_page_164_1.png" alt="Netty实战_page_164_1" style="zoom:20%;" />

<TableCaption title='图 11-2  HTTP 请求的组成部分' />

<img src="/Netty实战_page_164_2.png" alt="Netty实战_page_164_2" style="zoom:20%;" />

<TableCaption title='图 11-3  HTTP 响应的组成部分' />

### 聚合HTTP消息

### HTTP压缩

### 使用HTTPS

### WebSocket

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

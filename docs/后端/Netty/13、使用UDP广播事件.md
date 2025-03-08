---
typora-copy-images-to: ../../public
typora-root-url: /Volumes/硬盘/Code/docs/docs/public
---

## UDP的基础知识

面向连接的传输(如 TCP)管理了两个网络端点之间的连接的建立,在连接的生命周期内的有序和可靠的消息传输,以及最后,连接的有序终止。相比之下,在类似于 UDP 这样的无连接协议中,并没有持久化连接这样的概念,并且每个消息(一个 UDP 数据报)都是一个单独的传输单元。

此外,UDP 也没有 TCP 的纠错机制,其中每个节点都将确认它们所接收到的包,而没有被确认的包将会被发送方重新传输。 

通过类比,TCP 连接就像打电话,其中一系列的有序消息将会在两个方向上流动。相反, UDP 则类似于往邮箱中投入一叠明信片。你无法知道它们将以何种顺序到达它们的目的地,或者它们是否所有的都能够到达它们的目的地。 

UDP的这些方面可能会让你感觉到严重的局限性, 但是它们也解释了为何它会比TCP快那么多:所有的握手以及消息管理机制的开销都已经被消除了。显然,UDP很适合那些能够处理或者容忍消息丢失的应用程序,但可能不适合那些处理金融交易的应用程序[^1]。

## UDP广播

到目前为止,我们所有的例子采用的都是一种叫作单播[^2]的传输模式,定义为发送消息给一个由唯一的地址所标识的单一的网络目的地。面向连接的协议和无连接协议都支持这种模式。 

UDP 提供了向多个接收者发送消息的额外传输模式:

*   多播——传输到一个预定义的主机组;
*   广播——传输到网络(或者子网)上的所有主机。 

本章中的示例应用程序将通过发送能够被同一个网络中的所有主机所接收的消息来演示UDP 广播的使用。 为此, 我们将使用特殊的受限广播地址或者零网络地址 255.255.255.255。
发送到这个地址的消息都将会被定向给本地网络(0.0.0.0)上的所有主机,而不会被路由器转发给其他的网络。 

接下来,我们将讨论该应用程序的设计。

## UDP示例程序

我们的示例程序将打开一个文件,随后将会通过 UDP 把每一行都作为一个消息广播到一个指定的端口。 如果你熟悉类 UNIX 操作系统, 你可能会认识到这是标准的 syslog 实用程序的一个非常简化的版本。UDP 非常适合于这样的应用程序,因为考虑到日志文件本身已经被存储在了文件系统中,因此,偶尔丢失日志文件中的一两行是可以容忍的。此外,该应用程序还提供了极具价值的高效处理大量数据的能力。 

接收方是怎么样的呢?通过 UDP 广播, 只需简单地通过在指定的端口上启动一个监听程序, 便可以创建一个事件监视器来接收日志消息。 需要注意的是, 这样的轻松访问性也带来了潜在的安全隐患,这也就是为何在不安全的环境中并不倾向于使用 UDP 广播的原因之一。出于同样的原因,路由器通常也会阻止广播消息,并将它们限制在它们的来源网络上。

:::tip 发布/ 订阅模式

 类似于 syslog 这样的应用程序通常会被归类为发布/订阅模式:一个生产者或者服务发布事件,而多个客户端进行订阅以接收它们。

:::

图 13-1 展示了整个系统的一个高级别视图,其由一个广播者以及一个或者多个事件监视器所组成。广播者将监听新内容的出现,当它出现时,则通过 UDP 将它作为一个广播消息进行传输。

<img src="/Netty实战_page_200_1.png" alt="图 13-1  广播系统概览" style="zoom:25%;" />

所有的在该 UDP 端口上监听的事件监视器都将会接收到广播消息。 

为了简单起见,我们将不会为我们的示例程序添加身份认证、验证或者加密。但是,要加入这些功能并使得其成为一个健壮的、可用的实用程序应该也不难。 

在下一节中,我们将开始探讨该广播者组件的设计以及实现细节。

## 消息POJO：LogEvent

在消息处理应用程序中,数据通常由 POJO 表示,除了实际上的消息内容,其还可以包含配置或处理信息。在这个应用程序中,我们将会把消息作为事件处理,并且由于该数据来自于日志文件,所以我们将它称为 LogEvent。代码清单 13-1 展示了这个简单的 POJO 的详细信息。

```java [代码清单 13-1  LogEvent 消息]
public final class LogEvent {
    public static final byte SEPARATOR = (byte) ':';
    private final InetSocketAddress source;
    private final String logfile;
    private final String msg;
    private final long received;
    public LogEvent(String logfile, String msg) {
        this(null, -1, logfile, msg);
    }
    public LogEvent(InetSocketAddress source, long received, String logfile, String msg) {
        this.source = source;
        this.logfile = logfile;
        this.msg = msg;
        this.received = received;
    }
    public InetSocketAddress getSource() {
        return source;
    }
    public String getLogfile() {
        return logfile;
    }
    public String getMsg() {
        return msg;
    }
    public long getReceivedTimestamp() {
        return received;
    }
}
```

定义好了消息组件,我们便可以实现该应用程序的广播逻辑了。在下一节中,我们将研究用于编码和传输 LogEvent 消息的 Netty 框架类。

## 编写广播者

Netty 提供了大量的类来支持 UDP 应用程序的编写。表 13-1 列出了我们将要使用的主要的消息容器以及 Channel 类型。

表 13-1  在广播者中使用的 Netty 的 UDP 相关类

| 名    称                                                     | 描    述                                                     |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| interface AddressedEnvelope<br/>     <M, A extends SocketAddress><br/>     extends ReferenceCounted | 定义一个消息,其包装了另一个消息并带有发送者和接收者地址。其中M是消息类型;A是地址类型 |
| class DefaultAddressedEnvelope<br/>     <M, A extends SocketAddress> <br/>    implements AddressedEnvelope<M,A> | 提供了 interface AddressedEnvelope 的默认实现                |
| class DatagramPacket     extends<br/> DefaultAddressedEnvelope<br/>         <ByteBuf, InetSocketAddress><br/>     implements ByteBufHolder | 扩展了 DefaultAddressedEnvelope 以使用ByteBuf作为消息数据容器 |
| interface DatagramChannel<br/>     extends Channel           | 扩展了 Netty 的Channel抽象以支持 UDP 的多播组管理            |
| class NioDatagramChannnel     extends<br/> AbstractNioMessageChannel<br/>     implements DatagramChannel | 定义了一个能够发送和接收 AddressedEnvelope消息的Channel类型  |

Netty 的 DatagramPacket 是一个简单的消息容器,DatagramChannel 实现用它来和远程节点通信。类似于在我们先前的类比中的明信片,它包含了接收者(和可选的发送者)的地址以及消息的有效负载本身。 

要将 LogEvent 消息转换为 DatagramPacket, 我们将需要一个编码器。 但是没有必要从头开始编写我们自己的。我们将扩展 Netty 的 MessageToMessageEncoder,在第 10 章和第11 章中我们已经使用过了。 

图 13-2 展示了正在广播的 3 个日志条目,每一个都将通过一个专门的 DatagramPacket 进行广播。

<img src="/Netty实战_page_202_1.png" alt="图 13-2  通过 DatagramPacket 发送的日志条目" style="zoom:15%;" />

图 13-3 呈现了该 LogEventBroadcaster 的 ChannelPipeline 的一个高级别视图,展示了 LogEvent 消息是如何流经它的。

<img src="/Netty实战_page_202_2.png" alt="图 13-3  LogEventBroadcaster:ChannelPipeline 和 LogEvent 事件流" style="zoom:20%;" />

正如你所看到的,所有的将要被传输的数据都被封装在了 LogEvent 消息中。LogEventBroadcaster 将把这些写入到 Channel 中, 并通过 ChannelPipeline 发送它们, 在那里它们将会被转换(编码)为 DatagramPacket 消息。最后,他们都将通过 UDP 被广播,并由远程节点(监视器)所捕获。 

代码清单 13-2 展示了我们自定义版本的 MessageToMessageEncoder,其将执行刚才所描述的转换。

```java [代码清单 13-2  LogEventEncoder]
public class LogEventEncoder extends MessageToMessageEncoder < LogEvent > {
    private final InetSocketAddress remoteAddress;
    public LogEventEncoder(InetSocketAddress remoteAddress) {
        this.remoteAddress = remoteAddress;
    }
    @Override
    protected void encode(ChannelHandlerContext channelHandlerContext, LogEvent logEvent, List < Object > out) throws Exception {
        byte[] file = logEvent.getLogfile().getBytes(CharsetUtil.UTF_8);
        byte[] msg = logEvent.getMsg().getBytes(CharsetUtil.UTF_8);
        ByteBuf buf = channelHandlerContext.alloc().buffer(file.length + msg.length + 1);
        buf.writeBytes(file);
        buf.writeByte(LogEvent.SEPARATOR);
        buf.writeBytes(msg);
        out.add(new DatagramPacket(buf, remoteAddress));
    }
}
```

在 LogEventEncoder 被实现之后,我们已经准备好了引导该服务器,其包括设置各种各样的 ChannelOption,以及在 ChannelPipeline 中安装所需要的 ChannelHandler。这将通过主类 LogEventBroadcaster 完成,如代码清单 13-3 所示。

```java [代码清单 13-3  LogEventBroadcaster]
public class LogEventBroadcaster {
    private final EventLoopGroup group;
    private final Bootstrap bootstrap;
    private final File file;
    public LogEventBroadcaster(InetSocketAddress address, File file) {
        group = new NioEventLoopGroup();
        bootstrap = new Bootstrap();
        bootstrap.group(group)
          .channel(NioDatagramChannel.class)
          .option(ChannelOption.SO_BROADCAST, true)
          .handler(new LogEventEncoder(address));
        this.file = file;
    }
    public void run() throws Exception {
        Channel ch = bootstrap.bind(0).sync().channel();
        long pointer = 0;
        for (;;) {
            long len = file.length();
            if (len < pointer) { // file was reset
                pointer = len;
            } else if (len > pointer) { // Content was added 
                RandomAccessFile raf = new RandomAccessFile(file, "r");
                raf.seek(pointer);
                String line;
                while ((line = raf.readLine()) != null) {
                    ch.writeAndFlush(new LogEvent(null, -1, file.getAbsolutePath(), line));
                }
                pointer = raf.getFilePointer();
                raf.close();
            }
            try {
                Thread.sleep(1000);
            } catch (InterruptedException e) {
                Thread.interrupted();
                break;
            }
        }
    }
    public void stop() {
        group.shutdownGracefully();
    }
    public static void main(String[] args) throws Exception {
        if (args.length != 2) {
            throw new IllegalArgumentException();
        }
        LogEventBroadcaster broadcaster = new LogEventBroadcaster(new InetSocketAddress("255.255.255.255", Integer.parseInt(args[0])), new File(args[1]));
        try {
            broadcaster.run();
        } finally {
            broadcaster.stop();
        }
    }
}
```

这样就完成了该应用程序的广播者组件。对于初始测试,你可以使用netcat程序。在UNIX/Linux系统中,你能发现它已经作为nc被预装了。用于Windows的版本可以从http://nmap.org/ncat获取。

netcat 非常适合于对这个应用程序进行基本的测试; 它只是监听某个指定的端口, 并且将所有接收到的数据打印到标准输出。可以通过下面所示的方式,将其设置为监听 UDP 端口 9999 上的数据:

```sh
$ nc -l -u -p 9999
```

现在我们需要启动我们的 LogEventBroadcaster。代码清单 13-4 展示了如何使用 mvn 来编译和运行该广播者应用程序。pom.xml 文件中的配置指向了一个将被频繁更新的文件, /var/log/messages(假设是一个 UNIX/Linux 环境) ,并将端口设置为了 9999。该文件中的条目将会通过 UDP 广播到那个端口,并在你启动了 netcat 的终端上打印出来。

要改变该日志文件和端口值,可以在启动 mvn 的时候通过 System 属性来指定它们。代码清单 13-5 展示了如何将日志文件设置为/var/log/mail.log,并将端口设置为 8888。

当你看到 LogEventBroadcaster running 时,你便知道它已经成功地启动了。如果有错误发生,将会打印一个异常消息。一旦这个进程运行起来,它就会广播任何新被添加到该日志文件中的日志消息。

使用 netcat 对于测试来说是足够了,但是它并不适合于生产系统。这也就有了我们的应用程序的第二个部分——我们将在下一节中实现的广播监视器。

## 编写监视器

我们的目标是将 netcat 替换为一个更加完整的事件消费者, 我们称之为LogEventMonitor。
这个程序将: 

(1)接收由 LogEventBroadcaster 广播的 UDP DatagramPacket; 

(2)将它们解码为 LogEvent 消息; 

(3)将 LogEvent 消息写出到 System.out。 

和之前一样,该逻辑由一组自定义的 ChannelHandler 实现——对于我们的解码器来说, 我们将扩展 MessageToMessageDecoder。 图 13-4 描绘了 LogEventMonitor 的 ChannelPipeline,并且展示了 LogEvent 是如何流经它的。

<img src="/Netty实战_page_206_2.png" alt="图 13-4  LogEventMonitor" style="zoom:25%;" />

ChannelPipeline中的第一个解码器LogEventDecoder负责将传入的DatagramPacket 解码为 LogEvent 消息(一个用于转换入站数据的任何 Netty 应用程序的典型设置) 。代码清单13-6 展示了该实现。

```java [代码清单 13-6  LogEventDecoder]
public class LogEventDecoder extends MessageToMessageDecoder < DatagramPacket > {
    @Override
    protected void decode(ChannelHandlerContext ctx, DatagramPacket datagramPacket, List < Object > out) throws Exception {
        ByteBuf data = datagramPacket.content();
        int idx = data.indexOf(0, data.readableBytes(), LogEvent.SEPARATOR);
        String filename = data.slice(0, idx).toString(CharsetUtil.UTF_8);
        String logMsg = data.slice(idx + 1, data.readableBytes()).toString(CharsetUtil.UTF_8);
        LogEvent event = new LogEvent(datagramPacket.sender(), System.currentTimeMillis(), filename, logMsg);
        out.add(event);
    }
}
```

第二个ChannelHandler的工作是对第一个ChannelHandler所创建的LogEvent消息执行一些处理。在这个场景下,它只是简单地将它们写出到 System.out。在真实世界的应用程序中,你可能需要聚合来源于不同日志文件的事件,或者将它们发布到数据库中。代码清单13-7 展示了 LogEventHandler,其说明了需要遵循的基本步骤。

```java [代码清单 13-7  LogEventHandler]
public class LogEventDecoder extends MessageToMessageDecoder < DatagramPacket > {
        @Override
        protected void decode(ChannelHandlerContext ctx, DatagramPacket datagramPacket, List < Object > out) throws Exception {
            ByteBuf data = datagramPacket.content();
            int idx = data.indexOf(0, data.readableBytes(), LogEvent.SEPARATOR);
            String filename = data.slice(0, idx).toString(CharsetUtil.UTF_8);
            String logMsg = data.slice(idx + 1, data.readableBytes()).toString(CharsetUtil.UTF_8);
            LogEvent event = new LogEvent(datagramPacket.sender(), System.currentTimeMillis(), filename, logMsg);
            out.add(event);
        }
        public class LogEventHandler extends SimpleChannelInboundHandler < LogEvent > {
            @Override
            public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) throws Exception {
                cause.printStackTrace();
                ctx.close();
            }
            @Override
            public void channelRead0(ChannelHandlerContext ctx, LogEvent event) throws Exception {
                StringBuilder builder = new StringBuilder();
                builder.append(event.getReceivedTimestamp());
                builder.append(" [");
                builder.append(event.getSource().toString());
                builder.append("] [");
                builder.append(event.getLogfile());
                builder.append("] : ");
                builder.append(event.getMsg());
                System.out.println(builder.toString());
            }
        }
```

LogEventHandler 将以一种简单易读的格式打印 LogEvent 消息,包括以下的各项: 

*   以毫秒为单位的被接收的时间戳;
*   发送方的 InetSocketAddress,其由 IP 地址和端口组成;
*   生成 LogEvent 消息的日志文件的绝对路径名;
*   实际上的日志消息,其代表日志文件中的一行。 

现在我们需要将我们的LogEventDecoder和LogEventHandler安装到ChannelPipeline 中,如图 13-4 所示。代码清单 13-8 展示了如何通过LogEventMonitor 主类来做到这一点。

```java [代码清单 13-8  LogEventMonitor]
public class LogEventMonitor {
    private final EventLoopGroup group;
    private final Bootstrap bootstrap;
    public LogEventMonitor(InetSocketAddress address) {
        group = new NioEventLoopGroup();
        bootstrap = new Bootstrap();
        bootstrap
          .group(group)
          .channel(NioDatagramChannel.class)
          .option(ChannelOption.SO_BROADCAST, true)
          .handler(new ChannelInitializer < Channel > () {
            @Override
            protected void initChannel(Channel channel) throws Exception {
                ChannelPipeline pipeline = channel.pipeline();
                pipeline.addLast(new LogEventDecoder());
                pipeline.addLast(new LogEventHandler());
            }
        }).localAddress(address);
    }
    public Channel bind() {
        return bootstrap.bind().syncUninterruptibly().channel();
    }
    public void stop() {
        group.shutdownGracefully();
    }
    public static void main(String[] main) throws Exception {
        if (args.length != 1) {
            throw new IllegalArgumentException("Usage: LogEventMonitor <port>");
        }
        LogEventMonitor monitor = new LogEventMonitor(new InetSocketAddress(Integer.parseInt(args[0])));
        try {
            Channel channel = monitor.bind();
            System.out.println("LogEventMonitor running");
            channel.closeFuture().sync();
        } finally {
            monitor.stop();
        }
    }
}
```

[^1]:基于 UDP 协议实现的一些可靠传输协议可能不在此范畴内,如 Quic、Aeron 和 UDT。
[^2]:参见 http://en.wikipedia.org/wiki/Unicast。

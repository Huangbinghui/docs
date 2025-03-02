---
typora-copy-images-to: ../../public
typora-root-url: /Volumes/硬盘/Code/docs/docs/public
---



# Netty 客户端/服务器概览

下图从高层次上展示了一个你将要编写的 Echo 客户端和服务器应用程序。虽然你的主要关注点可能是编写基于 Web 的用于被浏览器访问的应用程序,但是通过同时实现客户端和服务器,你一定能更加全面地理解 Netty 的 API。

<img src="/Netty实战_page_40_1.png" alt="Netty实战_page_40_1" style="zoom:33%;" />

# 编写 Echo 服务器

所有的 Netty 服务器都需要以下两部分。 

*   至少一个 ChannelHandler—该<mark>组件实现了服务器对从客户端接收的数据的处理</mark>, 即它的<mark>业务逻辑</mark>。 
*   引导—这是**配置服务器的启动代码**。至少,它会将服务器绑定到它要监听连接请求的端口上。

## ChannelHandler 和业务逻辑

在第 1 章中,我们介绍了 Future 和回调,并且阐述了它们在事件驱动设计中的应用。 我们还讨论了 ChannelHandler,它是一个接口族的父接口,它的实现负责接收并响应事件通知。在 Netty 应用程序中,所有的数据处理逻辑都包含在这些核心抽象的实现中。

因为你的 Echo 服务器会响应传入的消息, 所以它需要实现`ChannelInboundHandler` 接口, 用来定义响应入站事件的方法。这个简单的应用程序<mark>只需要用到少量的这些方法,所以继承 `ChannelInboundHandlerAdapter` 类也就足够了,它提供了ChannelInboundHandler 的默认实现</mark>。

我们感兴趣的方法是: 

*   `channelRead()`—对于每个传入的消息都要调用;
*   `channelReadComplete()`—通知ChannelInboundHandler最后一次对channelRead()的调用是当前批量读取中的最后一条消息;
*   `exceptionCaught()`—在读取操作期间,有异常抛出时会调用。

代码清单如下所示

```java
package org.huangbh;

import io.netty.buffer.ByteBuf;
import io.netty.buffer.Unpooled;
import io.netty.channel.ChannelFutureListener;
import io.netty.channel.ChannelHandler;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.ChannelInboundHandlerAdapter;

@ChannelHandler.Sharable // 标识这个ChannelHandler可以被多个Channel安全地共享
public class EchoServerHandler extends ChannelInboundHandlerAdapter {

    /**
     * Calls {@link ChannelHandlerContext#fireChannelRead(Object)} to forward
     * to the next {@link ChannelInboundHandler} in the {@link ChannelPipeline}.
     * <p>
     * Sub-classes may override this method to change behavior.
     *
     * @param ctx
     * @param msg
     */
    @Override
    public void channelRead(ChannelHandlerContext ctx, Object msg) throws Exception {
        ByteBuf buf = (ByteBuf) msg;
        System.out.println("Server received: " + buf.toString(io.netty.util.CharsetUtil.UTF_8)); // 将服务端收到的消息打印到控制台
        ctx.write(msg); // 将接收到的消息写给发送者，而不冲刷出站消息
    }


    /**
     * Calls {@link ChannelHandlerContext#fireChannelReadComplete()} to forward
     * to the next {@link ChannelInboundHandler} in the {@link ChannelPipeline}.
     * <p>
     * Sub-classes may override this method to change behavior.
     *
     * @param ctx
     */
    @Override
    public void channelReadComplete(ChannelHandlerContext ctx) throws Exception {
        ctx.writeAndFlush(Unpooled.EMPTY_BUFFER).addListener(ChannelFutureListener.CLOSE); // 将未决消息冲刷到远程节点，并且关闭该Channel
    }

    /**
     * Calls {@link ChannelHandlerContext#fireExceptionCaught(Throwable)} to forward
     * to the next {@link ChannelHandler} in the {@link ChannelPipeline}.
     * <p>
     * Sub-classes may override this method to change behavior.
     *
     * @param ctx
     * @param cause
     */
    @Override
    public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) throws Exception {
        cause.printStackTrace(); // 打印异常堆栈
        ctx.close(); // 关闭该Channel
    }
}
```

`ChannelInboundHandlerAdapter` 有一个直观的 API,并且它的每个方法都可以被重写以挂钩到事件生命周期的恰当点上。

>   [!NOTE]
>
>   **如果不捕获异常,会发生什么呢？**
>
>   每个 Channel 都拥有一个与之相关联的 `ChannelPipeline`,其持有一个 ChannelHandler 的实例链。在默认的情下,ChannelHandler 会把对它的方法的调用转发给链中的下一个 ChannelHandler。 因此, 如果 exceptionCaught()方法没有被该链中的某处实现, 那么所接收的异常将会被传递到 ChannelPipeline 的尾端并被记录。为此,你的应用程序应该提供至少有一个实现了exceptionCaught()方法的 ChannelHandler。 (6.4 节详细地讨论了异常处理) 。

除了ChannelInboundHandlerAdapter 之外,还有很多需要学习的ChannelHandler 的子类型和实现,我们将在第 6 章和第 7 章中对它们进行详细的阐述。目前,请记住下面这些关键点:

*   针对不同类型的事件来调用 ChannelHandler;
*   应用程序通过实现或者扩展 ChannelHandler 来挂钩到事件的生命周期,并且提供自定义的应用程序逻辑; 
*   在架构上, ChannelHandler 有助于保持业务逻辑与网络处理代码的分离。 这简化了开发过程,因为代码必须不断地演化以响应不断变化的需求。

## 引导服务器

引导服务器本身的过程,具体涉及以下内容:

*   绑定到服务器将在其上监听并接受传入连接请求的端口;
*   配置 Channel,以将有关的入站消息通知给 EchoServerHandler 实例

>   [!NOTE]
>
>   **传输**
>
>   ​	在这一节中,你将遇到术语传输。在网络协议的标准多层视图中,传输层提供了端到端的或者主机到主机的通信服务。 
>   ​	因特网通信是建立在 TCP 传输之上的。除了一些由 Java NIO 实现提供的服务器端性能增强之外, NIO 传输大多数时候指的就是 TCP 传输。 
>   ​	我们将在第 4 章对传输进行详细的讨论。

EchoServer 类的完整代码:

```java
package org.huangbh;

import io.netty.bootstrap.ServerBootstrap;
import io.netty.channel.ChannelFuture;
import io.netty.channel.ChannelInitializer;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.SocketChannel;
import io.netty.channel.socket.nio.NioServerSocketChannel;

import java.net.InetSocketAddress;

public class EchoServer {
    private final int port;

    public EchoServer(int port) {
        this.port = port;
    }

    public static void main(String[] args) throws InterruptedException {

        if (args.length != 1) {
            System.err.println("Usage:" + EchoServer.class.getSimpleName() + " <port> ");
        }
        int port = Integer.parseInt(args[0]); // 设置端口值
        new EchoServer(port).start();
    }

    public void start() throws  InterruptedException {
        final EchoServerHandler echoServerHandler = new EchoServerHandler();
        NioEventLoopGroup group = new NioEventLoopGroup(); // 创建NioEventLoopGroup
        try {
            ServerBootstrap serverBootstrap = new ServerBootstrap(); // 创建ServerBootstrap
            serverBootstrap.group(group)
                    .channel(NioServerSocketChannel.class) // 指定所使用的NIO传输Channel
                    .localAddress(new InetSocketAddress(port)) // 使用指定的端口设置套接字地址
                    .childHandler(new ChannelInitializer<SocketChannel>() { // 添加一个EchoServerHandler到子Channel的ChannelPipeline
                        @Override
                        protected void initChannel(SocketChannel ch) throws Exception {
                            ch.pipeline().addLast(echoServerHandler); // EchoServerHandler被标注为@Shareable，所以我们可以总是使用同样的实例
                        }
                    });
            ChannelFuture f  = serverBootstrap.bind().sync(); // 异步地绑定服务器；调用sync()方法阻塞等待直到绑定完成
            f.channel().closeFuture().sync(); // 获取Channel的CloseFuture，并且阻塞当前线程直到它完成。
        } finally {
            group.shutdownGracefully().sync(); // 关闭EventLoopGroup，释放所有资源
        }
    }
}
```

与此同时, 让我们回顾一下你刚完成的服务器实现中的重要步骤。 下面这些是服务器的主要代码组件:

*   EchoServerHandler 实现了业务逻辑; 
*   main()方法引导了服务器; 

引导过程中所需要的步骤如下:

*   创建一个 `ServerBootstrap` 的实例以引导和绑定服务器;
*   创建并分配一个 `NioEventLoopGroup` 实例以进行事件的处理,如接受新连接以及读/ 写数据;
*   指定服务器绑定的本地的 `InetSocketAddress`;
*   使用一个 `EchoServerHandler` 的实例初始化每一个新的 `Channel`;
*   调用`ServerBootstrap.bind()`方法以绑定服务器。

# 编写 Echo 客户端

Echo 客户端将会: 

1.  连接到服务器; 
2.  发送一个或者多个消息;
3.  对于每个消息,等待并接收从服务器发回的相同的消息;
4.  关闭连接。 

编写客户端所涉及的两个主要代码部分也是业务逻辑和引导,和你在服务器中看到的一样。

## 通过 `ChannelHandler` 实现客户端逻辑

如同服务器,客户端将拥有一个用来处理数据的 `ChannelInboundHandler`。在这个场景下,你将扩展 `SimpleChannelInboundHandler` 类以处理所有必须的任务,如代码清单 2-3 所示。这要求重写下面的方法:

*   channelActive()——在到服务器的连接已经建立之后将被调用;
*   channelRead0()[^1]——当从服务器接收到一条消息时被调用;
*   exceptionCaught()——在处理过程中引发异常时被调用。

```java
package org.huangbh;

import io.netty.buffer.ByteBuf;
import io.netty.buffer.Unpooled;
import io.netty.channel.ChannelHandler;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.SimpleChannelInboundHandler;
import io.netty.util.CharsetUtil;

@ChannelHandler.Sharable // 标识这个ChannelHandler可以被多个Channel共享
public class EchoClientHandler extends SimpleChannelInboundHandler<ByteBuf> {

    @Override
    public void channelActive(ChannelHandlerContext ctx) {
        ctx.writeAndFlush(Unpooled.copiedBuffer("Netty rocks!", CharsetUtil.UTF_8)); // 当被通知Channel是活跃的时候，发送一条消息
    }

    @Override
    protected void channelRead0(ChannelHandlerContext ctx, ByteBuf msg) {
        System.out.println("Client received: " + msg.toString(CharsetUtil.UTF_8)); // 记录已接收消息的转储
    }

    @Override
    public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) throws Exception {
       cause.printStackTrace();
       ctx.close();
    }
}
```

接下来,你重写了 `channelRead0()`方法。每当接收数据时,都会调用这个方法。需要注意的是,由<mark>服务器发送的消息可能会被分块接收</mark>。也就是说,如果服务器发送了 5 字节,那么不能保证这 5 字节会被一次性接收。即使是对于这么少量的数据,channelRead0()方法也可能会被调用两次,第一次使用一个持有 3 字节的 ByteBuf(Netty 的字节容器) ,第二次使用一个持有 2 字节的 ByteBuf。作为一个面向流的协议,TCP 保证了字节数组将会按照服务器发送它们的顺序被接收。

>   [!TIP]
>
>   **`SimpleChannelInboundHandler` 与 `ChannelInboundHandler`** 
>
>   你可能会想: 为什么我们在客户端使用的是 SimpleChannelInboundHandler, 而不是在 EchoServerHandler 中所使用的 ChannelInboundHandlerAdapter 呢?这和两个因素的相互作用有关:业务逻辑如何处理消息以及 Netty 如何管理资源。 
>
>   在客户端,当 channelRead0()方法完成时,你已经有了传入消息,并且已经处理完它了。当该方法返回时,SimpleChannelInboundHandler 负责释放指向保存该消息的 ByteBuf 的内存引用。 
>
>   在 EchoServerHandler 中,你仍然需要将传入消息回送给发送者,而 write()操作是异步的,直到 channelRead()方法返回后可能仍然没有完成 (如代码清单 2-1 所示) 。 为此, EchoServerHandler 扩展了 ChannelInboundHandlerAdapter,其在这个时间点上不会释放消息。 
>
>   消息在 EchoServerHandler 的 channelReadComplete()方法中,当 writeAndFlush()方法被调用时被释放(见代码清单 2-1) 。 
>
>   第 5 章和第 6 章将对消息的资源管理进行详细的介绍。

## 引导客户端

引导客户端类似于引导服务器,不同的是,客户端是<mark>使用主机和端口参数来连接远程地</mark>址,也就是这里的 Echo 服务器的地址,而不是绑定到一个一直被监听的端口。

```java
package org.huangbh;

import io.netty.bootstrap.Bootstrap;
import io.netty.channel.ChannelFuture;
import io.netty.channel.ChannelInitializer;
import io.netty.channel.nio.NioEventLoopGroup;
import io.netty.channel.socket.SocketChannel;
import io.netty.channel.socket.nio.NioSocketChannel;

import java.net.InetSocketAddress;

public class EchoClient {

    private final String host;

    private final int port;

    public EchoClient(String host, int port) {
        this.host = host;
        this.port = port;
    }

    public void start() throws InterruptedException{
        NioEventLoopGroup group = new NioEventLoopGroup();
        try {
            Bootstrap b = new Bootstrap();
            b.group(group)
                    .channel(NioSocketChannel.class)
                    .remoteAddress(new InetSocketAddress(host, port))
                    .handler(new ChannelInitializer<SocketChannel>() {
                        @Override
                        protected void initChannel(SocketChannel ch) throws Exception {
                            ch.pipeline().addLast(new EchoClientHandler());
                        }
                    });
            ChannelFuture sync = b.connect().sync();
            sync.channel().closeFuture().sync();
        } finally {
            group.shutdownGracefully();
        }
    }

    public static void main(String[] args) throws InterruptedException {
        if (args.length != 2) {
            System.err.println(
                    "Usage: " + EchoClient.class.getSimpleName() +
                            " <host> <port>");
            return;
        }
        String host = args[0];
        int port = Integer.parseInt(args[1]);
        new EchoClient(host, port).start();
    }
}
```

和之前一样,使用了 NIO 传输。注意,你可<mark>以在客户端和服务器上分别使用不同的传输</mark>。例如,在服务器端使用 NIO 传输,而在客户端使用 OIO 传输。在第 4 章,我们将探讨影响你选择适用于特定用例的特定传输的各种因素和场景。

让我们回顾一下这一节中所介绍的要点:

*   为初始化客户端,创建了一个 `Bootstrap` 实例;

*   为进行事件处理分配了一个 `NioEventLoopGroup` 实例,其中事件处理包括创建新的连接以及处理入站和出站数据;
*   为服务器连接创建了一个 `InetSocketAddress` 实例;
*   当连接被建立时,一个 `EchoClientHandler` 实例会被安装到(该 Channel 的) `ChannelPipeline` 中;
*   在一切都设置完成后,调用 `Bootstrap.connect()`方法连接到远程节点;

---

[^1]: `SimpleChannelInboundHandler`的`channelRead0()`方法的相关讨论参见 https://github.com/netty/netty/wiki/New-and-noteworthy-in-5.0#channelread0--messagereceived,其中 Netty5 的开发工作已经关闭。
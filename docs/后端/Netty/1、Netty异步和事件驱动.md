---
typora-copy-images-to: ../../public
typora-root-url: /Volumes/硬盘/Code/docs/docs/public
---
# Java 网络编程

那些最早期的 Java API(java.net)只支持由本地系统套接字库提供的所谓的阻塞函数。

```java [123.java]
ServerSocket serverSocket = new ServerSocket(portNumber); // 建一个新的 ServerSocket, 用以监听指定端口上的连接请求
Socket clientSocket = serverSocket.accept(); // 对 accept()方法的调用将被阻塞,直到一个连接建立
BufferedReader in = new BufferedReader(new InputStreamReader(clientSocket.getInputStream())); // 这些流对象都派生于该套接字的流对象
PrintWriter out =new PrintWriter(clientSocket.getOutputStream(), true); 
String request, response;
while ((request = in.readLine()) != null) {     
    if ("Done".equals(request)) {         
        break;     
    }     
    response = processRequest(request);   // 请求被传递给服务器的处理方法 
    out.println(response);// 服务器的响应被 发送给了客户端
}
```

这段代码片段将只能同时处理一个连接,要管理多个并发客户端,需要为每个新的客户端Socket 创建一个新的 Thread,如下图

![Netty实战_page_29_5](/Netty实战_page_29_5.png)

这种方案的影响：第一,在任何时候都可能有大量的线程处于休眠状态,只是等待输入或者输出数据就绪,这可能算是一种资源浪费。第二,需要为每个线程的调用栈都分配内存,其默认值大小区间为 64 KB 到 1 MB, 具体取决于操作系统。 第三,即使 Java 虚拟机(JVM)在物理上可以支持非常大数量的线程,但是远在到达该极限之前,上下文切换所带来的开销就会带来麻烦,例如,在达到 10000 个连接的时候。

## Java NIO

Java 对于非阻塞 I/O 的支持是在 2002 年引入的,位于 JDK 1.4 的 java.nio 包中。

:::tip  **新的还是非阻塞的**
NIO 最开始是新的输入/输出(New Input/Output)的英文缩写,但是,该 Java API 已经出现足够长的时间了, 不再是 “新的” 了, 因此, 如今大多数的用户认为 NIO 代表非阻塞 I/O (Non-blocking I/O) , 而阻塞 I/O (blocking I/O)是旧的输入/输出(old input/output,OIO) 。你也可能遇到它被称为普通 I/O(plain I/O)的时候。
:::

## 选择器

下图展示了一个非阻塞设计,其实际上消除了上一节中所描述的那些弊端。

![Netty实战_page_30_1](/Netty实战_page_30_1.png)

`java.nio.channels.Selector` 是Java 的非阻塞 I/O 实现的关键。 它使用了事件通知 API 以确定在一组非阻塞套接字中有哪些已经就绪能够进行 I/O 相关的操作。

如图所示一个单一的线程便可以处理多个并发的连接。

总体来看,与阻塞 I/O 模型相比,这种模型提供了更好的资源管理: 

*   使用较少的线程便可以处理许多连接, 因此也减少了内存管理和上下文切换所带来开销;
*   当没有 I/O 操作需要处理的时候,线程也可以被用于其他任务。

# Netty简介

![image-20250110151145198](/image-20250110151145198.png)

# Netty核心组件

## Channel

Channel 是 Java NIO 的一个基本构造。 

>   它代表一个到实体(如一个硬件设备、一个文件、一个网络套接字或者一个能够执行一个或者多个不同的I/O操作的程序组件)的开放连接,如读操作和写操作。[^1]

目前,可以把 Channel 看作是传入(入站)或者传出(出站)数据的载体。因此,它可以被打开或者被关闭,连接或者断开连接。

## 回调

一个回调其实就是一个方法, 一个指向已经被提供给另外一个方法的方法的引用。 这使得后者[^2] 可以在适当的时候调用前者。回调在广泛的编程场景中都有应用,而且也是在操作完成后通知相关方最常见的方式之一。

Netty 在内部使用了回调来处理事件; 当一个回调被触发时, 相关的事件可以被一个interfaceChannelHandler 的实现处理。

代码清单 1-2 展示了一个例子: 当一个新的连接已经被建立时, ChannelHandler 的 channelActive()回调方法将会被调用,并将打印出一条信息。

```java [代码清单 1-2]
public class ConnectHandler extends ChannelInboundHandlerAdapter {
    @Override
    public void channelActive(ChannelHandlerContext ctx) throws Exception {
        System.out.println("Client " + ctx.channel().remoteAddress() + " connected");
    }
}
```

## Future

Future 提供了另一种在操作完成时通知应用程序的方式。这个对象可以看作是一个异步操作的结果的占位符;它将在未来的某个时刻完成,并提供对其结果的访问。

JDK 预置了 `java.util.concurrent.Future`,但是其所提供的实现,只允许手动检查对应的操作是否已经完成, 或者一直阻塞直到它完成。 这是非常繁琐的, 所以 Netty 提供了它自己的实现——`ChannelFuture`,用于在执行异步操作的时候使用。

`ChannelFuture`提供了几种额外的方法,这些方法使得我们能够注册一个或者多个`ChannelFutureListener`实例。 监听器的回调方法`operationComplete()`, 将会在对应的操作完成时被调用[^3]。

每个 Netty 的出站 I/O 操作都将返回一个 ChannelFuture;也就是说,它们都不会阻塞。

```java
Channel channel = ...; // Does not block 
ChannelFuture future = channel.connect(new InetSocketAddress("192.168.0.1", 25));
future.addListener(new ChannelFutureListener() {
    @Override
    public void operationComplete(ChannelFuture future) {
        if (future.isSuccess()){
            ByteBuf buffer = Unpooled.copiedBuffer("Hello",Charset.defaultCharset());
            ChannelFuture wf = future.channel().writeAndFlush(buffer);
            ....
        } else {
            Throwable cause = future.cause();
            cause.printStackTrace();
        }
    }
});
```

首先,要连接到远程节点上。然后,要注册一个新的 ChannelFutureListener 到对 connect()方法的调用所返回的 ChannelFuture 上。当该监听器被通知连接已经建立的时候,要检查对应的状态。如果该操作是成功的,那么将数据写到该 Channel。否则,要从 ChannelFuture 中检索对应的 Throwable。

## 事件和ChannelHandler

Netty 使用不同的事件来通知我们状态的改变或者是操作的状态。这使得我们能够基于已经发生的事件来触发适当的动作。这些动作可能是:

*   记录日志;
*   数据转换;
*   流控制;
*   应用程序逻辑。

Netty 是一个网络编程框架, 所以事件是按照它们与入站或出站数据流的相关性进行分类的。
可能由入站数据或者相关的状态更改而触发的事件包括:

*   连接已被激活或者连接失活;
*   数据读取;
*   用户事件;
*   错误事件。

出站事件是未来将会触发的某个动作的操作结果,这些动作包括:

*   打开或者关闭到远程节点的连接;
*   将数据写到或者冲刷到套接字。

每个事件都可以被分发给 ChannelHandler 类中的某个用户实现的方法。 这是一个很好的将事件驱动范式直接转换为应用程序构件块的例子。 下图展示了一个事件是如何被一个这样的ChannelHandler 链处理的。

![Netty实战_page_36_1](/Netty实战_page_36_1.png)

Netty 的 ChannelHandler 为处理器提供了基本的抽象,如图 1-3 所示的那些。我们会在适当的时候对 ChannelHandler 进行更多的说明,但是目前你可以认为每个 ChannelHandler 的实例都类似于一种为了响应特定事件而被执行的回调。

<mark>Netty 提供了大量预定义的可以开箱即用的 ChannelHandler 实现</mark>,包括用于各种协议(如 HTTP 和 SSL/TLS)的 ChannelHandler。在内部,ChannelHandler 自己也使用了事件和 Future,使得它们也成为了你的应用程序将使用的相同抽象的消费者。

# 总结

## Future、回调和 ChannelHandler

Netty的<mark>异步编程模型是建立在Future和回调的概念之上</mark>的,  而将事件派发到ChannelHandler 的方法则发生在更深的层次上。 结合在一起, 这些元素就提供了一个处理环境, 使你的应用程序逻辑可以独立于任何网络操作相关的顾虑而独立地演变。这也是 Netty 的设计方式的一个关键目标。
拦截操作以及高速地转换入站数据和出站数据, 都只需要你提供回调或者利用操作所返回的Future。这使得链接操作变得既简单又高效,并且促进了可重用的通用代码的编写。

## 选择器、事件和 EventLoop

Netty 通过<mark>触发事件将 Selector 从应用程序中抽象出来,消除了所有本来将需要手动编写的派发代码</mark>。在内部,将会为每个 Channel分配一个 EventLoop,用以处理所有事件,包括:

*   注册感兴趣的事件;
*   将事件派发给 ChannelHandler;

*   安排进一步的动作。 

<mark>EventLoop 本身只由一个线程驱动</mark>,其处理了一个 Channel 的所有 I/O 事件,并且在该EventLoop 的整个生命周期内都不会改变。这个简单而强大的设计消除了你可能有的在ChannelHandler实现中需要进行同步的任何顾虑,因此,你可以专注于提供正确的逻辑,用来在有感兴趣的数据要处理的时候执行。如同我们在详细探讨 Netty 的线程模型时将会看到的, 该 API 是简单而紧凑的。

---

[^1]: Java 平台,标准版第 8 版 API 规范,java.nio.channels,Channel:http://docs.oracle.com/javase/8/docs/api/java/nio/channels/package-summary.html。
[^2]: 指接受回调的方法。——译者注:可以在适当的时候调用前者
[^3]: 如果在 ChannelFutureListener 添加到 ChannelFuture 的时候,ChannelFuture 已经完成,那么该 ChannelFutureListener 将会被直接地通知

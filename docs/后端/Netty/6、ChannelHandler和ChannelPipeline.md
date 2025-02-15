---
typora-copy-images-to: ../../public
typora-root-url: /Volumes/硬盘/Code/docs/docs/public
---

<script setup>
    import TableCaption from '../../../components/TableCaption.vue'
</script>

## ChannelHandler 家族

### Channel 的生命周期

`Interface Channel` 定义了一组和 ChannelInboundHandler API 密切相关的简单但功能强大的状态模型,表 6-1 列出了 Channel 的这 4 个状态。

<TableCaption title='表 6-1  Channel的生命周期状态' />

|      状    态       |                           描    述                           |
| :-----------------: | :----------------------------------------------------------: |
| ChannelUnregistered |           Channel已经被创建,但还未注册到EventLoop            |
|  ChannelRegistered  |                Channel已经被注册到了EventLoop                |
|    ChannelActive    | Channel处于活动状态 (已经连接到它的远程节点) 。 它现在可以接收和发送数据了 |
|   ChannelInactive   |                  Channel没有连接到远程节点                   |

Channel 的正常生命周期如图 6-1 所示。<u>当这些状态发生改变时,将会生成对应的事件。</u>
<u>这些事件将会被转发给 ChannelPipeline 中的 ChannelHandler</u>, 其可以随后对它们做出响应。

<img src="/Netty实战_page_95_1.png" alt="Netty实战_page_95_1" style="zoom:30%;" />

<TableCaption title='图 6-1  Channel 的状态模型' />

### ChannelHandler 的生命周期

表 6-2 中列出了`interface ChannelHandler` 定义的生命周期操作,<u>在ChannelHandler 被添加到 ChannelPipeline 中或者被从 ChannelPipeline 中移除时会调用这些操作</u>。 <u>这些方法中的每一个都接受一个 ChannelHandlerContext 参数</u>。

<TableCaption title='表 6-2  ChannelHandler的生命周期方法' />

| 类    型        | 描    述                                          |
| --------------- | ------------------------------------------------- |
| handlerAdded    | 当把ChannelHandler添加到ChannelPipeline中时被调用 |
| handlerRemoved  | 当从ChannelPipeline中移除ChannelHandler时被调用   |
| exceptionCaught | 当处理过程中在ChannelPipeline中有错误产生时被调用 |

Netty 定义了下面两个重要的 ChannelHandler 子接口: 

*   `ChannelInboundHandler`——处理入站数据以及各种状态变化;
*   `ChannelOutboundHandler`——处理出站数据并且允许拦截所有的操作。 

在接下来的章节中,我们将详细地讨论这些子接口。

### ChannelInboundHandler 接口

表 6-3 列出了 interface ChannelInboundHandler 的生命周期方法。这些方法将会在数据被接收时或者与其对应的 Channel 状态发生改变时被调用。正如我们前面所提到的,这些方法和 Channel 的生命周期密切相关。

<TableCaption title='表 6-3  ChannelInboundHandler的方法' />

|         类    型          |                           描    述                           |
| :-----------------------: | :----------------------------------------------------------: |
|     channelRegistered     |  当Channel已经注册到它的EventLoop并且能够处理 I/O 时被调用   |
|    channelUnregistered    |  当Channel从它的EventLoop注销并且无法处理任何 I/O 时被调用   |
|       channelActive       | 当Channel处于活动状态时被调用; Channel已经连接/绑定并且已经就绪 |
|      channelInactive      |    当Channel离开活动状态并且不再连接它的远程节点时被调用     |
|    channelReadComplete    |           当Channel上的一个读操作完成时被调用[^1]            |
|        channelRead        |                 当从Channel读取数据时被调用                  |
| channelWritabilityChanged | 当 Channel 的可写状态发生改变时被调用。用户可以确保写操作不会完成得太快(以避免发生 OutOfMemoryError)或者可以在 Channel 变为再次可写时恢复写入。 可以通过调用Channel的isWritable()方法来检测Channel的可写性。与可写性相关的阈值可以通过Channel.config(). <br/>setWriteHighWaterMark()和Channel.config().setWriteLowWaterMark()方法来设置 |
|    userEventTriggered     | 当 ChannelnboundHandler.fireUserEventTriggered()方法被调用时被调用,因为一个 POJO 被传经了ChannelPipeline |

当某个 ChannelInboundHandler 的实现重写 channelRead()方法时, <u>它将负责显式地释放与池化的 ByteBuf 实例相关的内存</u>。Netty 为此提供了一个实用方法 ReferenceCountUtil.release(),如代码清单 6-1 所示。

```java
@Sharable 
public class DiscardHandler extends ChannelInboundHandlerAdapter { 
    @Override     
    public void channelRead(ChannelHandlerContext ctx, Object msg) { 
        ReferenceCountUtil.release(msg);       
    } 
}
```

Netty 将使用 WARN 级别的日志消息记录未释放的资源,使得可以非常简单地在代码中发现违规的实例。但是以这种方式管理资源可能很繁琐。一个更加简单的方式是使用 SimpleChannelInboundHandler。代码清单 6-2 是代码清单 6-1 的一个变体,说明了这一点。

```java
@Sharable
public class SimpleDiscardHandler extends SimpleChannelInboundHandler<Object> { // 继承了SimpleChannelInboundHandler
    @Override     
    public void channelRead0(ChannelHandlerContext ctx, Object msg) {         
        // 不需要任何显式的资源释放       
    } 
}
```

<u>由于 SimpleChannelInboundHandler 会自动释放资源,所以你不应该存储指向任何消息的引用供将来使用,因为这些引用都将会失效</u>。 [6.1.6 节](#资源管理)为引用处理提供了更加详细的讨论。

### ChannelOutboundHandler 接口

出站操作和数据将由ChannelOutboundHandler 处理。 它的方法将被Channel、 ChannelPipeline 以及ChannelHandlerContext 调用。

ChannelOutboundHandler 的一个强大的功能是可以按需推迟操作或者事件,这使得可以通过一些复杂的方法来处理请求。例如,如果到远程节点的写入被暂停了,那么你可以推迟冲刷操作并在稍后继续。

表6-4 显示了所有由ChannelOutboundHandler本身所定义的方法 (忽略了那些从ChannelHandler 继承的方法) 。

<TableCaption title='表 6-4  ChannelOutboundHandler的方法' />

|                           类    型                           |                     描    述                      |
| :----------------------------------------------------------: | :-----------------------------------------------: |
|  bind(ChannelHandlerContext, SocketAddress,ChannelPromise)   |       当请求将Channel绑定到本地地址时被调用       |
| connect(ChannelHandlerContext, SocketAddress,SocketAddress,ChannelPromise) |       当请求将Channel连接到远程节点时被调用       |
|      disconnect(ChannelHandlerContext, ChannelPromise)       |       当请求将Channel从远程节点断开时被调用       |
|         close(ChannelHandlerContext,ChannelPromise)          |             当请求关闭Channel时被调用             |
|      deregister(ChannelHandlerContext, ChannelPromise)       |    当请求将Channel从它的EventLoop注销时被调用     |
|                 read(ChannelHandlerContext)                  |       当请求从Channel读取更多的数据时被调用       |
|                 flush(ChannelHandlerContext)                 | 当请求通过Channel将入队数据冲刷到远程节点时被调用 |
|     write(ChannelHandlerContext,Object, ChannelPromise)      |    当请求通过Channel将数据写到远程节点时被调用    |

::: info ChannelPromise与ChannelFuture

 ChannelOutboundHandler中的大部分方法都需要一个ChannelPromise参数,以便在操作完成时得到通知。ChannelPromise是ChannelFuture的一个子类,其定义了一些可写的方法,如setSuccess()和setFailure(),从而使ChannelFuture不可变[^2]。

:::

接下来我们将看一看那些简化了编写 ChannelHandler 的任务的类。

### ChannelHandler 适配器

你可以使用 ChannelInboundHandlerAdapter 和 ChannelOutboundHandlerAdapter 类作为自己的ChannelHandler 的起始点。这两个适配器分别提供了ChannelInboundHandler 和ChannelOutboundHandler 的基本实现。通过扩展抽象类ChannelHandlerAdapter,它们获得了它们共同的超接口ChannelHandler 的方法。生成的类的层次结构如图 6-2 所示

<img src="/Netty实战_page_98_1.png" alt="Netty实战_page_98_1" style="zoom:20%;" />

<TableCaption title='图 6-2  ChannelHandlerAdapter 类的层次结构' />

<u>ChannelHandlerAdapter 还提供了实用方法 isSharable()</u>。如果其对应的实现被标注为 Sharable,那么这个方法将返回 true,表示它可以被添加到多个 ChannelPipeline 中(如在 2.3.1 节中所讨论过的一样) 。 

<u>在 ChannelInboundHandlerAdapter 和 ChannelOutboundHandlerAdapter 中所提供的方法体调用了其相关联的 ChannelHandlerContext 上的等效方法</u>, 从而将事件转发到了 ChannelPipeline 中的下一个 ChannelHandler 中。 

你要想在自己的 ChannelHandler 中使用这些适配器类,只需要简单地扩展它们,并且重写那些你想要自定义的方法。

### 资源管理

每当通过调用 ChannelInboundHandler.channelRead()或者 ChannelOutboundHandler.write()方法来处理数据时, 你都需要确保没有任何的资源泄漏。 你可能还记得在前面的章节中所提到的,Netty 使用引用计数来处理池化的 ByteBuf。所以在完全使用完某个ByteBuf 后,调整其引用计数是很重要的。

为了帮助你诊断潜在的(资源泄漏)问题,Netty提供了class ResourceLeakDetector[^3] , 它将对你应用程序的缓冲区分配做大约 1%的采样来检测内存泄露。相关的开销是非常小的。 

如果检测到了内存泄露,将会产生类似于下面的日志消息:

```log
Running io.netty.handler.codec.xml.XmlFrameDecoderTest 
15:03:36.886 [main] ERROR io.netty.util.ResourceLeakDetector - LEAK:
	ByteBuf.release() was not called before it's garbage-collected. 
Recent access records: 1 
#1: io.netty.buffer.AdvancedLeakAwareByteBuf.toString(     
	AdvancedLeakAwareByteBuf.java:697) 
io.netty.handler.codec.xml.XmlFrameDecoderTest.testDecodeWithXml(     
	XmlFrameDecoderTest.java:157) 
io.netty.handler.codec.xml.XmlFrameDecoderTest.testDecodeWithTwoMessages(     
	XmlFrameDecoderTest.java:133) 
...
```

实现ChannelInboundHandler.channelRead()和ChannelOutboundHandler.write() 方法时,应该使用`ReferenceCountUtil.release(msg);`来防止泄露。Netty 提供了一个特殊的被称为SimpleChannelInboundHandler的ChannelInboundHandler实现。这个实现会在消息被channelRead0()方法消费之后自动释放消息。

在出站方向这边,如果你处理了 write()操作并丢弃了一个消息,那么你也应该负责释放它。

重要的是,不仅要释放资源,还要通知 ChannelPromise。否则可能会出现 ChannelFutureListener 收不到某个消息已经被处理了的通知的情况。

总之,如果一个消息被消费或者丢弃了,并且没有传递给 ChannelPipeline 中的下一个ChannelOutboundHandler,那么用户就有责任调用 ReferenceCountUtil.release()。
如果消息到达了实际的传输层,那么当它被写入时或者 Channel 关闭时,都将被自动释放。

## ChannelPipeline 接口

### 修改 ChannelPipeline

### 触发事件

## ChannelHandlerContext 接口

### 使用 ChannelHandlerContext

### ChannelHandler 和 ChannelHandlerContext 的高级用法

## 异常处理

### 处理入站异常

### 处理出站异常

[^1]: 当所有可读的字节都已经从 Channel 中读取之后, 将会调用该回调方法; 所以, 可能在 channelReadComplete()被调用之前看到多次调用 channelRead(...)
[^2]: 这里借鉴的是 Scala 的 Promise 和 Future 的设计,当一个 Promise 被完成之后,其对应的 Future 的值便不能再进行任何修改了。
[^3]:其利用了 JDK 提供的 PhantomReference\<T\>类来实现这一点。

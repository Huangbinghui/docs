---
typora-copy-images-to: ../../public
typora-root-url: /Volumes/硬盘/Code/docs/docs/public
---
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

Channel 的正常生命周期如图 6-1 所示。<mark>当这些状态发生改变时,将会生成对应的事件。</mark>
<mark>这些事件将会被转发给 ChannelPipeline 中的 ChannelHandler</mark>, 其可以随后对它们做出响应。

<img src="/Netty实战_page_95_1.png" alt="图 6-1  Channel 的状态模型" style="zoom:30%;" />

### ChannelHandler 的生命周期

表 6-2 中列出了`interface ChannelHandler` 定义的生命周期操作,<mark>在ChannelHandler 被添加到 ChannelPipeline 中或者被从 ChannelPipeline 中移除时会调用这些操作</mark>。 <mark>这些方法中的每一个都接受一个 ChannelHandlerContext 参数</mark>。

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

当某个 ChannelInboundHandler 的实现重写 channelRead()方法时, <mark>它将负责显式地释放与池化的 ByteBuf 实例相关的内存</mark>。Netty 为此提供了一个实用方法 ReferenceCountUtil.release(),如代码清单 6-1 所示。

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

<mark>由于 SimpleChannelInboundHandler 会自动释放资源,所以你不应该存储指向任何消息的引用供将来使用,因为这些引用都将会失效</mark>。 [6.1.6 节](#资源管理)为引用处理提供了更加详细的讨论。

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

::: tip ChannelPromise与ChannelFuture

 ChannelOutboundHandler中的大部分方法都需要一个ChannelPromise参数,以便在操作完成时得到通知。ChannelPromise是ChannelFuture的一个子类,其定义了一些可写的方法,如setSuccess()和setFailure(),从而使ChannelFuture不可变[^2]。

:::

接下来我们将看一看那些简化了编写 ChannelHandler 的任务的类。

### ChannelHandler 适配器

你可以使用 ChannelInboundHandlerAdapter 和 ChannelOutboundHandlerAdapter 类作为自己的ChannelHandler 的起始点。这两个适配器分别提供了ChannelInboundHandler 和ChannelOutboundHandler 的基本实现。通过扩展抽象类ChannelHandlerAdapter,它们获得了它们共同的超接口ChannelHandler 的方法。生成的类的层次结构如图 6-2 所示

<img src="/Netty实战_page_98_1.png" alt="图 6-2  ChannelHandlerAdapter 类的层次结构" style="zoom:20%;" />

<mark>ChannelHandlerAdapter 还提供了实用方法 isSharable()</mark>。如果其对应的实现被标注为 Sharable,那么这个方法将返回 true,表示它可以被添加到多个 ChannelPipeline 中(如在 2.3.1 节中所讨论过的一样) 。 

<mark>在 ChannelInboundHandlerAdapter 和 ChannelOutboundHandlerAdapter 中所提供的方法体调用了其相关联的 ChannelHandlerContext 上的等效方法</mark>, 从而将事件转发到了 ChannelPipeline 中的下一个 ChannelHandler 中。 

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

实现ChannelInboundHandler.channelRead()和ChannelOutboundHandler.write() 方法时,应该使用`ReferenceCountUtil.release(msg);`来防止泄露。Netty 提供了一个特殊的被称为`SimpleChannelInboundHandler`的ChannelInboundHandler实现。这个实现会在消息被channelRead0()方法消费之后自动释放消息。

在出站方向这边,如果你处理了 write()操作并丢弃了一个消息,那么你也应该负责释放它。

重要的是,不仅要释放资源,还要通知 ChannelPromise。否则可能会出现 ChannelFutureListener 收不到某个消息已经被处理了的通知的情况。

总之,<mark>如果一个消息被消费或者丢弃了,并且没有传递给 ChannelPipeline 中的下一个ChannelOutboundHandler,那么用户就有责任调用 ReferenceCountUtil.release()。</mark>
<mark>如果消息到达了实际的传输层,那么当它被写入时或者 Channel 关闭时,都将被自动释放</mark>。

## ChannelPipeline 接口

如果你认为ChannelPipeline是一个拦截流经Channel的入站和出站事件的ChannelHandler 实例链,那么就很容易看出这些 ChannelHandler 之间的交互是如何组成一个应用程序数据和事件处理逻辑的核心的。

每一个新创建的 Channel 都将会被分配一个新的 ChannelPipeline。Channel 既不能附加另外一个 ChannelPipeline,也不能分离其当前的。在 Netty 组件的生命周期中,这是一项固定的操作。

根据事件的起源, 事件将会被ChannelInboundHandler 或者ChannelOutboundHandler处理。随后,通过调用 ChannelHandlerContext 实现,它将被转发给同一超类型的下一个ChannelHandler。

::: tip ChannelHandlerContext

ChannelHandlerContext使得ChannelHandler能够和它的ChannelPipeline以及其他的ChannelHandler交 互 。ChannelHandler可 以 通 知 其 所 属 的ChannelPipeline中 的 下 一 个ChannelHandler,甚至可以动态修改它所属的ChannelPipeline[^4]。 

ChannelHandlerContext 具有丰富的用于处理事件和执行 I/O 操作的 API。[6.3 节](#ChannelHandlerContext接口)将提供有关ChannelHandlerContext 的更多内容。

:::

图 6-3 展示了一个典型的同时具有入站和出站ChannelHandler 的ChannelPipeline 的布局, 并且印证了我们之前的关于ChannelPipeline 主要由一系列的ChannelHandler 所组成的说法。 ChannelPipeline 还提供了通过ChannelPipeline 本身传播事件的方法。 如果一个入站事件被触发, 它将被从ChannelPipeline 的头部开始一直被传播到Channel Pipeline 的尾端。
在图 6-3 中,一个出站 I/O 事件将从ChannelPipeline 的最右边开始,然后向左传播。

<img src="/Netty实战_page_101_1.png" alt="图 6-3  ChannelPipeline 和它的 ChannelHandler" style="zoom:25%;" />

::: tip ChannelPipeline 相对论

你可能会说,从事件途经 ChannelPipeline 的角度来看,ChannelPipeline 的头部和尾端取决于该事件是入站的还是出站的。然而 Netty 总是将 ChannelPipeline 的入站口(图 6-3 中的左侧) 作为头部,而将出站口(该图的右侧)作为尾端。 

当你完成了通过调用 ChannelPipeline.add*()方法将入站处理器(ChannelInboundHandler) 和 出 站 处 理 器 (ChannelOutboundHandler ) 混 合 添 加 到 ChannelPipeline 之 后 , 每 一 个ChannelHandler 从头部到尾端的顺序位置正如同我们方才所定义它们的一样。因此,如果你将图 6-3 中的处理器(ChannelHandler)从左到右进行编号,那么第一个被入站事件看到的ChannelHandler 将是1,而第一个被出站事件看到的ChannelHandler 将是 5。

:::

在 ChannelPipeline 传播事件时,它会测试 ChannelPipeline 中的下一个 ChannelHandler 的类型是否和事件的运动方向相匹配。如果不匹配,ChannelPipeline 将跳过该ChannelHandler 并前进到下一个,直到它找到和该事件所期望的方向相匹配的为止。 (当然,ChannelHandler 也可以同时实现 ChannelInboundHandler 接口和 ChannelOutboundHandler 接口。 )

### 修改 ChannelPipeline

ChannelHandler 可以通过添加、删除或者替换其他的 ChannelHandler 来实时地修改ChannelPipeline 的布局。 (它也可以将它自己从ChannelPipeline 中移除。 ) 这是ChannelHandler 最重要的能力之一, 所以我们将仔细地来看看它是如何做到的。 表 6-6 列出了相关的方法。

<TableCaption title='表 6-6  ChannelHandler的用于修改ChannelPipeline的方法' />

| 名    称                                        | 描    述                                                     |
| ----------------------------------------------- | ------------------------------------------------------------ |
| AddFirst<br/>addBefore<br/>addAfter<br/>addLast | 将一个ChannelHandler添加到ChannelPipeline中                  |
| remove                                          | 将一个ChannelHandler从ChannelPipeline中移除                  |
| replace                                         | 将 ChannelPipeline 中的一个 ChannelHandler 替换为另一个 ChannelHandler |

代码清单 6-5 展示了这些方法的使用。

```java
ChannelPipeline pipeline = ..;
FirstHandler firstHandler = new FirstHandler();
pipeline.addLast("handler1", firstHandler);   
pipeline.addFirst("handler2", new SecondHandler());   
pipeline.addLast("handler3", new ThirdHandler());     
... 
pipeline.remove("handler3");      
pipeline.remove(firstHandler);     
pipeline.replace("handler2", "handler4", new ForthHandler());
```

重组 ChannelHandler 的这种能力使我们可以用它来轻松地实现极其灵活的逻辑。

<a id="ChannelHandler的执行和阻塞" />

::: tip ChannelHandler 的执行和阻塞

通常 ChannelPipeline 中的每一个 ChannelHandler 都是通过它的 EventLoop (I/O 线程) 来处理传递给它的事件的。所以至关重要的是不要阻塞这个线程,因为这会对整体的 I/O 处理产生负面的影响。  

但有时可能需要与那些使用阻塞 API 的遗留代码进行交互。对于这种情况,ChannelPipeline 有一些接受一个EventExecutorGroup 的add()方法。如果一个事件被传递给一个自定义的EventExecutorGroup,它将被包含在这个 EventExecutorGroup 中的某个 EventExecutor 所处理,从而被从该Channel 本身的 EventLoop 中移除。对于这种用例,Netty 提供了一个叫 DefaultEventExecutorGroup 的默认实现。

:::

除了这些操作,还有别的通过类型或者名称来访问 ChannelHandler 的方法。这些方法都列在了表 6-7 中。

<TableCaption title='表 6-7  ChannelPipeline的用于访问ChannelHandler的操作' />

| 名    称 | 描    述                                        |
| -------- | ----------------------------------------------- |
| get      | 通过类型或者名称返回ChannelHandler              |
| context  | 返回和ChannelHandler绑定的ChannelHandlerContext |
| names    | 返回ChannelPipeline中所有ChannelHandler的名称   |

### 触发事件

ChannelPipeline 的 API 公开了用于调用入站和出站操作的附加方法。表 6-8 列出了入站操作,用于通知 ChannelInboundHandler 在 ChannelPipeline 中所发生的事件。

<TableCaption title='表 6-8  ChannelPipeline的入站操作' />

| 方 法 名 称                   | 描    述                                                     |
| ----------------------------- | ------------------------------------------------------------ |
| fireChannelRegistered         | 调用ChannelPipeline中下一个ChannelInboundHandler的channelRegistered(ChannelHandlerContext)方法 |
| fireChannelUnregistered       | 调用ChannelPipeline中下一个ChannelInboundHandler的channelUnregistered(ChannelHandlerContext)方法 |
| fireChannelActive             | 调用ChannelPipeline中下一个ChannelInboundHandler的channelActive(ChannelHandlerContext)方法 |
| fireChannelInactive           | 调用ChannelPipeline中下一个ChannelInboundHandler的channelInactive(ChannelHandlerContext)方法 |
| fireExceptionCaught           | 调用 ChannelPipeline 中下一个 ChannelInboundHandler 的exceptionCaught(ChannelHandlerContext, Throwable)方法 |
| fireUserEventTriggered        | 调用 ChannelPipeline 中下一个 ChannelInboundHandler 的userEventTriggered(ChannelHandlerContext, Object)方法 |
| fireChannelRead               | 调用ChannelPipeline中下一个ChannelInboundHandler的channelRead(ChannelHandlerContext, Object msg)方法 |
| fireChannelReadComplete       | 调用ChannelPipeline中下一个ChannelInboundHandler的channelReadComplete(ChannelHandlerContext)方法 |
| fireChannelWritabilityChanged | 调用 ChannelPipeline 中下一个 ChannelInboundHandler 的channelWritabilityChanged(ChannelHandlerContext)方法 |

在出站这边, 处理事件将会导致底层的套接字上发生一系列的动作。 表 6-9 列出了 ChannelPipeline API 的出站操作。

<TableCaption title='表 6-8  ChannelPipeline的出站操作' />

| 方 法 名 称   | 描    述                                                     |
| ------------- | ------------------------------------------------------------ |
| bind          | 将 Channel 绑定到一个本地地址,这将调用 ChannelPipeline 中的下一个ChannelOutboundHandler 的 bind(ChannelHandlerContext, SocketAddress, ChannelPromise)方法 |
| connect       | 将 Channel 连接到一个远程地址,这将调用 ChannelPipeline 中的下一个ChannelOutboundHandler的connect(ChannelHandlerContext, SocketAddress, ChannelPromise)方法 |
| disconnect    | 将Channel断开连接。 这将调用ChannelPipeline中的下一个ChannelOutboundHandler的disconnect(ChannelHandlerContext, Channel Promise)方法 |
| close         | 将Channel关闭。 这将调用ChannelPipeline中的下一个ChannelOutboundHandler的close(ChannelHandlerContext, ChannelPromise)方法 |
| deregister    | 将Channel从它先前所分配的EventExecutor(即EventLoop)中注销。这将调用 ChannelPipeline 中的下一个 ChannelOutboundHandler 的 deregister (ChannelHandlerContext, ChannelPromise)方法 |
| flush         | 冲刷Channel所有挂起的写入。 这将调用ChannelPipeline中的下一个ChannelOutboundHandler的flush(ChannelHandlerContext)方法 |
| write         | 将消息写入 Channel。这将调用 ChannelPipeline 中的下一个 ChannelOutboundHandler的write(ChannelHandlerContext, Object msg, ChannelPromise)方法。 注意: 这并不会将消息写入底层的Socket, 而只会将它放入队列中。要将它写入Socket,需要调用flush()或者writeAndFlush()方法 |
| writeAndFlush | 这是一个先调用write()方法再接着调用flush()方法的便利方法     |
| read          | 请求从 Channel 中读取更多的数据。这将调用 ChannelPipeline 中的下一个ChannelOutboundHandler的read(ChannelHandlerContext)方法 |

总结一下: 

*   ChannelPipeline 保存了与 Channel 相关联的 ChannelHandler;
*   ChannelPipeline 可以根据需要,通过添加或者删除ChannelHandler 来动态地修改;  
*   ChannelPipeline 有着丰富的 API 用以被调用,以响应入站和出站事件。

## ChannelHandlerContext接口

<mark>ChannelHandlerContext 代表了 ChannelHandler 和 ChannelPipeline 之间的关联 ,每当有 ChannelHandler 添加到 ChannelPipeline 中时, 都会创建 ChannelHandlerContext</mark>。 ChannelHandlerContext 的主要功能是管理它所关联的 ChannelHandler 和在同一个 ChannelPipeline 中的其他 ChannelHandler 之间的交互。

ChannelHandlerContext 有很多的方法,其中一些方法也存在于 Channel 和 ChannelPipeline 本身上,但是有一点重要的不同。<mark>如果调用Channel 或者ChannelPipeline 上的这些方法,它们将沿着整个ChannelPipeline 进行传播。而调用位于ChannelHandlerContext 上的相同方法,则将从当前所关联的 ChannelHandler 开始,并且只会传播给位于该ChannelPipeline 中的下一个能够处理该事件的ChannelHandler。</mark>

表 6-10 对 ChannelHandlerContext API 进行了总结。

<TableCaption title='表 6-10  ChannelHandlerContext的 API' />

| 方 法 名 称                   | 描    述                                                     |
| ----------------------------- | ------------------------------------------------------------ |
| alloc                         | 返回和这个实例相关联的Channel所配置的ByteBufAllocator        |
| bind                          | 绑定到给定的SocketAddress,并返回ChannelFuture                |
| channel                       | 返回绑定到这个实例的Channel                                  |
| close                         | 关闭Channel,并返回ChannelFuture                              |
| connect                       | 连接给定的SocketAddress,并返回ChannelFuture                  |
| deregister                    | 从之前分配的EventExecutor注销, 并返回ChannelFuture           |
| disconnect                    | 从远程节点断开,并返回ChannelFuture                           |
| executor                      | 返回调度事件的EventExecutor                                  |
| fireChannelActive             | 触发对下一个ChannelInboundHandler上的 channelActive()方法(已连接)的调用 |
| fireChannelInactive           | 触发对下一个ChannelInboundHandler上的 channelInactive()方法(已关闭)的调用 |
| fireChannelRead               | 触发对下一个ChannelInboundHandler上的 channelRead()方法(已接收的消息)的调用 |
| fireChannelReadComplete       | 触发对下一个ChannelInboundHandler上的 channelReadComplete()方法的调用 |
| fireChannelRegistered         | 触发对下一个ChannelInboundHandler上的 fireChannelRegistered()方法的调用 |
| fireChannelUnregistered       | 触发对下一个ChannelInboundHandler上的 fireChannelUnregistered()方法的调用 |
| fireChannelWritabilityChanged | 触发对下一个ChannelInboundHandler上的 fireChannelWritabilityChanged()方法的调用 |
| fireExceptionCaught           | 触发对下一个ChannelInboundHandler上的 fireExceptionCaught(Throwable)方法的调用 |
| fireUserEventTriggered        | 触发对下一个ChannelInboundHandler上的 fireUserEventTriggered(Object evt)方法的调用 |
| handler                       | 返回绑定到这个实例的ChannelHandler                           |
| isRemoved                     | 如果所关联的ChannelHandler已经被从ChannelPipeline 中移除则返回true |
| name                          | 返回这个实例的唯一名称                                       |
| pipeline                      | 返回这个实例所关联的ChannelPipeline                          |
| read                          | 将数据从Channel读取到第一个入站缓冲区;如果读取成功则触发[^5]一个channelRead事件, 并 (在最后一个消息被读取完成后) 通 知 ChannelInboundHandler 的 channelReadComplete (ChannelHandlerContext)方法 |
| write                         | 通过这个实例写入消息并经过ChannelPipeline                    |
| writeAndFlush                 | 通过这个实例写入并冲刷消息并经过ChannelPipeline              |

当使用 ChannelHandlerContext 的 API 的时候,请牢记以下两点: 

*   ChannelHandlerContext 和 ChannelHandler 之间的关联(绑定)是永远不会改变的,所以缓存对它的引用是安全的;
*   如同我们在本节开头所解释的一样, 相对于其他类的同名方法, ChannelHandler Context 的方法将产生更短的事件流,应该尽可能地利用这个特性来获得最大的性能。

### 使用 ChannelHandlerContext

在这一节中我们将讨论ChannelHandlerContext 的用法,以及存在于ChannelHandlerContext、Channel 和ChannelPipeline 上的方法的行为。图 6-4 展示了它们之间的关系。

<img src="/Netty实战_page_106_1.png" alt="图 6-4  Channel、ChannelPipeline、ChannelHandler 以及 ChannelHandlerContext 之间的关系" style="zoom:20%;" />

在代码清单 6-6 中,将通过 ChannelHandlerContext 获取到 Channel 的引用。调用Channel上的write()方法将会导致写入事件从尾端到头部地流经 ChannelPipeline。

```java
ChannelHandlerContext ctx = ..;
Channel channel = ctx.channel();
channel.write(Unpooled.copiedBuffer("Netty in Action",       CharsetUtil.UTF_8));
```

代码清单 6-7 展示了一个类似的例子, 但是这一次是写入 ChannelPipeline。 我们再次看到, (到 ChannelPipline 的)引用是通过 ChannelHandlerContext 获取的。

```java
ChannelHandlerContext ctx = ..;
ChannelPipeline pipeline = ctx.pipeline();  
pipeline.write(Unpooled.copiedBuffer("Netty in Action",       CharsetUtil.UTF_8));
```

如同在图 6-5 中所能够看到的一样,代码清单 6-6 和代码清单 6-7 中的事件流是一样的。重要的是要注意到, 虽然被调用的Channel或ChannelPipeline 上的write()方法将一直传播事件通过整个ChannelPipeline, 但是在ChannelHandler 的级别上, 事件从一个ChannelHandler 到下一个ChannelHandler 的移动是由ChannelHandlerContext 上的调用完成的。

<img src="/Netty实战_page_107_1.png" alt="图 6-5  通过 Channel 或者 ChannelPipeline 进行的事件传播" style="zoom:20%;" />

为什么会想要从 ChannelPipeline 中的某个特定点开始传播事件呢? 

*   为了减少将事件传经对它不感兴趣的 ChannelHandler 所带来的开销。 

*   为了避免将事件传经那些可能会对它感兴趣的 ChannelHandler。 

要想调用从某个特定的 ChannelHandler 开始的处理过程,必须获取到在(ChannelPipeline)该 ChannelHandler 之前的 ChannelHandler 所关联的 ChannelHandlerContext。 这个 ChannelHandlerContext 将调用和它所关联的 ChannelHandler 之后的ChannelHandler。

代码清单 6-8 和图 6-6 说明了这种用法。

```java
ChannelHandlerContext ctx = ..;  
ctx.write(Unpooled.copiedBuffer("Netty in Action", CharsetUtil.UTF_8));
```

如图 6-6 所示, 消息将从下一个 ChannelHandler 开始流经 ChannelPipeline, 绕过了所有前面的 ChannelHandler。

<img src="/Netty实战_page_108_2.png" alt="图 6-6  通过 ChannelHandlerContext 触发的操作的事件流" style="zoom:20%;" />

我们刚才所描述的用例是常见的,对于调用特定的 ChannelHandler 实例上的操作尤其有用。

### ChannelHandler 和 ChannelHandlerContext 的高级用法

正如我们在代码清单 6-6 中所看到的,你可以通过调用 ChannelHandlerContext 上的pipeline()方法来获得被封闭的 ChannelPipeline 的引用。这使得运行时得以操作ChannelPipeline 的ChannelHandler,我们可以利用这一点来实现一些复杂的设计。例如, 你可以通过将 ChannelHandler 添加到 ChannelPipeline 中来实现动态的协议切换。 

另一种高级的用法是缓存到 ChannelHandlerContext 的引用以供稍后使用, 这可能会发生在任何的 ChannelHandler 方法之外,甚至来自于不同的线程。代码清单 6-9 展示了用这种模式来触发事件。

```java
public class WriteHandler extends ChannelHandlerAdapter {
	private ChannelHandlerContext ctx;
    @Override
    public void handlerAdded(ChannelHandlerContext ctx) {
        this.ctx = ctx;
    }
    public void send(String msg) {
        ctx.writeAndFlush(msg);
    }
}
```

因为一个 ChannelHandler 可以从属于多个 ChannelPipeline, 所以它也可以绑定到多个 ChannelHandlerContext 实例。对于这种用法指在多个 ChannelPipeline中共享同一个 ChannelHandler,对应的 ChannelHandler 必须要使用`@Sharable` 注解标注;否则, 试图将它添加到多个 ChannelPipeline 时将会触发异常。显而易见,为了安全地被用于多个并发的 Channel(即连接) ,这样的 ChannelHandler 必须是线程安全的。 

代码清单 6-11 中的实现将会导致问题。

```java
@Sharable  
public class UnsharableHandler extends ChannelInboundHandlerAdapter { 
    private int count;     
    @Override     
    public void channelRead(ChannelHandlerContext ctx, Object msg) {
        count++;
        System.out.println("channelRead(...) called the " + count + " time");
        ctx.fireChannelRead(msg);
    }
}
```

这段代码的问题在于它拥有状态[^6] ,即用于跟踪方法调用次数的实例变量count。将这个类的一个实例添加到ChannelPipeline将极有可能在它被多个并发的Channel访问时导致问题。 (当然,这个简单的问题可以通过使channelRead()方法变为同步方法来修正。 ) 

总之,<mark>只应该在确定了你的 ChannelHandler 是线程安全的时才使用@Sharable 注解</mark>。

::: tip 为何要共享同一个ChannelHandler

在多个ChannelPipeline中安装同一个ChannelHandler 的一个常见的原因是用于收集跨越多个Channel的统计信息。

:::

## 异常处理

### 处理入站异常

如果在处理入站事件的过程中有异常被抛出, 那么它将从它在 ChannelInboundHandler 里被触发的那一点开始流经 ChannelPipeline。要想处理这种类型的入站异常,你需要在你的 ChannelInboundHandler 实现中重写`exceptionCaught`方法。

因为异常将会继续按照入站方向流动(就像所有的入站事件一样) ,所以实现了前面所示逻辑的 ChannelInboundHandler 通常位于 ChannelPipeline 的最后。这确保了所有的入站异常都总是会被处理,无论它们可能会发生在 ChannelPipeline 中的什么位置。

你应该如何响应异常, 可能很大程度上取决于你的应用程序。 你可能想要关闭Channel(和连接) , 也 可 能会尝试进行恢复。 如果你不实现任何处理入站异常的逻辑 (或者没有消费该异常) , 那么Netty将会记录该异常没有被处理的事实[^7].

总结一下: 

*   ChannelHandler.exceptionCaught()的默认实现是简单地将当前异常转发给ChannelPipeline 中的下一个 ChannelHandler;
*   如果异常到达了 ChannelPipeline 的尾端,它将会被记录为未被处理;
*   要想定义自定义的处理逻辑, 你需要重写 exceptionCaught()方法。 然后你需要决定是否需要将该异常传播出去。

### 处理出站异常

用于处理出站操作中的正常完成以及异常的选项,都基于以下的通知机制。 

*   每个出站操作都将返回一个 ChannelFuture。 注册到 ChannelFuture 的 ChannelFutureListener 将在操作完成时被通知该操作是成功了还是出错了。 
*   几乎所有的 ChannelOutboundHandler 上的方法都会传入一个 ChannelPromise 的实例。作为 ChannelFuture 的子类,ChannelPromise 也可以被分配用于异步通知的监听器。但是,ChannelPromise 还具有提供立即通知的可写方法:     

`ChannelPromise setSuccess();`    

`ChannelPromise setFailure(Throwable cause);`

添加 ChannelFutureListener 只需要调用 ChannelFuture 实例上的 addListener (ChannelFutureListener)方法, 并且有两种不同的方式可以做到这一点。 其中最常用的方式是, 调用出站操作(如write()方法)所返回的ChannelFuture 上的addListener()方法。 

代码清单 6-13 使用了这种方式来添加 ChannelFutureListener,它将打印栈跟踪信息并且随后关闭 Channel。

```java
ChannelFuture future = channel.write(someMessage);
future.addListener(new ChannelFutureListener() {
    @Override
    public void operationComplete(ChannelFuture f) {
        if (!f.isSuccess()) {
            f.cause().printStackTrace();
            f.channel().close();
        }
    }
});
```

第二种方式是将ChannelFutureListener添加到即将作为参数传递给 ChannelOutboundHandler的方法的 ChannelPromise。代码清单 6-14 中所展示的代码和代码清单 6-13 中所展示的具有相同的效果。

```java
public class OutboundExceptionHandler extends ChannelOutboundHandlerAdapter {
    @Override
    public void write(ChannelHandlerContext ctx, Object msg, ChannelPromise promise) {
        promise.addListener(new ChannelFutureListener() {
            @Override             
            public void operationComplete(ChannelFuture f) {
                if (!f.isSuccess()) {
                    f.cause().printStackTrace();
                    f.channel().close();
                }
            }
        });
    }
}
```

::: tip ChannelPromise 的可写方法

通过调用 ChannelPromise 上的 setSuccess()和 setFailure()方法,可以使一个操作的状态在 ChannelHandler 的方法返回给其调用者时便即刻被感知到。

:::

为何选择一种方式而不是另一种呢?对于细致的异常处理,你可能会发现,在调用出站操作时添加 ChannelFutureListener 更合适,如代码清单 6-13 所示。而对于一般的异常处理,你可能会发现,代码清单 6-14 所示的自定义的 ChannelOutboundHandler 实现的方式更加的简单。 

如果你的 ChannelOutboundHandler 本身抛出了异常会发生什么呢?在这种情况下, Netty 本身会通知任何已经注册到对应 ChannelPromise 的监听器。

[^1]: 当所有可读的字节都已经从 Channel 中读取之后, 将会调用该回调方法; 所以, 可能在 channelReadComplete()被调用之前看到多次调用 channelRead(...)
[^2]: 这里借鉴的是 Scala 的 Promise 和 Future 的设计,当一个 Promise 被完成之后,其对应的 Future 的值便不能再进行任何修改了。
[^3]:其利用了 JDK 提供的 PhantomReference\<T\>类来实现这一点。
[^4]: 这里指修改 ChannelPipeline 中的 ChannelHandler 的编排。
[^5]: 触发对下一个ChannelInboundHandler上的 fireChannelWritabilityChanged()方法的调用 
[^6]: 主要的问题在于, 对于其所持有的状态的修改并不是线程安全的, 比如也可以通过使用 AtomicInteger 来规避这个问题。
[^7]: 即 Netty 将会通过 Warning 级别的日志记录该异常到达了 ChannelPipeline 的尾端,但没有被处理, 并尝试释放该异常。
[^ChannelHandler的执行和阻塞]:

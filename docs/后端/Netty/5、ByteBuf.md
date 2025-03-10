---
typora-copy-images-to: ../../public
typora-root-url: /Volumes/硬盘/Code/docs/docs/public
---
正如前面所提到的,网络数据的基本单位总是字节。Java NIO 提供了 ByteBuffer 作为它的字节容器,但是这个类使用起来过于复杂,而且也有些繁琐。

Netty 的 ByteBuffer 替代品是 ByteBuf, 一个强大的实现, 既解决了 JDK API 的局限性, 又为网络应用程序的开发者提供了更好的 API。

## ByteBuf 的 API

Netty 的数据处理 API 通过两个组件暴露——`abstract class ByteBuf` 和 `interface ByteBufHolder`。

下面是一些 ByteBuf API 的优点:

*   它可以被用户自定义的缓冲区类型扩展;
*   通过内置的复合缓冲区类型实现了透明的零拷贝; 
*   容量可以按需增长(类似于 JDK 的 StringBuilder) ;
*   在读和写这两种模式之间切换不需要调用 ByteBuffer 的 flip()方法; 
*   读和写使用了不同的索引; 
*   支持方法的链式调用;
*   支持引用计数;
*   支持池化。

## ByteBuf 类——Netty 的数据容器

因为所有的网络通信都涉及字节序列的移动,所以高效易用的数据结构明显是必不可少的。Netty 的 ByteBuf 实现满足并超越了这些需求。 让我们首先来看看它是如何通过使用不同的索引来简化对它所包含的数据的访问的吧。

### 它是如何工作的

ByteBuf 维护了两个不同的索引: <mark>一个用于读取, 一个用于写入</mark>。 当你从 ByteBuf 读取时, 它的 readerIndex 将会被递增已经被读取的字节数。同样地,当你写入 ByteBuf 时,它的writerIndex 也会被递增。图 5-1 展示了一个空 ByteBuf 的布局结构和状态。

![图 5-1  一个读索引和写索引都设置为 0 的 16 字节 ByteBuf](/Netty实战_page_77_1.png)

<TableCaption :title="'图 5-1  一个读索引和写索引都设置为 0 的 16 字节 ByteBuf'"/>

要了解这些索引两两之间的关系, 请考虑一下, 如果打算读取字节直到 readerIndex 达到和 writerIndex 同样的值时会发生什么。在那时,你将会到达“可以读取的”数据的末尾。就如同试图读取超出数组末尾的数据一样, 试图读取超出该点的数据将会触发一个IndexOutOfBoundsException。

名称以 read 或者 write 开头的 ByteBuf 方法,将会推进其对应的索引,而名称以 set 或者 get 开头的操作则不会。后面的这些方法将在作为一个参数传入的一个相对索引上执行操作。

可以指定 ByteBuf 的最大容量。试图移动写索引(即 writerIndex)超过这个值将会触发一个异常[^1]。 (默认的限制是 Integer.MAX_VALUE。 )

### ByteBuf 的使用模式

在使用 Netty 时,你将遇到几种常见的围绕 ByteBuf 而构建的使用模式。在研究它们时,我们心里想着图 5-1 会有所裨益— 一个由不同的索引分别控制读访问和写访问的字节数组。

#### 1.堆缓冲区

最常用的 ByteBuf 模式是将数据存储在 JVM 的堆空间中。这种模式被称为**支撑数组**(backing array) ,<mark>它能在没有使用池化的情况下提供快速的分配和释放</mark>。这种方式,如代码清单5-1 所示,非常适合于有遗留的数据需要处理的情况。

::: code-group

```java [代码清单 5-1  支撑数组]
ByteBuf heapBuf = ...; 
if (heapBuf.hasArray()) {      
	byte[] array = heapBuf.array();         
    int offset = heapBuf.arrayOffset() + heapBuf.readerIndex();      
    int length = heapBuf.readableBytes();       
    handleArray(array, offset, length);     
}
```

:::

::: tip  :warning: 注意

当 hasArray()方法返回 false 时,尝试访问支撑数组将触发一个 `UnsupportedOperationException`。这个模式类似于 JDK 的ByteBuffer的用法。

:::

#### 2.直接缓冲区

直接缓冲区是另外一种 ByteBuf 模式。我们期望用于对象创建的内存分配永远都来自于堆中, 但这并不是必须的——NIO 在 JDK 1.4 中引入的 ByteBuffer 类允许 JVM 实现通过本地调用来分配内存。这主要是为了避免在每次调用本地 I/O 操作之前(或者之后)将缓冲区的内容复制到一个中间缓冲区(或者从中间缓冲区把内容复制到缓冲区) 。

ByteBuffer的Javadoc明确指出: “<mark>直接缓冲区的内容将驻留在常规的会被垃圾回收的堆之外</mark>。 ”这也就解释了为何直接缓冲区对于网络数据传输是理想的选择。如果你的数据包含在一个在堆上分配的缓冲区中,那么事实上,在通过套接字发送它之前,JVM将会在内部把你的缓冲区复制到一个直接缓冲区中。

<mark>直接缓冲区的主要缺点是,相对于基于堆的缓冲区,它们的分配和释放都较为昂贵</mark>。如果你正在处理遗留代码,你也可能会遇到另外一个缺点:<mark>因为数据不是在堆上,所以你不得不进行一次复制</mark>,如代码清单 5-2 所示。

显然,与使用支撑数组相比,这涉及的工作更多。因此,如果事先知道容器中的数据将会被作为数组来访问,你可能更愿意使用堆内存。

::: code-group

```java [代码清单 5-2  访问直接缓冲区的数据]
ByteBuf directBuf = ...;  
if (!directBuf.hasArray()) {      
    int length = directBuf.readableBytes();
    byte[] array = new byte[length];
    directBuf.getBytes(directBuf.readerIndex(), array);
    handleArray(array, 0, length);  
}
```

:::

#### 3.复合缓冲区

第三种也是最后一种模式使用的是复合缓冲区,它为多个 ByteBuf 提供一个聚合视图。在这里你可以根据需要添加或者删除 ByteBuf 实例,这是一个 JDK 的 ByteBuffer 实现完全缺失的特性。

Netty 通过一个 ByteBuf 子类——`CompositeByteBuf`——实现了这个模式,它提供了一个将多个缓冲区表示为单个合并缓冲区的虚拟表示。

::: warning

`CompositeByteBuf`中的`ByteBuf`实例可能同时包含直接内存分配和非直接内存分配。
如果其中只有一个实例,那么对 `CompositeByteBuf` 上的 `hasArray()`方法的调用将返回该组件上的`hasArray()`方法的值;否则它将返回false。

:::

为了举例说明, 让我们考虑一下一个由两部分——头部和主体——组成的将通过 HTTP 协议传输的消息。这两部分由应用程序的不同模块产生,将会在消息被发送的时候组装。该应用程序可以选择为多个消息重用相同的消息主体。 当这种情况发生时, 对于每个消息都将会创建一个新的头部。

因为我们不想为每个消息都重新分配这两个缓冲区, 所以使用 CompositeByteBuf 是一个完美的选择。 它在消除了没必要的复制的同时, 暴露了通用的 ByteBuf API。 图 5-2 展示了生成的消息布局。

![图 5-2  持有一个头部和主体的 CompositeByteBuf](/Netty实战_page_79_1.png)

代码清单 5-3 展示了如何通过使用 JDK 的 ByteBuffer 来实现这一需求。创建了一个包含两个 ByteBuffer 的数组用来保存这些消息组件, 同时创建了第三个 ByteBuffer 用来保存所有这些数据的副本。

::: code-group

```java [代码清单 5-3  使用 ByteBuffer 的复合缓冲区模式]
// Use an array to hold the message parts 
ByteBuffer[] message = new ByteBuffer[] { header, body }; 
// Create a new ByteBuffer and use copy to merge the header and body 
ByteBuffer message2 = ByteBuffer.allocate(header.remaining() + body.remaining()); 
message2.put(header); 
message2.put(body); 
message2.flip();
```

```java [代码清单 5-4  使用 CompositeByteBuf 的复合缓冲区模式]
CompositeByteBuf messageBuf = Unpooled.compositeBuffer(); 
ByteBuf headerBuf = ...; // can be backing or direct 
ByteBuf bodyBuf = ...;   // can be backing or direct 
messageBuf.addComponents(headerBuf, bodyBuf);  
..... 
messageBuf.removeComponent(0); // remove the header   
for (ByteBuf buf : messageBuf) {      
    System.out.println(buf.toString()); 
}
```

```java [代码清单 5-5  访问 CompositeByteBuf 中的数据]
CompositeByteBuf compBuf = Unpooled.compositeBuffer(); 
int length = compBuf.readableBytes();  
byte[] array = new byte[length];     
compBuf.getBytes(compBuf.readerIndex(), array);  
handleArray(array, 0, array.length);
```

:::

需要注意的是, Netty使用了CompositeByteBuf来优化套接字的I/O操作, 尽可能地消除了由JDK的缓冲区实现所导致的性能以及内存使用率的惩罚。这种优化发生在Netty的核心代码中, 因此不会被暴露出来,但是你应该知道它所带来的影响。

::: tip CompositeByteBuf API  

除了从ByteBuf继承的方法,CompositeByteBuf提供了大量的附加功能。请参考 Netty 的 Javadoc 以获得该 API 的完整列表。

:::

## 字节级操作

ByteBuf 提供了许多超出基本读、写操作的方法用于修改它的数据。在接下来的章节中, 我们将会讨论这些中最重要的部分。

### 随机访问索引

如同在普通的 Java 字节数组中一样,ByteBuf 的索引是从零开始的:第一个字节的索引是0,最后一个字节的索引总是 `capacity() - 1`。代码清单 5-6 表明,对存储机制的封装使得遍历 ByteBuf 的内容非常简单。

```java
ByteBuf buffer = ...; 
for (int i = 0; i < buffer.capacity(); i++) {     
	byte b = buffer.getByte(i);     
	System.out.println((char)b); 
}
```

需要注意的是,使用那些需要一个索引值参数的方法(的其中)之一来访问数据既不会改变readerIndex 也不会改变writerIndex。 如果有需要, 也可以通过调用readerIndex(index) 或者 writerIndex(index)来手动移动这两者。

### 顺序访问索引

虽然 ByteBuf 同时具有读索引和写索引,但是 JDK 的 ByteBuffer 却只有一个索引,这也就是为什么必须调用 flip()方法来在读模式和写模式之间进行切换的原因。图 5-3 展示了ByteBuf 是如何被它的两个索引划分成 3 个区域的。

![图 5-3  ByteBuf 的内部分段](/Netty实战_page_81_1.png)

### 可丢弃字节

在图 5-3 中标记为可丢弃字节的分段包含了已经被读过的字节。通过调用 `discardReadBytes()`方法, 可以丢弃它们并回收空间。 这个分段的初始大小为 0, 存储在 `readerIndex` 中, 会随着 read 操作的执行而增加(get*操作不会移动 readerIndex) 。

图 5-4 展示了图 5-3 中所展示的缓冲区上调用discardReadBytes()方法后的结果。可以看到,可丢弃字节分段中的空间已经变为可写的了。注意,在调用discardReadBytes()之后,对可写分段的内容并没有任何的保证[^2]。

![图 5-4  丢弃已读字节之后的 ByteBuf](/Netty实战_page_82_1.png)

<TableCaption :title="'图 5-4  丢弃已读字节之后的 ByteBuf'" />

虽然你可能会倾向于频繁地调用 `discardReadBytes()`方法以确保可写分段的最大化,但是请注意,这将<mark>极有可能会导致内存复制,</mark>因为可读字节(图中标记为 CONTENT 的部分)必须被移动到缓冲区的开始位置。我们建议<mark>只在有真正需要的时候才这样做</mark>,例如,当内存非常宝贵的时候。

### 可读字节

ByteBuf 的可读字节分段存储了实际数据。任何名称以 `read` 或者 `skip` 开头的操作都将检索或者跳过位于当前readerIndex 的数据,并且将它增加已读字节数。

`readBytes(ByteBuf dest);`方法会从readIndex到末尾的数据复制到dest中。

如果尝试在缓冲区的可读字节数已经耗尽时从中读取数据,那么将会引发一个 `IndexOutOfBoundsException`。

代码清单 5-7 展示了如何读取所有可以读的字节。

```java
ByteBuf buffer = ...; 
while (buffer.isReadable()) {
	System.out.println(buffer.readByte()); 
}
```

### 可写字节

可写字节分段是指一个拥有未定义内容的、写入就绪的内存区域。新分配的缓冲区的writerIndex 的默认值为 0。任何名称以 write 开头的操作都将从当前的 writerIndex 处开始写数据,并将它增加已经写入的字节数。

`writeBytes(ByteBuf dest);`尝试往目标中写入数据，会增加`writerIndex`。

### 索引管理

可以通过调用`markReaderIndex()`、`markWriterIndex()`、`resetWriterIndex()` 和 `resetReaderIndex()`来标记和重置 ByteBuf 的 readerIndex 和 writerIndex。这些和InputStream 上的调用类似,只是没有readlimit 参数来指定标记什么时候失效。也可以通过调用`readerIndex(int)`或者`writerIndex(int)`来将索引移动到指定位置。

可以通过调用 `clear()`方法来将 readerIndex 和 writerIndex 都设置为 0。注意,这并不会清除内存中的内容。调用 clear()比调用 `discardReadBytes()`轻量得多,因为它将只是重置索引而不会复制任何的内存。

### 查找操作

在ByteBuf中有多种可以用来确定指定值的索引的方法。 最简单的是使用indexOf()方法。较复杂的查找可以通过那些需要一个ByteBufProcessor[^3]作为参数的方法达成。 这个接口只定义了一个方法:  `boolean process(byte value)`

ByteBufProcessor针对一些常见的值定义了许多便利的方法。假设你的应用程序需要和所谓的包含有以NULL结尾的内容的Flash套接字[^4]集成。调用  `forEachByte(ByteBufProcessor.FIND_NUL)`。代码清单 5-9 展示了一个查找回车符(\r)的例子。

```java
ByteBuf buffer = ...; 
int index = buffer.forEachByte(ByteBufProcessor.FIND_CR);
```



### 派生缓冲区

派生缓冲区为 ByteBuf 提供了以专门的方式来呈现其内容的视图。这类视图是通过以下方法被创建的: 

*   duplicate();
*   slice();
*   slice(int, int);
*   Unpooled.unmodifiableBuffer(…);
*   order(ByteOrder);
*   readSlice(int)。

每个这些方法都将返回一个新的 ByteBuf 实例,它具有自己的读索引、写索引和标记索引。其内部存储和 JDK 的 ByteBuffer 一样也是共享的。这使得派生缓冲区的创建成本是很低廉的,但是这也意味着,<mark>如果你修改了它的内容,也同时修改了其对应的源实例</mark>,所以要小心。

::: info ByteBuf 复制  

如果需要一个现有缓冲区的真实副本,请使用`copy()`或者`copy(int, int)`方法。不同于派生缓冲区,由这个调用所返回的ByteBuf拥有独立的数据副本。

:::

### 读/写操作

正如我们所提到过的,有两种类别的读/写操作:

*   `get()`和 `set()`操作,从给定的索引开始,并且<mark>保持索引不变</mark>; 

*   `read()`和 `write()`操作,从给定的索引开始,并且<mark>会根据已经访问过的字节数对索引进行调整</mark>。

表 5-1 列举了最常用的 get()方法。完整列表请参考对应的 API 文档。

<TableCaption :title="'表 5-1  get()操作'" />

|        名    称        |                      描    述                      |
| :--------------------: | :------------------------------------------------: |
|    getBoolean(int)     |             返回给定索引处的Boolean值              |
|      getByte(int)      |                返回给定索引处的字节                |
|  getUnsignedByte(int)  |      将给定索引处的无符号字节值作为short返回       |
|     getMedium(int)     |         返回给定索引处的 24 位的中等int值          |
| getUnsignedMedium(int) |     返回给定索引处的无符号的 24 位的中等int值      |
|      getInt(int)       |               返回给定索引处的int值                |
|  getUnsignedInt(int)   |       将给定索引处的无符号int值作为long返回        |
|      getLong(int)      |               返回给定索引处的long值               |
|     getShort(int)      |              返回给定索引处的short值               |
| getUnsignedShort(int)  |       将给定索引处的无符号short值作为int返回       |
|   getBytes(int, ...)   | 将该缓冲区中从给定索引开始的数据传送到指定的目的地 |

大多数的这些操作都有一个对应的 set()方法。

### 更多的操作

表 5-5 列举了由 ByteBuf 提供的其他有用操作。

<TableCaption :title="'表 5-5  其他有用的操作'" />

| 名    称        | 描    述                                                     |
| --------------- | ------------------------------------------------------------ |
| isReadable()    | 如果至少有一个字节可供读取,则返回true                        |
| isWritable()    | 如果至少有一个字节可被写入,则返回true                        |
| readableBytes() | 返回可被读取的字节数                                         |
| writableBytes() | 返回可被写入的字节数                                         |
| capacity()      | 返回ByteBuf可容纳的字节数。在此之后,它会尝试再次扩展直 到达到maxCapacity() |
| maxCapacity()   | 返回ByteBuf可以容纳的最大字节数                              |
| hasArray()      | 如果ByteBuf由一个字节数组支撑,则返回true                     |
| array()         | 如果 ByteBuf由一个字节数组支撑则返回该数组;否则,它将抛出一个 UnsupportedOperationException异常 |

## ByteBufHolder 接口

我们经常发现,除了实际的数据负载之外,我们还需要存储各种属性值。HTTP 响应便是一个很好的例子,除了表示为字节的内容,还包括状态码、cookie 等。

为了处理这种常见的用例,Netty 提供了 ByteBufHolder。ByteBufHolder 也为 Netty 的高级特性提供了支持,如缓冲区池化,其中可以从池中借用ByteBuf,并且在需要时自动释放。

ByteBufHolder 只有几种用于访问底层数据和引用计数的方法。表 5-6 列出了它们(这里不包括它继承自 ReferenceCounted 的那些方法) 。

<TableCaption :title="'表 5-6  ByteBufHolder的操作'" />

| 名    称    | 描    述                                                     |
| ----------- | ------------------------------------------------------------ |
| content()   | 返回由这个ByteBufHolder所持有的ByteBuf                       |
| copy()      | 返回这个ByteBufHolder的一个深拷贝,包括一个其所包含的ByteBuf的非共享拷贝 |
| duplicate() | 返回这个ByteBufHolder的一个浅拷贝, 包括一个其所包含的ByteBuf的共享拷贝 |

## ByteBuf 分配

### 按需分配:ByteBufAllocator 接口

为了降低分配和释放内存的开销,Netty 通过 `interface ByteBufAllocator` 实现了(ByteBuf 的)池化,它可以用来分配我们所描述过的任意类型的 ByteBuf 实例。使用池化是特定于应用程序的决定,其并不会以任何方式改变 ByteBuf API(的语义) 。

表 5-7 列出了 ByteBufAllocator 提供的一些操作。

<TableCaption :title="'表 5-7  ByteBufAllocator的方法'" />

| 名    称                                                     | 描    述                                                     |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| buffer() <br/>buffer(int initialCapacity); <br/>buffer(int initialCapacity, int maxCapacity); | 返回一个基于堆或者直接内存存储的ByteBuf                      |
| heapBuffer()<br/>heapBuffer(int initialCapacity)<br/>heapBuffer(int initialCapacity, int maxCapacity) | 返回一个基于堆内存存储的ByteBuf                              |
| directBuffer()<br/>directBuffer(int initialCapacity)<br/>directBuffer(int initialCapacity, int maxCapacity) | 返回一个基于直接内存存储的ByteBuf                            |
| compositeBuffer()<br/>compositeBuffer(int maxNumComponents)<br/>compositeDirectBuffer()<br/>compositeDirectBuffer(int maxNumComponents);<br/>compositeHeapBuffer()<br/>compositeHeapBuffer(int maxNumComponents); | 返回一个可以通过添加最大到指定数目的基于堆的或者直接内存存储的缓冲区来扩展的CompositeByteBuf |
| ioBuffer()[^5]                                               | 返回一个用于套接字的 I/O 操作的ByteBuf                       |

可以通过 Channel(每个都可以有一个不同的 ByteBufAllocator 实例)或者绑定到ChannelHandler 的 ChannelHandlerContext 获取一个到 ByteBufAllocator 的引用。
代码清单 5-14 说明了这两种方法。

```
Channel channel = ...;
ByteBufAllocator allocator = channel.alloc();
.... 
ChannelHandlerContext ctx = ...;
ByteBufAllocator allocator2 = ctx.alloc();
...
```

Netty提供了两种ByteBufAllocator的实现:`PooledByteBufAllocator`和`UnpooledByteBufAllocator`。 <mark>前者池化了ByteBuf的实例以提高性能并最大限度地减少内存碎片</mark>。 此实现使用了一种称为jemalloc[^6] 的已被大量现代操作系统所采用的高效方法来分配内存。 后者的实现不池化ByteBuf实例,并且在每次它被调用时都会返回一个新的实例。

虽然Netty默认[^7]使用了`PooledByteBufAllocator`,但这可以很容易地通过`ChannelConfig` API或者在引导你的应用程序时指定一个不同的分配器来更改。 更多的细节可在第8 章中找到。

可能某些情况下,你未能获取一个到ByteBufAllocator 的引用。对于这种情况,Netty 提供了一个简单的称为 Unpooled 的工具类,它提供了静态的辅助方法来创建未池化的 ByteBuf 实例。表 5-8 列举了这些中最重要的方法。

### Unpooled 缓冲区

可能某些情况下,你未能获取一个到ByteBufAllocator 的引用。对于这种情况,Netty 提供了一个简单的称为 Unpooled 的工具类,它提供了静态的辅助方法来创建未池化的 ByteBuf 实例。表 5-8 列举了这些中最重要的方法。

<TableCaption :title="'表 5-8  Unpooled的方法'" />

| 名    称                                                     | 描    述                                |
| ------------------------------------------------------------ | --------------------------------------- |
| buffer()<br/>buffer(int initialCapacity)<br/>buffer(int initialCapacity, int maxCapacity) | 返回一个未池化的基于堆内存存储的ByteBuf |
| directBuffer()<br/>directBuffer(int initialCapacity)<br/>directBuffer(int initialCapacity, int maxCapacity) | 返回一个未池化的基于直接内存存储的      |
| ByteBuf wrappedBuffer()                                      | 返回一个包装了给定数据的ByteBuf         |
| copiedBuffer()                                               | 返回一个复制了给定数据的ByteBuf         |

Unpooled 类还使得 ByteBuf 同样可用于那些并不需要 Netty 的其他组件的非网络项目, 使得其能得益于高性能的可扩展的缓冲区 API。

### ByteBufUtil 类

ByteBufUtil 提供了用于操作 ByteBuf 的静态的辅助方法。因为这个 API 是通用的,并且和池化无关,所以这些方法已然在分配类的外部实现。 

这些静态方法中最有价值的可能就是 `hexdump()`方法,它以十六进制的表示形式打印ByteBuf 的内容。这在各种情况下都很有用,例如,出于调试的目的记录 ByteBuf 的内容。十六进制的表示通常会提供一个比字节值的直接表示形式更加有用的日志条目, 此外, 十六进制的版本还可以很容易地转换回实际的字节表示。

 另一个有用的方法是 `boolean equals(ByteBuf, ByteBuf),`它被用来判断两个 ByteBuf 实例的相等性。如果你实现自己的ByteBuf 子类,你可能会发现ByteBufUtil 的其他有用方法。

## 引用计数

<mark>*引用计数*是一种通过在某个对象所持有的资源不再被其他对象引用时释放该对象所持有的资源来优化内存使用和性能的技术</mark>。Netty 在第 4 版中为 ByteBuf 和 ByteBufHolder 引入了引用计数技术,它们都实现了 `interface ReferenceCounted`。 

引用计数背后的想法并不是特别的复杂;它主要涉及跟踪到某个特定对象的活动引用的数量。 一个 ReferenceCounted 实现的实例将通常以活动的引用计数为 1 作为开始。 只要引用计数大于 0, 就能保证对象不会被释放。 当活动引用的数量减少到 0 时,该实例就会被释放。注意, 虽然释放的确切语义可能是特定于实现的,但是至少已经释放的对象应该不可再用了。 

引用计数对于池化实现(如 PooledByteBufAllocator)来说是至关重要的,它降低了内存分配的开销。代码清单 5-15 和代码清单 5-16 展示了相关的示例。

::: code-group

```java [代码清单 5-15 引用计数]
Channel channel = ...;
ByteBufAllocator allocator = channel.alloc();
.... 
ByteBuf buffer = allocator.directBuffer();
assert buffer.refCnt() == 1;
...
```

```java [代码清单 5-16 释放引用计数的对象]
ByteBuf buffer = ...;
boolean released = buffer.release();
...
```

:::

试图访问一个已经被释放的引用计数的对象,将会导致一个 IllegalReferenceCountException。 

注意,一个特定的(ReferenceCounted 的实现)类,可以用它自己的独特方式来定义它的引用计数规则。例如,我们可以设想一个类,其 release()方法的实现总是将引用计数设为零,而不用关心它的当前值,从而一次性地使所有的活动引用都失效。

::: info 谁负责释放

一般来说,是由最后访问(引用计数)对象的那一方来负责将它释放。在第 6 章中, 我们将会解释这个概念和ChannelHandler以及ChannelPipeline的相关性。

::: 

[^1]: 也就是说用户直接或者间接使 `capacity(int)`或者 `ensureWritable(int)`方法来增加超过该最大容量时抛出异常。
[^2]:因为只是移动了可以读取的字节以及 writerIndex, 而没有对所有可写入的字节进行擦除写。
[^3]: 在 Netty 4.1.x 中,该类已经废弃,请使用 io.netty.util.ByteProcessor。
[^4]: 有关 Flash 套接字的讨论可参考 Flash ActionScript 3.0 Developer’s Guide 中 Networking and Communication 部分里的 Sockets 页面:http://help.adobe.com/en_US/as3/dev/WSb2ba3b1aad8a27b0-181c51321220efd9d1c-8000.html
[^5]: 默认地,当所运行的环境具有 sun.misc.Unsafe 支持时,返回基于直接内存存储的 ByteBuf,否则返回基于堆内存存储的 ByteBuf;当指定使用 PreferHeapByteBufAllocator 时,则只会返回基于堆内存存储的 ByteBuf。
[^6]: Jason Evans 的 “A Scalable Concurrent malloc(3) Implementation for FreeBSD” (2006) : http://people.freebsd.org/~jasone/jemalloc/bsdcan2006/jemalloc.pdf
[^7]: 这里指 Netty4.1.x,Netty4.0.x 默认使用的是 UnpooledByteBufAllocator

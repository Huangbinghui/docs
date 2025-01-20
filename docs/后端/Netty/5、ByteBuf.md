---
typora-copy-images-to: ../../public
typora-root-url: /Volumes/硬盘/Code/docs/docs/public
---

<script setup>
    import TableCaption from '../../../components/TableCaption.vue'
</script>



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

ByteBuf 维护了两个不同的索引: <u>一个用于读取, 一个用于写入</u>。 当你从 ByteBuf 读取时, 它的 readerIndex 将会被递增已经被读取的字节数。同样地,当你写入 ByteBuf 时,它的writerIndex 也会被递增。图 5-1 展示了一个空 ByteBuf 的布局结构和状态。

![Netty实战_page_77_1](/Netty实战_page_77_1.png)

<TableCaption :title="'图 5-1  一个读索引和写索引都设置为 0 的 16 字节 ByteBuf'"/>

要了解这些索引两两之间的关系, 请考虑一下, 如果打算读取字节直到 readerIndex 达到和 writerIndex 同样的值时会发生什么。在那时,你将会到达“可以读取的”数据的末尾。就如同试图读取超出数组末尾的数据一样, 试图读取超出该点的数据将会触发一个IndexOutOfBoundsException。

名称以 read 或者 write 开头的 ByteBuf 方法,将会推进其对应的索引,而名称以 set 或者 get 开头的操作则不会。后面的这些方法将在作为一个参数传入的一个相对索引上执行操作。

可以指定 ByteBuf 的最大容量。试图移动写索引(即 writerIndex)超过这个值将会触发一个异常[^1]。 (默认的限制是 Integer.MAX_VALUE。 )

### ByteBuf 的使用模式

在使用 Netty 时,你将遇到几种常见的围绕 ByteBuf 而构建的使用模式。在研究它们时,我们心里想着图 5-1 会有所裨益— 一个由不同的索引分别控制读访问和写访问的字节数组。

#### 1.堆缓冲区

最常用的 ByteBuf 模式是将数据存储在 JVM 的堆空间中。这种模式被称为**支撑数组**(backing array) ,<u>它能在没有使用池化的情况下提供快速的分配和释放</u>。这种方式,如代码清单5-1 所示,非常适合于有遗留的数据需要处理的情况。

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

ByteBuffer的Javadoc明确指出: “<u>直接缓冲区的内容将驻留在常规的会被垃圾回收的堆之外</u>。 ”这也就解释了为何直接缓冲区对于网络数据传输是理想的选择。如果你的数据包含在一个在堆上分配的缓冲区中,那么事实上,在通过套接字发送它之前,JVM将会在内部把你的缓冲区复制到一个直接缓冲区中。

<u>直接缓冲区的主要缺点是,相对于基于堆的缓冲区,它们的分配和释放都较为昂贵</u>。如果你正在处理遗留代码,你也可能会遇到另外一个缺点:<u>因为数据不是在堆上,所以你不得不进行一次复制</u>,如代码清单 5-2 所示。

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

<img src="/Netty实战_page_79_1.png" class="mx-auto" alt="Netty实战_page_79_1" style="zoom:33%;" />

<TableCaption :title="'图 5-2  持有一个头部和主体的 CompositeByteBuf'" />

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

<img src="/Netty实战_page_81_1.png" class="mx-auto" alt="Netty实战_page_81_1" style="zoom:25%;" />

<TableCaption :title="'图 5-3  ByteBuf 的内部分段'" />

### 可丢弃字节

### 可读字节

### 可写字节

### 索引管理

### 查找操作

### 派生缓冲区

### 读/写操作

### 更多的操作

## ByteBufHolder 接口

## ByteBuf 分配

## 引用计数

[^1]: 也就是说用户直接或者间接使 `capacity(int)`或者 `ensureWritable(int)`方法来增加超过该最大容量时抛出异常。

---
typora-copy-images-to: ../../public
typora-root-url: /Volumes/硬盘/Code/docs/docs/public
---



# `BeanPostProcessor`的功能

有时候，我们希望`Spring`容器在创建`bean`的过程中，能够使用我们自己定义的逻辑，对创建的`bean`做一些处理，或者执行一些业务。而实现方式有多种，比如自定义`bean`的初始化话方法等，而`BeanPostProcessor`接口也是用来实现类似的功能的。

  如果我们希望容器中创建的每一个`bean`，在创建的过程中可以执行一些自定义的逻辑，那么我们就可以编写一个类，并让他实现`BeanPostProcessor`接口，然后将这个类注册到一个容器中。容器在创建`bean`的过程中，会<mark>优先创建实现了`BeanPostProcessor`接口的`bean`</mark>，然后，<mark>在创建其他`bean`的时候，会将创建的每一个`bean`作为参数，调用`BeanPostProcessor`的方法</mark>。而`BeanPostProcessor`接口的方法，即是由我们自己实现的。下面就来具体介绍一下`BeanPostProcessor`的使用。

# `BeanPostProcessor`的使用

我们先看一看`BeanPostProcessor`接口的代码：

```java
public interface BeanPostProcessor {

	@Nullable
	default Object postProcessBeforeInitialization(Object bean, String beanName) throws BeansException {
		return bean;
	}
	 
	@Nullable
	default Object postProcessAfterInitialization(Object bean, String beanName) throws BeansException {
		return bean;
	}

}
```

可以看到，`BeanPostProcessor`接口只有两个抽象方法，由实现这个接口的类去实现（后面简称这两个方法为`before`和`after`），这两个方法有着相同的参数：

*   **bean**：容器正在创建的那个`bean`的引用；
*   **beanName**：容器正在创建的那个`bean`的名称；

那这两个方法何时执行呢？这就涉及到`Spring`中，`bean`的生命周期了。

![img](/1324014-20200511005853157-866375398.png)

上图中标红的两个地方就是`BeanPostProcessor`中两个方法的执行时机。`Spring`容器在创建`bean`时，如果容器中包含了`BeanPostProcessor`的实现类对象，那么就会执行这个类的这两个方法，并将当前正在创建的`bean`的引用以及名称作为参数传递进方法中。这也就是说，`BeanPostProcessor`的作用域是当前容器中的所有`bean`（不包括一些特殊的`bean`，这个后面说）。

  值得注意的是，我们可以在一个容器中注册多个不同的`BeanPostProcessor`的实现类对象，而`bean`在创建的过程中，将会轮流执行这些对象实现的`before`和`after`方法。那执行顺序如何确定呢？`Spring`提供了一个接口`Ordered`，我们可以让`BeanPostProcessor`的实现类实现这个`Ordered`接口，并实现接口的`getOrder`方法。这个方法的返回值是一个`int`类型，`Spring`容器会通过这个方法的返回值，对容器中的多个`BeanPostProcessor`对象进行从小到大排序，然后在创建`bean`时依次执行它们的方法。也就是说，`getOrder`方法返回值越小的`BeanPostProcessor`对象，它的方法将越先被执行。
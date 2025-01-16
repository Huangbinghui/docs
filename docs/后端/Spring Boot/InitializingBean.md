Spring在初始化和销毁 bean 前有3中方式提供回调：

*   第一种：通过@PostConstruct 和 @PreDestroy 方法注解 实现初始化后和销毁bean之前进行的操作
*   **第二种：通过bean实现InitializingBean和 DisposableBean接口**
*   第三种：通过 在xml中配置init-method 和 destory-method方法，或者 配置@Bean(initMethod = "initMethod", destroyMethod = "destroyMethod") 注解

执行顺序：@PostConstruct -> InitializingBean -> 配置initMethod -> @PreDestroy -> DisposableBean -> 配置destroyMethod
# CommandLineRunner 或 ApplicationRunner

CommandLineRunner和ApplicationRunner可以在Spring启动之后运行一些代码。

::: code-group

```java [CommandLineRunner]
@FunctionalInterface
public interface CommandLineRunner {

	/**
	 * Callback used to run the bean.
	 * @param args incoming main method arguments
	 * @throws Exception on error
	 */
	void run(String... args) throws Exception;

}
```

```java [ApplicationRunner]
@FunctionalInterface
public interface ApplicationRunner {

	/**
	 * Callback used to run the bean.
	 * @param args incoming application arguments
	 * @throws Exception on error
	 */
	void run(ApplicationArguments args) throws Exception;

}
```

:::

## 调用入口

`SpringApplication#run`方法



```java
public ConfigurableApplicationContext run(String... args) {
    long startTime = System.nanoTime();
    DefaultBootstrapContext bootstrapContext = createBootstrapContext();
    ConfigurableApplicationContext context = null;
    configureHeadlessProperty();
    SpringApplicationRunListeners listeners = getRunListeners(args);
    listeners.starting(bootstrapContext, this.mainApplicationClass);
    try {
        ...
        listeners.started(context, timeTakenToStartup);
        callRunners(context, applicationArguments); // [!code focus]
    }
    ...
    return context;
}

private void callRunners(ApplicationContext context, ApplicationArguments args) { // [!code focus:14]
    List<Object> runners = new ArrayList<>();
    runners.addAll(context.getBeansOfType(ApplicationRunner.class).values());
    runners.addAll(context.getBeansOfType(CommandLineRunner.class).values());
    AnnotationAwareOrderComparator.sort(runners);
    for (Object runner : new LinkedHashSet<>(runners)) {
        if (runner instanceof ApplicationRunner) {
            callRunner((ApplicationRunner) runner, args);
        }
        if (runner instanceof CommandLineRunner) {
            callRunner((CommandLineRunner) runner, args);
        }
    }
}
```

## 有何区别

`CommandLineRunner#run()`方法的参数是启动`SpringBoot`应用程序`main`方法的参数列表，而`ApplicationRunner#run()`方法的参数则是`ApplicationArguments`对象。

>   [!NOTE]
>
>   建议：如果你在项目启动时需要获取类似 "--xxx" 的启动参数值建议使用`ApplicationRunner`

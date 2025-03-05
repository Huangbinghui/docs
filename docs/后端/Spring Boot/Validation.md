---
typora-copy-images-to: ../../public
typora-root-url: /Volumes/硬盘/Code/docs/docs/public
---

# Spring Boot字段验证

## Maven依赖

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
</dependency>
```

## 使用方法

### 添加校验注解

在需要校验的字段加上注解可以对字段进行相应的交易，groups参数还可以对校验进行分组，使校验更加灵活。

```java [User.java]{10,12,14-15}
import javax.validation.constraints.Email;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;

@Data
@ToString
public class User {
    @NotBlank (message = "姓名不能为空！",groups = { Insert.class,Update.class })
    private String name;
    @NotNull(message = "年龄不能为空！", groups = { Delete.class })
    private Integer age;
    @NotBlank(message = "邮箱不能为空!", groups = { Insert.class })
    @Email(message = "邮箱格式不正确！", groups = { Insert.class })
    private String email;
}
```

### 注解验证

在方法形参中使用`@Validated`注解可以对参数进行校验，`@Validated`注解的value传入一个Class数组可以按分组进行校验。

```java [UserController.java] {18}
import org.huangbh.validatordemo.model.User;
import org.springframework.validation.BindingResult;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/user")
public class UserController {

    private UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @RequestMapping("/add")
    public User addUser(@Validated({Insert.class}) User user, BindingResult bindingResult) {
        return userService.addUser();
    }
}
```

### 手动验证



```java [UserService.java] {3,11-16}
@Service
public class UserService {
    private final ValidatorAdapter validator;
    public UserService(ValidatorAdapter validator) {
        this.validator = validator;
    }

    public User addUser() {
        User user = new User();
        user.setName("hbh");
        BindingResult bindingResult = new DirectFieldBindingResult(user, "user");
        validator.validate(user, bindingResult,{Insert.calss});
        if (bindingResult.hasErrors()) {
            System.out.println(bindingResult.getFieldErrors().stream()
                               .map(FieldError::getDefaultMessage).collect(Collectors.joining(",")));
        }
        return user;
    }
}
```

